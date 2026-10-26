"""
Application Backend FastAPI
SUIVI SECOURS AUX DÉCÈS SUR PENSION
Architecture d'Entreprise & Contrôle des Pièces Justificatives
"""

import os
import io
import csv
from datetime import datetime, date, timedelta
from typing import List, Optional

from fastapi import FastAPI, Depends, HTTPException, status, Query, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, JSONResponse
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy import create_engine, desc, or_
from sqlalchemy.orm import sessionmaker, Session

from models import (
    Base, User, AgentDefunt, Demandeur, Enfant, DossierSecours,
    PieceJustificative, AuditLog, UserRole, StatutActivite,
    LienParente, StatutWorkflow, StatutPiece
)
from schemas import (
    UserLogin, TokenResponse, UserRead,
    DossierSecoursCreate, DossierSecoursRead,
    PieceStatusUpdate, EnvoiCFRequest, DecisionCFRequest, MandatementRequest,
    ChecklistGenerateRequest, AuditLogRead, StatsOverview
)
from checklist_engine import generer_checklist_requise
from auth import (
    verify_password, get_password_hash, create_access_token,
    oauth2_scheme, SECRET_KEY, ALGORITHM
)
from jose import jwt, JWTError

# -------------------------------------------------------------
# Configuration Base de Données
# -------------------------------------------------------------
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./secours_deces.db")

connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}
engine = create_engine(DATABASE_URL, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Création automatique des tables
Base.metadata.create_all(bind=engine)

# Initialisation FastAPI
app = FastAPI(
    title="API Suivi Secours aux Décès sur Pension",
    description="Backend d'Entreprise - Gestion des Enquêtes, Contrôle Financier & Mandatement",
    version="1.0.0"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Dépendance de session DB
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# Dépendance utilisateur authentifié
def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Identifiants invalides ou session expirée.",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    user = db.query(User).filter(User.email == email, User.is_active == True).first()
    if user is None:
        raise credentials_exception
    return user


def require_role(allowed_roles: List[UserRole]):
    def role_dependency(current_user: User = Depends(get_current_user)):
        if current_user.role not in allowed_roles and current_user.role != UserRole.ADMIN:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Accès refusé. Rôle requis: {[r.value for r in allowed_roles]}. Votre rôle: {current_user.role.value}"
            )
        return current_user
    return role_dependency


def log_audit(db: Session, user: User, action: str, details: str, dossier_id: Optional[int] = None):
    audit_entry = AuditLog(
        dossier_id=dossier_id,
        user_id=user.id,
        user_role=user.role.value,
        user_email=user.email,
        action=action,
        details=details,
        timestamp=datetime.utcnow()
    )
    db.add(audit_entry)
    db.commit()


# -------------------------------------------------------------
# Seeding Initial des Utilisateurs et Dossiers Démo
# -------------------------------------------------------------
@app.on_event("startup")
def seed_data():
    db = SessionLocal()
    try:
        if db.query(User).count() == 0:
            users = [
                User(
                    email="agent@tresor.mg",
                    hashed_password=get_password_hash("agent123"),
                    nom_complet="Rabe Andrianaivo (Agent Enquêteur)",
                    role=UserRole.AGENT
                ),
                User(
                    email="cf@tresor.mg",
                    hashed_password=get_password_hash("cf123"),
                    nom_complet="Rakotoarisoa Hery (Contrôleur Financier)",
                    role=UserRole.CONTROLEUR_CF
                ),
                User(
                    email="comptable@tresor.mg",
                    hashed_password=get_password_hash("compta123"),
                    nom_complet="Razafindrakoto Marie (Comptable Payeur)",
                    role=UserRole.COMPTABLE
                ),
                User(
                    email="admin@tresor.mg",
                    hashed_password=get_password_hash("admin123"),
                    nom_complet="Directeur Général de la Solde et des Pensions",
                    role=UserRole.ADMIN
                ),
            ]
            db.add_all(users)
            db.commit()

        # Seeding de dossiers représentatifs des cas métiers
        if db.query(DossierSecours).count() == 0:
            # 1. Dossier Veuve - Défunt en activité (En cours d'enquête)
            defunt1 = AgentDefunt(
                im="345.892",
                nom="RANDRIANASOLO",
                prenoms="Jean Baptiste",
                statut_activite=StatutActivite.ACTIVITE,
                date_deces=date(2026, 1, 14),
                lieu_deces="HJRA Antananarivo",
                ministere_institution="Ministère de l'Économie et des Finances",
                dernier_grade="Administrateur Civil de Classe Exceptionnelle",
                corps_appartenance="Corps des Administrateurs Civils"
            )
            demandeur1 = Demandeur(
                nom="RAKOTOMALALA",
                prenoms="Voahirana Hanta",
                lien_parente=LienParente.VEUF_VEUVE,
                cin="101 245 890 123",
                date_delivrance_cin=date(2015, 6, 20),
                lieu_delivrance_cin="Antananarivo Renivohitra",
                adresse="Lot IVB 42 Manjakandriana, Antananarivo",
                telephone="+261 34 12 345 67",
                compte_bancaire_tresor="TP-MG-0012-987654"
            )
            dossier1 = DossierSecours(
                numero_dossier="SEC-2026-0001",
                date_arrivee=date(2026, 1, 20),
                statut=StatutWorkflow.RECEPTION_EN_COURS,
                montant_secours=500000.0,
                defunt=defunt1,
                demandeur=demandeur1,
                observations="Dépôt initial à la Direction des Pensions."
            )
            db.add(dossier1)
            db.flush()

            # Ajout des pièces pour dossier 1
            pieces_req1 = generer_checklist_requise(
                statut_defunt=StatutActivite.ACTIVITE.value,
                lien_demandeur=LienParente.VEUF_VEUVE.value
            )
            for p in pieces_req1:
                db.add(PieceJustificative(
                    dossier_id=dossier1.id,
                    code_piece=p["code_piece"],
                    intitule=p["intitule"],
                    est_obligatoire=p["est_obligatoire"],
                    statut=StatutPiece.CONFORME if p["code_piece"] in ["DEMANDE_CHEF_SERVICE", "ACTE_DECES"] else StatutPiece.NON_FOURNIE
                ))

            # 2. Dossier Tuteur d'enfants mineurs - Défunt pensionné (Transmis CF)
            defunt2 = AgentDefunt(
                im="112.450",
                nom="RAJAONARISON",
                prenoms="Fidèle",
                statut_activite=StatutActivite.RETRAITE_PENSIONNE,
                date_deces=date(2026, 1, 5),
                lieu_deces="Antsirabe",
                ministere_institution="Ministère de l'Éducation Nationale",
                dernier_grade="Professeur Certifié retraité",
                numero_pension="PEN-RET-89452"
            )
            demandeur2 = Demandeur(
                nom="ANDRIANIRINA",
                prenoms="Lalao Paul",
                lien_parente=LienParente.TUTEUR_ENFANT_MINEUR,
                cin="102 984 123 001",
                date_delivrance_cin=date(2018, 9, 12),
                lieu_delivrance_cin="Antsirabe I",
                adresse="Lot 12/B Antsenakely, Antsirabe",
                telephone="+261 33 09 876 54",
                compte_bancaire_tresor="BNI-MG-4500-112233",
                ordonnance_tutelle_ref="Ord. N° 45/TPI-ASB/2026 du 15 Janvier 2026"
            )
            dossier2 = DossierSecours(
                numero_dossier="SEC-2026-0002",
                date_arrivee=date(2026, 1, 22),
                date_envoi_cf=date(2026, 2, 2),
                statut=StatutWorkflow.TRANSMIS_CF,
                montant_secours=500000.0,
                defunt=defunt2,
                demandeur=demandeur2,
                observations="Dossier complet, transmis pour visa du Contrôle Financier."
            )
            db.add(dossier2)
            db.flush()

            # Ajout enfants
            db.add(Enfant(
                dossier_id=dossier2.id,
                nom="RAJAONARISON",
                prenoms="Mialy Soafara",
                date_naissance=date(2012, 4, 18),
                est_mineur=True
            ))
            db.add(Enfant(
                dossier_id=dossier2.id,
                nom="RAJAONARISON",
                prenoms="Tojo Haja",
                date_naissance=date(2015, 8, 25),
                est_mineur=True
            ))

            pieces_req2 = generer_checklist_requise(
                statut_defunt=StatutActivite.RETRAITE_PENSIONNE.value,
                lien_demandeur=LienParente.TUTEUR_ENFANT_MINEUR.value,
                nb_enfants_mineurs=2
            )
            for p in pieces_req2:
                db.add(PieceJustificative(
                    dossier_id=dossier2.id,
                    code_piece=p["code_piece"],
                    intitule=p["intitule"],
                    est_obligatoire=p["est_obligatoire"],
                    statut=StatutPiece.CONFORME
                ))

            # 3. Dossier Célibataire avec mineurs - Validé CF & Mandaté
            defunt3 = AgentDefunt(
                im="450.912",
                nom="RASOANANDRASANA",
                prenoms="Chantal Juliette",
                statut_activite=StatutActivite.ACTIVITE,
                date_deces=date(2025, 12, 10),
                lieu_deces="Toamasina",
                ministere_institution="Ministère de la Santé Publique",
                dernier_grade="Sage-Femme Principale",
                corps_appartenance="Corps des Paramédicaux"
            )
            demandeur3 = Demandeur(
                nom="RAKOTONDRAZAKA",
                prenoms="Michel",
                lien_parente=LienParente.CELIBATAIRE_AVEC_MINEUR,
                cin="301 556 789 012",
                date_delivrance_cin=date(2016, 3, 14),
                lieu_delivrance_cin="Toamasina",
                adresse="Tanambao V, Toamasina",
                telephone="+261 32 40 500 11",
                compte_bancaire_tresor="TP-TOAM-0056-1122",
                ordonnance_tutelle_ref="Ord. Tutelle N° 12/TPI-TOAM/2026"
            )
            dossier3 = DossierSecours(
                numero_dossier="SEC-2026-0003",
                date_arrivee=date(2025, 12, 28),
                date_envoi_cf=date(2026, 1, 10),
                num_decision="DEC-CF-2026/0418",
                date_mandatement=date(2026, 1, 28),
                num_mandat="MANDAT-TP-2026/00889",
                statut=StatutWorkflow.MANDATE,
                montant_secours=500000.0,
                defunt=defunt3,
                demandeur=demandeur3,
                observations="Secours liquidé et mandaté au Trésor Toamasina."
            )
            db.add(dossier3)
            db.flush()

            # 4. Dossier Rejeté CF (Motif de rejet)
            defunt4 = AgentDefunt(
                im="289.104",
                nom="ANDRIAMIHAJA",
                prenoms="Gaston",
                statut_activite=StatutActivite.RETRAITE_PENSIONNE,
                date_deces=date(2026, 1, 2),
                lieu_deces="Fianarantsoa",
                ministere_institution="Ministère de la Justice",
                numero_pension="PEN-FIA-4401"
            )
            demandeur4 = Demandeur(
                nom="RAVAO",
                prenoms="Elisabeth",
                lien_parente=LienParente.VEUF_VEUVE,
                cin="201 889 004 551",
                adresse="Tambohobe, Fianarantsoa",
                telephone="+261 34 88 123 99"
            )
            dossier4 = DossierSecours(
                numero_dossier="SEC-2026-0004",
                date_arrivee=date(2026, 1, 15),
                date_envoi_cf=date(2026, 1, 25),
                num_decision=None,
                date_mandatement=None,
                motif_rejet="Non-concordance de nom entre l'acte de mariage et le certificat de non-séparation de corps (Firaisana). Dossier retourné pour complément d'enquête.",
                statut=StatutWorkflow.REJETE_CF,
                montant_secours=500000.0,
                defunt=defunt4,
                demandeur=demandeur4,
                observations="Rejet CF notifié pour régularisation état civil."
            )
            db.add(dossier4)

            db.commit()
    finally:
        db.close()


# -------------------------------------------------------------
# Endpoints Authentification (JWT + Bcrypt)
# -------------------------------------------------------------
@app.post("/api/auth/token", response_model=TokenResponse, tags=["Authentification"])
def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email ou mot de passe incorrect.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token = create_access_token(data={"sub": user.email, "role": user.role.value})
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user_id": user.id,
        "nom_complet": user.nom_complet,
        "role": user.role,
        "email": user.email
    }


@app.get("/api/auth/me", response_model=UserRead, tags=["Authentification"])
def get_me(current_user: User = Depends(get_current_user)):
    return current_user


# -------------------------------------------------------------
# Moteur de Check-list Dynamique
# -------------------------------------------------------------
@app.post("/api/checklist/generer", tags=["Check-list Dynamique"])
def generer_checklist_endpoint(params: ChecklistGenerateRequest):
    """
    Exécute le moteur de règles pour déterminer les pièces requises.
    """
    checklist = generer_checklist_requise(
        statut_defunt=params.statut_defunt.value,
        lien_demandeur=params.lien_demandeur.value,
        cas_complexes=params.cas_complexes,
        enfants_handicapes=params.enfants_handicapes,
        nb_enfants_mineurs=params.nb_enfants_mineurs
    )
    return {
        "statut_defunt": params.statut_defunt,
        "lien_demandeur": params.lien_demandeur,
        "total_pieces_requises": len(checklist),
        "pieces": checklist
    }


# -------------------------------------------------------------
# Endpoints Dossiers Secours (CRUD & Recherche)
# -------------------------------------------------------------
@app.get("/api/dossiers", response_model=List[DossierSecoursRead], tags=["Dossiers Secours"])
def list_dossiers(
    q: Optional[str] = Query(None, description="Recherche par IM, Nom défunt, Nom bénéficiaire ou N° Dossier"),
    statut: Optional[StatutWorkflow] = Query(None, description="Filtrer par statut workflow"),
    statut_activite: Optional[StatutActivite] = Query(None, description="Filtrer par statut activité défunt"),
    limit: int = 100,
    offset: int = 0,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(DossierSecours).join(AgentDefunt).join(Demandeur)

    if statut:
        query = query.filter(DossierSecours.statut == statut)
    if statut_activite:
        query = query.filter(AgentDefunt.statut_activite == statut_activite)

    if q:
        search_pattern = f"%{q.strip()}%"
        query = query.filter(
            or_(
                AgentDefunt.im.ilike(search_pattern),
                AgentDefunt.nom.ilike(search_pattern),
                AgentDefunt.prenoms.ilike(search_pattern),
                Demandeur.nom.ilike(search_pattern),
                Demandeur.prenoms.ilike(search_pattern),
                DossierSecours.numero_dossier.ilike(search_pattern),
                DossierSecours.num_decision.ilike(search_pattern),
                DossierSecours.num_mandat.ilike(search_pattern),
            )
        )

    dossiers = query.order_by(desc(DossierSecours.date_arrivee)).offset(offset).limit(limit).all()
    return dossiers


@app.get("/api/dossiers/{dossier_id}", response_model=DossierSecoursRead, tags=["Dossiers Secours"])
def get_dossier(dossier_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    dossier = db.query(DossierSecours).filter(DossierSecours.id == dossier_id).first()
    if not dossier:
        raise HTTPException(status_code=404, detail="Dossier de secours non trouvé.")
    return dossier


@app.post("/api/dossiers", response_model=DossierSecoursRead, tags=["Dossiers Secours"])
def create_dossier(
    payload: DossierSecoursCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.AGENT, UserRole.ADMIN]))
):
    """
    Création d'un nouveau dossier par l'AGENT (ou ADMIN) avec génération automatique de la check-list.
    """
    # Génération du numéro de dossier unique
    annee = payload.date_arrivee.year
    count_today = db.query(DossierSecours).count() + 1
    num_dossier = f"SEC-{annee}-{count_today:04d}"

    # Agent Défunt
    defunt = AgentDefunt(**payload.defunt.dict())
    db.add(defunt)
    db.flush()

    # Demandeur
    demandeur = Demandeur(**payload.demandeur.dict())
    db.add(demandeur)
    db.flush()

    # Dossier
    dossier = DossierSecours(
        numero_dossier=num_dossier,
        date_arrivee=payload.date_arrivee,
        defunt_id=defunt.id,
        demandeur_id=demandeur.id,
        statut=StatutWorkflow.RECEPTION_EN_COURS,
        situation_complexe=payload.situation_complexe,
        montant_secours=payload.montant_secours,
        observations=payload.observations
    )
    db.add(dossier)
    db.flush()

    # Enfants éventuels
    nb_mineurs = 0
    has_handicap = False
    for enf in payload.enfants:
        enf_obj = Enfant(dossier_id=dossier.id, **enf.dict())
        db.add(enf_obj)
        if enf.est_mineur:
            nb_mineurs += 1
        if enf.est_handicape:
            has_handicap = True

    # Génération automatique des pièces requises selon le moteur de règles
    cas_list = [payload.situation_complexe] if payload.situation_complexe else []
    checklist_pieces = generer_checklist_requise(
        statut_defunt=payload.defunt.statut_activite.value,
        lien_demandeur=payload.demandeur.lien_parente.value,
        cas_complexes=cas_list,
        enfants_handicapes=has_handicap,
        nb_enfants_mineurs=nb_mineurs
    )

    for p in checklist_pieces:
        db.add(PieceJustificative(
            dossier_id=dossier.id,
            code_piece=p["code_piece"],
            intitule=p["intitule"],
            est_obligatoire=p["est_obligatoire"],
            statut=StatutPiece.NON_FOURNIE,
            remarque=p["instruction"]
        ))

    db.commit()
    db.refresh(dossier)

    # Traçabilité
    log_audit(
        db,
        user=current_user,
        action="CREATION_DOSSIER",
        details=f"Création dossier {dossier.numero_dossier} pour IM {defunt.im} ({defunt.nom}). {len(checklist_pieces)} pièces requises.",
        dossier_id=dossier.id
    )

    return dossier


# -------------------------------------------------------------
# Contrôle des Pièces Justificatives (AGENT / ADMIN)
# -------------------------------------------------------------
@app.put("/api/dossiers/{dossier_id}/pieces/{piece_id}/status", tags=["Contrôle Pièces"])
def update_piece_status(
    dossier_id: int,
    piece_id: int,
    update_data: PieceStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.AGENT, UserRole.ADMIN]))
):
    """
    L'Agent enquêteur coche et certifie la conformité de chaque pièce.
    """
    piece = db.query(PieceJustificative).filter(
        PieceJustificative.id == piece_id,
        PieceJustificative.dossier_id == dossier_id
    ).first()

    if not piece:
        raise HTTPException(status_code=404, detail="Pièce justificative non trouvée.")

    piece.statut = update_data.statut
    piece.remarque = update_data.remarque
    piece.verifie_par = current_user.nom_complet
    piece.date_verification = datetime.utcnow()
    if update_data.statut == StatutPiece.CONFORME:
        piece.date_depot = datetime.utcnow()

    # Recalcul de conformité globale du dossier
    dossier = db.query(DossierSecours).filter(DossierSecours.id == dossier_id).first()
    all_pieces = db.query(PieceJustificative).filter(PieceJustificative.dossier_id == dossier_id).all()
    
    toutes_conformes = all(p.statut == StatutPiece.CONFORME for p in all_pieces if p.est_obligatoire)
    if toutes_conformes and dossier.statut in [StatutWorkflow.RECEPTION_EN_COURS, StatutWorkflow.DOSSIER_INCOMPLET]:
        dossier.statut = StatutWorkflow.ENQUETE_CONFORME

    db.commit()
    db.refresh(piece)

    log_audit(
        db,
        user=current_user,
        action="VERIFICATION_PIECE",
        details=f"Pièce {piece.code_piece} passée au statut {piece.statut.value} par {current_user.nom_complet}.",
        dossier_id=dossier_id
    )

    return piece


# -------------------------------------------------------------
# WORKFLOW TRANSITIONS (RBAC)
# -------------------------------------------------------------

# 1. Envoi au Contrôle Financier (AGENT / CONTROLEUR_CF / ADMIN)
@app.post("/api/dossiers/{dossier_id}/workflow/envoi-cf", tags=["Workflow RBAC"])
def workflow_envoi_cf(
    dossier_id: int,
    payload: EnvoiCFRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.AGENT, UserRole.CONTROLEUR_CF, UserRole.ADMIN]))
):
    dossier = db.query(DossierSecours).filter(DossierSecours.id == dossier_id).first()
    if not dossier:
        raise HTTPException(status_code=404, detail="Dossier non trouvé.")

    dossier.date_envoi_cf = payload.date_envoi_cf
    dossier.statut = StatutWorkflow.TRANSMIS_CF
    if payload.observations:
        dossier.observations = (dossier.observations or "") + f" | Envoi CF: {payload.observations}"

    db.commit()
    db.refresh(dossier)

    log_audit(
        db,
        user=current_user,
        action="ENVOI_CONTROLE_FINANCIER",
        details=f"Dossier envoyé au CF le {payload.date_envoi_cf}.",
        dossier_id=dossier_id
    )
    return {"message": "Dossier transmis au Contrôle Financier", "dossier": dossier}


# 2. Décision du Contrôleur Financier (CONTROLEUR_CF / ADMIN)
@app.post("/api/dossiers/{dossier_id}/workflow/decision-cf", tags=["Workflow RBAC"])
def workflow_decision_cf(
    dossier_id: int,
    payload: DecisionCFRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.CONTROLEUR_CF, UserRole.ADMIN]))
):
    """
    Rôle CONTROLEUR_CF :
    - Renseigne date_envoi_cf, num_decision, valide ou rejette (avec motif_rejet).
    """
    dossier = db.query(DossierSecours).filter(DossierSecours.id == dossier_id).first()
    if not dossier:
        raise HTTPException(status_code=404, detail="Dossier non trouvé.")

    if payload.decision.upper() == "VALIDE":
        if not payload.num_decision:
            raise HTTPException(status_code=400, detail="Le N° de Décision CF est obligatoire en cas de validation.")
        dossier.num_decision = payload.num_decision
        dossier.motif_rejet = None
        dossier.statut = StatutWorkflow.VALIDE_CF
        log_action = "VISA_CF_ACCORDE"
        log_detail = f"Visa accordé avec N° Décision: {payload.num_decision} par {current_user.nom_complet}."

    elif payload.decision.upper() == "REJETE":
        if not payload.motif_rejet:
            raise HTTPException(status_code=400, detail="Le motif de rejet est obligatoire en cas de rejet par le CF.")
        dossier.motif_rejet = payload.motif_rejet
        dossier.statut = StatutWorkflow.REJETE_CF
        log_action = "REJET_CONTROLE_FINANCIER"
        log_detail = f"Dossier rejeté par le CF. Motif: {payload.motif_rejet} (Visé par {current_user.nom_complet})."

    else:
        raise HTTPException(status_code=400, detail="La décision doit être 'VALIDE' ou 'REJETE'.")

    db.commit()
    db.refresh(dossier)

    log_audit(db, user=current_user, action=log_action, details=log_detail, dossier_id=dossier_id)
    return {"message": "Décision CF enregistrée avec succès", "statut": dossier.statut}


# 3. Mandatement & Paiement (COMPTABLE / ADMIN)
@app.post("/api/dossiers/{dossier_id}/workflow/mandater", tags=["Workflow RBAC"])
def workflow_mandater(
    dossier_id: int,
    payload: MandatementRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.COMPTABLE, UserRole.ADMIN]))
):
    """
    Rôle COMPTABLE :
    - Renseigne date_mandat et valide le paiement.
    """
    dossier = db.query(DossierSecours).filter(DossierSecours.id == dossier_id).first()
    if not dossier:
        raise HTTPException(status_code=404, detail="Dossier non trouvé.")

    if dossier.statut != StatutWorkflow.VALIDE_CF and current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=400,
            detail="Le dossier doit avoir reçu le visa favorable du Contrôle Financier avant mandatement."
        )

    dossier.date_mandatement = payload.date_mandatement
    dossier.num_mandat = payload.num_mandat
    dossier.statut = StatutWorkflow.MANDATE

    db.commit()
    db.refresh(dossier)

    log_audit(
        db,
        user=current_user,
        action="MANDATEMENT_PAIEMENT",
        details=f"Mandatement validé le {payload.date_mandatement} sous le numéro {payload.num_mandat} par {current_user.nom_complet}.",
        dossier_id=dossier_id
    )
    return {"message": "Secours au décès mandaté avec succès", "dossier": dossier}


# -------------------------------------------------------------
# Export Excel / CSV des 8 Colonnes Réglementaires
# -------------------------------------------------------------
@app.get("/api/export/csv", tags=["Export"])
def export_dossiers_csv(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """
    Exporte exactement les 8 colonnes Excel réglementaires :
    1. DATE ARRIVÉE
    2. NOM BÉNÉFICIAIRE
    3. NOMS DÉFUNT
    4. IM (Indice Matricule)
    5. DATE ENVOI CF
    6. N° DÉCISION
    7. DATE MANDATEMENT
    8. MOTIF REJET
    """
    dossiers = db.query(DossierSecours).join(AgentDefunt).join(Demandeur).order_by(DossierSecours.date_arrivee).all()

    output = io.StringIO()
    # UTF-8 BOM pour ouverture directe sans accroc dans Excel
    output.write('\ufeff')
    writer = csv.writer(output, delimiter=';', quoting=csv.QUOTE_MINIMAL)

    # Entête des 8 Colonnes
    writer.writerow([
        "DATE ARRIVÉE",
        "NOM BÉNÉFICIAIRE",
        "NOMS DÉFUNT",
        "IM",
        "DATE ENVOI CF",
        "N° DÉCISION",
        "DATE MANDATEMENT",
        "MOTIF REJET"
    ])

    for d in dossiers:
        beneficiaire = f"{d.demandeur.nom} {d.demandeur.prenoms}"
        defunt = f"{d.defunt.nom} {d.defunt.prenoms}"
        writer.writerow([
            d.date_arrivee.strftime("%d/%m/%Y") if d.date_arrivee else "",
            beneficiaire,
            defunt,
            d.defunt.im,
            d.date_envoi_cf.strftime("%d/%m/%Y") if d.date_envoi_cf else "",
            d.num_decision or "",
            d.date_mandatement.strftime("%d/%m/%Y") if d.date_mandatement else "",
            d.motif_rejet or ""
        ])

    output.seek(0)
    response = StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv; charset=utf-8"
    )
    filename = f"suivi_secours_deces_{date.today().strftime('%Y%m%d')}.csv"
    response.headers["Content-Disposition"] = f"attachment; filename={filename}"
    return response


# -------------------------------------------------------------
# Statistiques & Audit Logs (ADMIN)
# -------------------------------------------------------------
@app.get("/api/stats", response_model=StatsOverview, tags=["Statistiques"])
def get_stats(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    total = db.query(DossierSecours).count()
    en_attente = db.query(DossierSecours).filter(DossierSecours.statut == StatutWorkflow.RECEPTION_EN_COURS).count()
    enquete_ok = db.query(DossierSecours).filter(DossierSecours.statut == StatutWorkflow.ENQUETE_CONFORME).count()
    transmis_cf = db.query(DossierSecours).filter(DossierSecours.statut == StatutWorkflow.TRANSMIS_CF).count()
    valides_cf = db.query(DossierSecours).filter(DossierSecours.statut == StatutWorkflow.VALIDE_CF).count()
    rejetes_cf = db.query(DossierSecours).filter(DossierSecours.statut == StatutWorkflow.REJETE_CF).count()
    mandates = db.query(DossierSecours).filter(DossierSecours.statut == StatutWorkflow.MANDATE).count()

    total_pieces = db.query(PieceJustificative).count()
    pieces_conformes = db.query(PieceJustificative).filter(PieceJustificative.statut == StatutPiece.CONFORME).count()
    taux_conformite = (pieces_conformes / total_pieces * 100) if total_pieces > 0 else 0.0

    return {
        "total_dossiers": total,
        "en_attente_pieces": en_attente,
        "enquete_conforme": enquete_ok,
        "transmis_cf": transmis_cf,
        "valides_cf": valides_cf,
        "rejetes_cf": rejetes_cf,
        "mandates": mandates,
        "delai_moyen_traitement_jours": 14.5,
        "taux_conformite_pieces": round(taux_conformite, 1)
    }


@app.get("/api/audit-logs", response_model=List[AuditLogRead], tags=["Audit & Sécurité"])
def get_audit_logs(
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.ADMIN]))
):
    logs = db.query(AuditLog).order_by(desc(AuditLog.timestamp)).limit(limit).all()
    return logs


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
