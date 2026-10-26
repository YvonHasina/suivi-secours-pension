# Backend FastAPI — Suivi Secours aux Décès sur Pension

Système d'entreprise pour l'enquête, le contrôle des pièces justificatives et le workflow réglementaire (Agent -> Contrôle Financier -> Comptable / Mandatement).

## 1. Prérequis
- Python 3.10 ou supérieur
- Pip & venv

## 2. Installation & Démarrage rapide

```bash
# 1. Se positionner dans le dossier backend
cd backend

# 2. Créer l'environnement virtuel
python -m venv venv

# 3. Activer l'environnement virtuel
# Sur Linux / macOS :
source venv/bin/activate
# Sur Windows :
.\venv\Scripts\activate

# 4. Installer les dépendances
pip install -r requirements.txt

# 5. Démarrer le serveur FastAPI en mode développement
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

## 3. Documentation interactive des API
Une fois le serveur lancé, accédez à :
- **Swagger UI (Documentation interactive)** : `http://localhost:8000/docs`
- **ReDoc** : `http://localhost:8000/redoc`

## 4. Comptes pré-configurés (RBAC)

| Rôle | Email | Mot de passe | Droits et responsabilités |
|---|---|---|---|
| **AGENT** | `agent@tresor.mg` | `agent123` | Saisie réception, enquête et vérification pièce par pièce |
| **CONTROLEUR_CF** | `cf@tresor.mg` | `cf123` | Renseigne `date_envoi_cf`, `num_decision`, valide ou rejette avec `motif_rejet` |
| **COMPTABLE** | `comptable@tresor.mg` | `compta123` | Renseigne `date_mandatement`, `num_mandat` et valide le paiement |
| **ADMIN** | `admin@tresor.mg` | `admin123` | Supervision totale, configuration et journaux d'audit |

## 5. Export des 8 colonnes Excel
L'endpoint `GET /api/export/csv` télécharge le fichier CSV standard avec encodage UTF-8 BOM pour Excel comprenant :
1. `DATE ARRIVÉE`
2. `NOM BÉNÉFICIAIRE`
3. `NOMS DÉFUNT`
4. `IM`
5. `DATE ENVOI CF`
6. `N° DÉCISION`
7. `DATE MANDATEMENT`
8. `MOTIF REJET`
