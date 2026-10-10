# Guide d'installation Firebase pour Cloleo

## 📋 Étapes d'installation sur le VPS

### 1. Installer Firebase Admin SDK

Connectez-vous en SSH sur votre VPS et exécutez :

```bash
cd /var/www/cloleo/backend
source venv/bin/activate
pip install firebase-admin
deactivate
```

### 2. Transférer le fichier de credentials

Sur votre machine locale, utilisez SCP pour transférer le fichier JSON :

```bash
scp /Users/bloowmoney/Downloads/cloleo-phone-verification-firebase-adminsdk-fbsvc-e016f96ea2.json root@vps120466:/var/www/cloleo/backend/firebase-credentials.json
```

Ou via votre client SFTP/FTP.

### 3. Définir les permissions correctes

Sur le VPS :

```bash
sudo chmod 600 /var/www/cloleo/backend/firebase-credentials.json
sudo chown root:root /var/www/cloleo/backend/firebase-credentials.json
```

### 4. Configurer les variables d'environnement

Sur le VPS, éditez le fichier `.env` du backend :

```bash
cd /var/www/cloleo/backend
nano .env
```

Ajoutez ces variables à la fin du fichier :

```bash
# Firebase Phone Verification
FIREBASE_PROJECT_ID=cloleo-phone-verification
FIREBASE_CREDENTIALS_PATH=/var/www/cloleo/backend/firebase-credentials.json

# Environment
ENVIRONMENT=production
```

Sauvegardez avec `Ctrl+O`, `Enter`, puis `Ctrl+X`.

### 5. Mettre à jour les dépendances

Sur le VPS :

```bash
cd /var/www/cloleo/backend
source venv/bin/activate
pip install -r requirements.txt
deactivate
```

### 6. Redémarrer le backend

```bash
sudo systemctl restart cloleo-backend
sudo systemctl status cloleo-backend
```

### 7. Vérifier les logs du backend

```bash
sudo journalctl -u cloleo-backend -n 50
```

Vous devriez voir : `✅ Firebase Admin SDK initialisé pour le projet: cloleo-phone-verification`

## ⚠️ Note importante sur l'envoi de SMS

Le système actuel génère des codes de vérification et les stocke dans MongoDB, mais **n'envoie pas encore de SMS réels**. 

Pour l'envoi réel de SMS, vous avez deux options :

### Option 1 : Twilio (Recommandé)

1. Créez un compte sur [Twilio](https://www.twilio.com/)
2. Obtenez un numéro de téléphone
3. Ajoutez ces variables dans `.env` :

```bash
TWILIO_ACCOUNT_SID=votre_account_sid
TWILIO_AUTH_TOKEN=votre_auth_token
TWILIO_PHONE_NUMBER=+1234567890
```

4. Installez le SDK Twilio :

```bash
pip install twilio
```

5. Je mettrai à jour le code pour utiliser Twilio

### Option 2 : Garder le système actuel (Développement)

Le système fonctionne actuellement en mode développement :
- Les codes sont générés et affichés dans les logs backend
- Utile pour les tests
- Non recommandé pour la production

## 🧪 Tester le système

Une fois Firebase configuré :

1. Allez sur https://cloleo.com
2. Cliquez sur **"Inscription"**
3. Sélectionnez **"Téléphone"**
4. Entrez votre numéro (+225...)
5. Regardez les logs backend pour voir le code :

```bash
sudo journalctl -u cloleo-backend -f
```

Vous verrez : `📱 [SMS DEV] Code de vérification pour +225...: XXXXXX`

## 📚 Documentation

- [Firebase Admin SDK Python](https://firebase.google.com/docs/admin/setup#python)
- [Twilio SMS Documentation](https://www.twilio.com/docs/sms)
- [Firebase Phone Auth](https://firebase.google.com/docs/auth/web/phone-auth)
