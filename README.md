# Cloléo Marketplace

Marketplace e-commerce (React + FastAPI + MongoDB) pour le marché africain : vendeurs, revendeurs, livreurs, chat temps réel, livraison avec cartes.

## Démarrage rapide

Documentation complète : **[docs/SETUP.md](docs/SETUP.md)**

```text
backend/.env   ← copier depuis backend/.env.example
frontend/.env  ← copier depuis frontend/.env.example

# Terminal 1
cd backend && python -m venv venv && venv\Scripts\activate
pip install -r requirements.txt && python server.py

# Terminal 2
cd frontend && npm install && npm start
```

- API : http://localhost:8000  
- App : http://localhost:3000  

## Déploiement

Push sur la branche **`main`** → workflow [Deploy to VPS](.github/workflows/deploy.yml) (SSH vers `/var/www/cloleo`).

Dépôt GitHub : https://github.com/stanstartx1/cloleo

## Structure

| Dossier | Description |
|---------|-------------|
| `backend/` | API FastAPI, MongoDB, uploads |
| `frontend/` | Application React (source du build prod) |
| `frontend_deploy/` | Copie historique — **non utilisée par le CI** |
| `memory/PRD.md` | Spécifications et historique des phases |
| `docs/SETUP.md` | Installation locale et secrets GitHub |

## Licence

Projet privé — usage selon accord du dépôt.
