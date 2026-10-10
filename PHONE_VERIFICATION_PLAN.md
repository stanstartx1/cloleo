# Plan Complet : Inscription par Numéro de Téléphone avec Vérification SMS/WhatsApp

## 📋 Vue d'ensemble

Implémentation d'un système d'inscription par numéro de téléphone avec vérification par SMS ou WhatsApp pour Cloleo.

## 🏗️ Architecture

```
Client → Frontend (React) → Backend (FastAPI) → SMS/WhatsApp Provider → Client
                                              ↓
                                          MongoDB
```

## 📊 Flux d'Inscription

1. **Demande d'inscription**
   - Client entre numéro de téléphone et mot de passe
   - Frontend valide le format du numéro
   - Backend génère un code de vérification (6 chiffres)
   - Backend envoie le code via SMS/WhatsApp
   - Backend stocke le code temporairement avec expiration

2. **Vérification du code**
   - Client entre le code reçu
   - Backend vérifie le code et l'expiration
   - Si valide : création du compte
   - Si invalide : retour d'erreur

3. **Création du compte**
   - Backend enregistre l'utilisateur en base de données
   - Backend génère un token JWT
   - Frontend connecte l'utilisateur

## 🔧 Backend Modifications

### 1. Nouveaux endpoints FastAPI

#### `POST /api/auth/send-verification-code`
```python
@api.post("/auth/send-verification-code")
async def send_verification_code(request: VerificationCodeRequest):
    """
    Envoie un code de vérification par SMS/WhatsApp
    """
    - Valider le numéro de téléphone
    - Générer un code à 6 chiffres
    - Stocker dans Redis/MongoDB avec expiration (5 minutes)
    - Envoyer via SMS/WhatsApp API
    - Limiter les tentatives (max 3 par heure)
```

#### `POST /api/auth/verify-phone-register`
```python
@api.post("/auth/verify-phone-register")
async def verify_phone_register(request: PhoneRegisterRequest):
    """
    Vérifie le code et crée le compte
    """
    - Vérifier le code et l'expiration
    - Créer l'utilisateur en base de données
    - Générer le token JWT
    - Retourner les infos utilisateur
```

#### `POST /api/auth/resend-verification-code`
```python
@api.post("/auth/resend-verification-code")
async def resend_verification_code(request: ResendCodeRequest):
    """
    Renvoie un nouveau code de vérification
    """
    - Régénérer un nouveau code
    - Mettre à jour l'expiration
    - Renvoyer via SMS/WhatsApp
```

### 2. Schéma de données MongoDB

#### Collection `users` - nouveaux champs
```javascript
{
  "phone_number": "string",        // Numéro de téléphone
  "phone_verified": boolean,       // Statut de vérification
  "phone_verified_at": datetime,   // Date de vérification
  "verification_code": string,      // Code temporaire (optionnel)
  "verification_expires_at": datetime, // Expiration du code
  "verification_attempts": number,  // Nombre de tentatives
  "last_verification_sent": datetime // Dernier envoi
}
```

#### Collection `verification_codes` (optionnel)
```javascript
{
  "phone_number": "string",
  "code": "string",
  "expires_at": datetime,
  "attempts": number,
  "created_at": datetime
}
```

### 3. Intégration SMS/WhatsApp

#### Option A : Twilio (SMS)
```python
# backend/services/twilio_service.py
import os
from twilio.rest import Client

class TwilioService:
    def __init__(self):
        self.client = Client(
            os.getenv('TWILIO_ACCOUNT_SID'),
            os.getenv('TWILIO_AUTH_TOKEN')
        )
        self.from_number = os.getenv('TWILIO_PHONE_NUMBER')
    
    async def send_verification_code(self, phone_number: str, code: str):
        message = f"Votre code de vérification Cloleo est : {code}. Valide 5 minutes."
        self.client.messages.create(
            body=message,
            from_=self.from_number,
            to=phone_number
        )
```

#### Option B : WhatsApp Business API
```python
# backend/services/whatsapp_service.py
import requests
import os

class WhatsAppService:
    def __init__(self):
        self.api_url = os.getenv('WHATSAPP_API_URL')
        self.phone_id = os.getenv('WHATSAPP_PHONE_ID')
        self.access_token = os.getenv('WHATSAPP_ACCESS_TOKEN')
    
    async def send_verification_code(self, phone_number: str, code: str):
        url = f"{self.api_url}/{self.phone_id}/messages"
        headers = {
            "Authorization": f"Bearer {self.access_token}",
            "Content-Type": "application/json"
        }
        data = {
            "messaging_product": "whatsapp",
            "to": phone_number,
            "type": "template",
            "template": {
                "name": "verification_code",
                "language": {"code": "fr"},
                "components": [{
                    "type": "body",
                    "parameters": [{
                        "type": "text",
                        "text": code
                    }]
                }]
            }
        }
        response = requests.post(url, json=data, headers=headers)
        return response.json()
```

#### Option C : Firebase Authentication (SMS)
```python
# backend/services/firebase_service.py
import firebase_admin
from firebase_admin import auth

class FirebaseService:
    def __init__(self):
        firebase_admin.initialize_app()
    
    async def send_verification_code(self, phone_number: str):
        # Utiliser Firebase Phone Auth
        session_info = auth.create_session_cookie(phone_number)
        return session_info
```

### 4. Variables d'environnement

#### Ajouter à `.env`
```bash
# SMS Service (Twilio)
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=+1234567890

# WhatsApp Business API
WHATSAPP_API_URL=https://graph.facebook.com/v18.0
WHATSAPP_PHONE_ID=your_phone_id
WHATSAPP_ACCESS_TOKEN=your_access_token

# Firebase (optionnel)
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_PRIVATE_KEY=your_private_key

# Vérification
VERIFICATION_CODE_EXPIRY_MINUTES=5
MAX_VERIFICATION_ATTEMPTS=3
VERIFICATION_RESEND_DELAY_SECONDS=60
```

## 🎨 Frontend Modifications

### 1. Nouveaux composants React

#### `PhoneRegisterForm.js`
```javascript
const PhoneRegisterForm = () => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [step, setStep] = useState(1); // 1: input phone, 2: verify code
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);

  const handleSendCode = async () => {
    // Envoyer le code de vérification
  };

  const handleVerifyCode = async () => {
    // Vérifier le code et créer le compte
  };

  const handleResendCode = async () => {
    // Renvoyer le code
  };

  return (
    // Formulaire d'inscription par téléphone
  );
};
```

#### `PhoneInput.js`
```javascript
const PhoneInput = ({ value, onChange }) => {
  // Input de numéro de téléphone avec validation
  // Format international (+225, +33, etc.)
};
```

#### `VerificationCodeInput.js`
```javascript
const VerificationCodeInput = ({ value, onChange, length = 6 }) => {
  // Input de code de vérification avec 6 cases
  // Auto-focus sur la case suivante
};
```

### 2. Hooks personnalisés

#### `usePhoneVerification.js`
```javascript
export const usePhoneVerification = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [countdown, setCountdown] = useState(0);

  const sendCode = async (phoneNumber) => {
    // Logique d'envoi de code
  };

  const verifyCode = async (phoneNumber, code, password) => {
    // Logique de vérification
  };

  const resendCode = async (phoneNumber) => {
    // Logique de renvoi
  };

  return { sendCode, verifyCode, resendCode, loading, error, countdown };
};
```

### 3. Routes React Router

#### Ajouter dans `App.js`
```javascript
<Route path="/inscription-telephone" element={<PhoneRegisterPage />} />
<Route path="/verification-telephone" element={<PhoneVerificationPage />} />
```

### 4. Pages

#### `PhoneRegisterPage.js`
```javascript
const PhoneRegisterPage = () => {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <PhoneRegisterForm />
    </div>
  );
};
```

## 🔐 Sécurité

### 1. Validation des numéros de téléphone
- Format international (+225, +33, etc.)
- Regex de validation
- Liste des pays supportés

### 2. Limitation des tentatives
- Max 3 codes par heure par numéro
- Max 5 tentatives de vérification par code
- Délai entre les renvois (60 secondes)

### 3. Expiration des codes
- Codes valides 5 minutes
- Nettoyage automatique des codes expirés
- Régénération après expiration

### 4. Protection contre les attaques
- Rate limiting par IP
- CAPTCHA optionnel
- Monitoring des tentatives suspectes

## 📱 Intégration dans l'auth existant

### 1. Modification de `backend/routes/auth.py`

#### Ajouter les nouveaux endpoints
```python
from pydantic import BaseModel
import secrets
from datetime import datetime, timedelta

class VerificationCodeRequest(BaseModel):
    phone_number: str

class PhoneRegisterRequest(BaseModel):
    phone_number: str
    verification_code: str
    password: str
    name: str
    email: Optional[str] = None

@api.post("/auth/send-verification-code")
async def send_verification_code(request: VerificationCodeRequest):
    # Implémentation
    pass

@api.post("/auth/verify-phone-register")
async def verify_phone_register(request: PhoneRegisterRequest):
    # Implémentation
    pass
```

### 2. Modification de `frontend/src/pages/InscriptionPage.js`

#### Ajouter l'option téléphone
```javascript
const [registerMethod, setRegisterMethod] = useState('email'); // 'email' or 'phone'

// Afficher le formulaire approprié selon la méthode
{registerMethod === 'email' ? <EmailRegisterForm /> : <PhoneRegisterForm />}
```

## 🧪 Tests

### 1. Tests Backend
```python
# tests/test_phone_verification.py
def test_send_verification_code():
    # Test d'envoi de code
    pass

def test_verify_code_valid():
    # Test de vérification valide
    pass

def test_verify_code_invalid():
    # Test de vérification invalide
    pass

def test_rate_limiting():
    # Test de limitation de tentatives
    pass
```

### 2. Tests Frontend
```javascript
// PhoneRegisterForm.test.js
describe('PhoneRegisterForm', () => {
  it('should send verification code', () => {
    // Test
  });

  it('should verify code and register', () => {
    // Test
  });
});
```

## 🚀 Déploiement

### 1. Configuration production
- Ajouter les variables d'environnement
- Configurer le provider SMS/WhatsApp
- Tester l'envoi de messages

### 2. Monitoring
- Logs des envois SMS/WhatsApp
- Taux de succès des vérifications
- Alertes en cas d'échec

### 3. Backup
- Sauvegarde des codes de vérification
- Logs des tentatives
- Statistiques d'utilisation

## 📊 Coûts estimés

### Option A : Twilio
- SMS : ~$0.05 par SMS
- 1000 inscriptions = ~$50/mois

### Option B : WhatsApp Business API
- Messages conversationnels : gratuits
- Messages marketing : payants
- Coût par message : ~$0.01-$0.05

### Option C : Firebase
- 10,000 SMS gratuits/mois
- Au-delà : ~$0.01 par SMS

## 🎯 Roadmap d'implémentation

### Phase 1 : Backend (1-2 jours)
1. ✅ Créer les endpoints API
2. ✅ Intégrer le service SMS/WhatsApp
3. ✅ Implémenter la logique de vérification
4. ✅ Ajouter les tests unitaires

### Phase 2 : Frontend (1-2 jours)
1. ✅ Créer les composants React
2. ✅ Implémenter les hooks personnalisés
3. ✅ Ajouter les routes
4. ✅ Intégrer avec l'auth existant

### Phase 3 : Tests (1 jour)
1. ✅ Tests d'intégration
2. ✅ Tests UX
3. ✅ Tests de sécurité
4. ✅ Tests de charge

### Phase 4 : Déploiement (1 jour)
1. ✅ Configuration production
2. ✅ Tests de production
3. ✅ Monitoring
4. ✅ Documentation

## 📝 Documentation utilisateur

### Guide d'inscription par téléphone
1. Choisir "S'inscrire par téléphone"
2. Entrer le numéro de téléphone
3. Créer un mot de passe
4. Recevoir le code par SMS/WhatsApp
5. Entrer le code de vérification
6. Compte créé avec succès

## 🔍 Améliorations futures

1. **Multi-facteur authentication (MFA)**
2. **Vérification biométrique**
3. **Code QR pour authentification rapide**
4. **Détection de fraude**
5. **Analytics des inscriptions**

## 📞 Support

En cas de problème :
- Vérifier les logs backend
- Vérifier la configuration SMS/WhatsApp
- Tester l'envoi de message manuellement
- Vérifier les crédits du provider

---

**Note** : Ce plan peut être adapté selon les besoins spécifiques de Cloleo et le provider SMS/WhatsApp choisi.
