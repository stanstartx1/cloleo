# Cloléo Marketplace — développement local et déploiement

Guide pour travailler en local puis pousser sur GitHub ; le déploiement VPS est automatisé par GitHub Actions.

## Architecture

| Composant | Dossier | Production (VPS) |
|-----------|---------|------------------|
| API | `backend/` | systemd `cloleo-backend`, port 8000 |
| Interface | `frontend/` | build CRA → servi par Apache |
| Base | MongoDB | `MONGO_URL` / `DB_NAME` dans `backend/.env` |

Le dossier `frontend_deploy/` est une **copie / archive** du frontend : le CI/CD et Apache utilisent uniquement **`frontend/`**. Ne pas modifier `frontend_deploy/` pour le déploiement courant.

## Prérequis

- **Node.js** 18+ et npm
- **Python** 3.10+
- **MongoDB** local (`mongodb://localhost:27017`) ou cluster Atlas
- (Optionnel) Clé **Google Maps** pour cartes livraison / checkout

## 1. Cloner et branche

```bash
git clone https://github.com/stanstartx1/cloleo.git
cd cloleo
git checkout main
```

Le workflow `.github/workflows/deploy.yml` ne se déclenche que sur un **push vers `main`**.

## 2. Variables d'environnement

### Backend

```bash
cd backend
copy .env.example .env    # Windows
# cp .env.example .env    # Linux/macOS
```

Éditer `backend/.env` :

- `MONGO_URL` — obligatoire (sinon erreur au démarrage)
- `DB_NAME` — ex. `cloleo` (aligné avec `seed_products.py` et la doc produit)
- `JWT_SECRET` — chaîne secrète stable en dev
- `LOCAL_ADMIN_*` — identifiants admin local (voir `backend/routes/auth.py`)

### Frontend

```bash
cd ../frontend
copy .env.example .env
```

Éditer `frontend/.env` :

- `REACT_APP_BACKEND_URL=http://localhost:8000`
- `REACT_APP_GOOGLE_MAPS_API_KEY` — si vous testez les cartes

Redémarrer `npm start` après toute modification de `.env`.

## 3. Backend

```bash
cd backend
python -m venv venv

# Windows
venv\Scripts\activate

# Linux/macOS
# source venv/bin/activate

pip install -r requirements.txt
python server.py
```

API : [http://localhost:8000](http://localhost:8000) — santé : [http://localhost:8000/health](http://localhost:8000/health)

Alternative :

```bash
uvicorn server:app --reload --host 0.0.0.0 --port 8000
```

### Données de démo (optionnel)

```bash
python seed_products.py
```

### Smoke test (optionnel)

```bash
set BASE_URL=http://127.0.0.1:8000
python smoke_test.py
```

## 4. Frontend

```bash
cd frontend
npm install
npm start
```

Application : [http://localhost:3000](http://localhost:3000)

Build production (identique au VPS) :

```bash
npm run build
```

## 5. Comptes de test

Voir `memory/PRD.md` (admin, vendeur, livreur, revendeur). En local, l’admin peut aussi utiliser `LOCAL_ADMIN_EMAIL` / `LOCAL_ADMIN_PASSWORD` du `.env`.

## Déploiement (GitHub Actions → VPS)

Fichier : `.github/workflows/deploy.yml`

**Déclenchement :** push sur `main` ou exécution manuelle (*workflow_dispatch*).

**Sur le serveur** (`/var/www/cloleo`) le script :

1. `git pull origin main`
2. `pip install -r backend/requirements.txt` (venv serveur)
3. `npm ci` / `npm install` + `npm run build` dans `frontend/`
4. `systemctl restart cloleo-backend`
5. `systemctl reload apache2`

### Secrets GitHub (Settings → Secrets and variables → Actions)

| Secret | Rôle |
|--------|------|
| `SSH_HOST` | IP ou hostname du VPS |
| `SSH_USER` | Utilisateur SSH |
| `SSH_PRIVATE_KEY` | Clé privée SSH (contenu PEM) |

Les variables d’application (`MONGO_URL`, `JWT_SECRET`, clés Maps, etc.) restent dans **`backend/.env` et la config Apache sur le VPS** — elles ne passent pas par le workflow.

### Prérequis côté VPS (hors repo)

- Dépôt cloné dans `/var/www/cloleo`
- Service systemd `cloleo-backend` pointant vers le venv et `server.py` / uvicorn
- Apache configuré pour servir le build React de `frontend/build`
- Fichiers `.env` réels **uniquement sur le serveur**, jamais commités

## Dépannage rapide

| Problème | Piste |
|----------|--------|
| `MONGO_URL n'est pas défini` | Créer `backend/.env` depuis `.env.example` |
| Frontend sans données | Vérifier `REACT_APP_BACKEND_URL` et redémarrer `npm start` |
| CORS en local | Le backend autorise `*` — vérifier l’URL du backend |
| `.env.example` non versionné | Règles `!.env.example` dans `.gitignore` |

## Fichiers sensibles

- Ne jamais committer `.env`, clés API, `credentials.json`
- `backend/uploads/` est ignoré par git
