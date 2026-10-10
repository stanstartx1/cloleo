# Firebase SMS Service for Phone Verification
import os
import random
from datetime import datetime, timezone, timedelta
from typing import Optional
from core.database import db

# Firebase Admin SDK
try:
    import firebase_admin
    from firebase_admin import credentials, auth
    FIREBASE_AVAILABLE = True
except ImportError:
    FIREBASE_AVAILABLE = False
    print("⚠️ Firebase Admin SDK non installé. Utilisez: pip install firebase-admin")


class FirebaseSMSService:
    """
    Service pour la vérification par téléphone via Firebase.
    
    NOTE: Firebase Phone Auth est conçu pour les applications côté client (Web, iOS, Android).
    Pour un backend Python pur, l'envoi de SMS nécessite un service tiers comme Twilio.
    
    Ce service utilise Firebase Admin SDK pour la gestion des utilisateurs et les credentials,
    mais l'envoi réel de SMS nécessite une intégration avec un service SMS tiers.
    """

    def __init__(self):
        self.code_expiry_minutes = int(os.environ.get("VERIFICATION_CODE_EXPIRY_MINUTES", "5"))
        self.max_attempts = int(os.environ.get("MAX_VERIFICATION_ATTEMPTS", "3"))
        self.resend_delay_seconds = int(os.environ.get("VERIFICATION_RESEND_DELAY_SECONDS", "60"))
        
        # Initialiser Firebase Admin SDK si disponible
        self.firebase_initialized = False
        if FIREBASE_AVAILABLE:
            self._initialize_firebase()
    
    def _initialize_firebase(self):
        """Initialise Firebase Admin SDK avec les credentials"""
        try:
            project_id = os.environ.get("FIREBASE_PROJECT_ID")
            credentials_path = os.environ.get("FIREBASE_CREDENTIALS_PATH")
            
            if not project_id:
                print("⚠️ FIREBASE_PROJECT_ID non défini dans les variables d'environnement")
                return
            
            if credentials_path and os.path.exists(credentials_path):
                cred = credentials.Certificate(credentials_path)
                firebase_admin.initialize_app(cred, {
                    'projectId': project_id
                })
                self.firebase_initialized = True
                print(f"✅ Firebase Admin SDK initialisé pour le projet: {project_id}")
            else:
                print(f"⚠️ Fichier credentials non trouvé: {credentials_path}")
        except Exception as e:
            print(f"❌ Erreur lors de l'initialisation Firebase: {e}")

    def generate_verification_code(self) -> str:
        """Génère un code de vérification à 6 chiffres"""
        return str(random.randint(100000, 999999))

    async def send_verification_code(self, phone_number: str) -> dict:
        """
        Envoie un code de vérification par SMS.
        
        NOTE: Pour l'envoi réel de SMS, vous devez intégrer un service comme Twilio.
        Ce code génère et stocke le code localement. En production, remplacez la section
        TODO avec votre intégration SMS (Twilio, AWS SNS, etc.)
        
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
        
        # TODO: Intégration SMS réelle (Twilio, AWS SNS, etc.)
        # Exemple avec Twilio:
        # from twilio.rest import Client
        # client = Client(os.environ.get("TWILIO_ACCOUNT_SID"), os.environ.get("TWILIO_AUTH_TOKEN"))
        # client.messages.create(
        #     body=f"Votre code de vérification Cloleo est : {code}. Valide 5 minutes.",
        #     from_=os.environ.get("TWILIO_PHONE_NUMBER"),
        #     to=normalized_phone
        # )
        
        # Pour le développement, afficher le code dans les logs
        print(f"📱 [SMS DEV] Code de vérification pour {normalized_phone}: {code}")
        print(f"📱 [SMS DEV] Code expire à: {expires_at}")
        
        return {
            "success": True,
            "message": f"Code de vérification envoyé à {normalized_phone}",
            "code": code if os.environ.get("ENVIRONMENT") == "development" else None,  # Code seulement en dev
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
