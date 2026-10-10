# Firebase SMS Service for Phone Verification
import os
import random
from datetime import datetime, timezone, timedelta
from typing import Optional
from core.database import db


class FirebaseSMSService:
    """
    Service pour la vérification par téléphone via Firebase.
    Pour l'instant, cette classe génère et stocke les codes de vérification.
    L'intégration réelle avec Firebase sera faite une fois les credentials fournis.
    """

    def __init__(self):
        self.code_expiry_minutes = int(os.environ.get("VERIFICATION_CODE_EXPIRY_MINUTES", "5"))
        self.max_attempts = int(os.environ.get("MAX_VERIFICATION_ATTEMPTS", "3"))
        self.resend_delay_seconds = int(os.environ.get("VERIFICATION_RESEND_DELAY_SECONDS", "60"))

    def generate_verification_code(self) -> str:
        """Génère un code de vérification à 6 chiffres"""
        return str(random.randint(100000, 999999))

    async def send_verification_code(self, phone_number: str) -> dict:
        """
        Envoie un code de vérification par SMS via Firebase.
        Pour l'instant, génère et stocke le code localement.
        
        Args:
            phone_number: Numéro de téléphone au format international (+225...)
            
        Returns:
            dict: Résultat de l'envoi avec succès/échec
        """
        # Normaliser le numéro de téléphone
        normalized_phone = self._normalize_phone_number(phone_number)
        
        # Vérifier si on peut envoyer un nouveau code (rate limiting)
        can_send, message = await self._can_send_code(normalized_phone)
        if not can_send:
            return {"success": False, "message": message}
        
        # Générer le code
        code = self.generate_verification_code()
        expires_at = datetime.now(timezone.utc) + timedelta(minutes=self.code_expiry_minutes)
        
        # Stocker le code dans MongoDB
        await self._store_verification_code(normalized_phone, code, expires_at)
        
        # TODO: Intégration réelle avec Firebase SMS
        # Pour l'instant, on retourne le code dans le message de développement
        # En production, utiliser Firebase Admin SDK pour envoyer le SMS
        
        print(f"📱 [SMS DEV] Code de vérification pour {normalized_phone}: {code}")
        print(f"📱 [SMS DEV] Code expire à: {expires_at}")
        
        return {
            "success": True,
            "message": f"Code de vérification envoyé à {normalized_phone}",
            "code": code,  # À retirer en production
            "expires_in": self.code_expiry_minutes * 60
        }

    async def verify_code(self, phone_number: str, code: str) -> dict:
        """
        Vérifie si le code est correct et non expiré.
        
        Args:
            phone_number: Numéro de téléphone
            code: Code de vérification entré par l'utilisateur
            
        Returns:
            dict: Résultat de la vérification
        """
        normalized_phone = self._normalize_phone_number(phone_number)
        
        # Récupérer le code stocké
        verification_data = await db.verification_codes.find_one({
            "phone_number": normalized_phone
        })
        
        if not verification_data:
            return {"success": False, "message": "Aucun code envoyé pour ce numéro"}
        
        # Vérifier si le code a expiré
        expires_at = verification_data.get("expires_at")
        if expires_at and datetime.now(timezone.utc) > datetime.fromisoformat(expires_at):
            return {"success": False, "message": "Code expiré"}
        
        # Vérifier le nombre de tentatives
        attempts = verification_data.get("attempts", 0)
        if attempts >= self.max_attempts:
            return {"success": False, "message": "Trop de tentatives. Veuillez demander un nouveau code."}
        
        # Vérifier le code
        if verification_data.get("code") != code:
            # Incrémenter les tentatives
            await db.verification_codes.update_one(
                {"phone_number": normalized_phone},
                {"$inc": {"attempts": 1}}
            )
            return {"success": False, "message": "Code incorrect"}
        
        # Code correct - supprimer le code de vérification
        await db.verification_codes.delete_one({"phone_number": normalized_phone})
        
        return {"success": True, "message": "Code vérifié avec succès"}

    def _normalize_phone_number(self, phone_number: str) -> str:
        """
        Normalise le numéro de téléphone au format international.
        
        Args:
            phone_number: Numéro de téléphone
            
        Returns:
            str: Numéro normalisé
        """
        # Enlever les espaces et les caractères spéciaux
        phone = phone_number.replace(" ", "").replace("-", "").replace("(", "").replace(")", "")
        
        # Si le numéro ne commence pas par +, ajouter l'indicatif par défaut
        if not phone.startswith("+"):
            # Par défaut, utiliser +225 pour la Côte d'Ivoire
            if phone.startswith("0"):
                phone = "+225" + phone[1:]
            else:
                phone = "+225" + phone
        
        return phone

    async def _can_send_code(self, phone_number: str) -> tuple[bool, str]:
        """
        Vérifie si on peut envoyer un nouveau code (rate limiting).
        
        Args:
            phone_number: Numéro de téléphone
            
        Returns:
            tuple: (can_send, message)
        """
        verification_data = await db.verification_codes.find_one({
            "phone_number": phone_number
        })
        
        if not verification_data:
            return True, ""
        
        # Vérifier le délai entre les envois
        last_sent = verification_data.get("last_sent")
        if last_sent:
            last_sent_time = datetime.fromisoformat(last_sent)
            time_since_last = (datetime.now(timezone.utc) - last_sent_time).total_seconds()
            
            if time_since_last < self.resend_delay_seconds:
                remaining = int(self.resend_delay_seconds - time_since_last)
                return False, f"Veuillez attendre {remaining} secondes avant de renvoyer"
        
        return True, ""

    async def _store_verification_code(self, phone_number: str, code: str, expires_at: datetime):
        """
        Stocke le code de vérification dans MongoDB.
        
        Args:
            phone_number: Numéro de téléphone
            code: Code de vérification
            expires_at: Date d'expiration
        """
        await db.verification_codes.update_one(
            {"phone_number": phone_number},
            {
                "$set": {
                    "code": code,
                    "expires_at": expires_at.isoformat(),
                    "attempts": 0,
                    "last_sent": datetime.now(timezone.utc).isoformat(),
                    "created_at": datetime.now(timezone.utc).isoformat()
                }
            },
            upsert=True
        )


# Instance globale du service
firebase_sms_service = FirebaseSMSService()
