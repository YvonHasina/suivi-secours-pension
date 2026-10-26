"""
Système de Suivi des Secours aux Décès sur Pension
Modèles de Données SQLAlchemy
"""

from datetime import datetime, date
from enum import Enum
import enum
from sqlalchemy import (
    Column, Integer, String, Text, Date, DateTime, Boolean, 
    ForeignKey, Float, Enum as SQLEnum
)
from sqlalchemy.orm import declarative_base, relationship

Base = declarative_base()


class StatutActivite(str, enum.Enum):
    ACTIVITE = "ACTIVITE"
    RETRAITE_PENSIONNE = "RETRAITE_PENSIONNE"


class LienParente(str, enum.Enum):
    VEUF_VEUVE = "VEUF_VEUVE"
    TUTEUR_ENFANT_MINEUR = "TUTEUR_ENFANT_MINEUR"
    CELIBATAIRE_AVEC_MINEUR = "CELIBATAIRE_AVEC_MINEUR"
    ENFANT_MAJEUR = "ENFANT_MAJEUR"
    AUTRE_AYANT_DROIT = "AUTRE_AYANT_DROIT"


class StatutWorkflow(str, enum.Enum):
    RECEPTION_EN_COURS = "RECEPTION_EN_COURS"          # Agent reçoit, pièces en cours
    ENQUETE_CONFORME = "ENQUETE_CONFORME"              # Toutes les pièces sont conformes
    DOSSIER_INCOMPLET = "DOSSIER_INCOMPLET"            # Pièces manquantes ou non conformes
    TRANSMIS_CF = "TRANSMIS_CF"                        # Envoyé au Contrôle Financier
    VALIDE_CF = "VALIDE_CF"                            # Contrôleur CF a visé (N° Décision)
    REJETE_CF = "REJETE_CF"                            # Contrôleur CF a rejeté (Motif rejet)
    EN_ATTENTE_MANDAT = "EN_ATTENTE_MANDAT"            # Transmis au service comptable
    MANDATE = "MANDATE"                                # Comptable a mandaté le paiement
    CLOTURE = "CLOTURE"                                # Dossier finalisé et archivé


class StatutPiece(str, enum.Enum):
    NON_FOURNIE = "NON_FOURNIE"
    CONFORME = "CONFORME"
    NON_CONFORME = "NON_CONFORME"


class UserRole(str, enum.Enum):
    AGENT = "AGENT"                      # Saisie réception & enquête (cocher pièces)
    CONTROLEUR_CF = "CONTROLEUR_CF"      # Date envoi CF, N° Décision, Validation/Rejet
    COMPTABLE = "COMPTABLE"              # Date mandat, validation paiement
    ADMIN = "ADMIN"                      # Gestion totale et logs d'audit


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(120), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    nom_complet = Column(String(150), nullable=False)
    role = Column(SQLEnum(UserRole), default=UserRole.AGENT, nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    logs = relationship("AuditLog", back_populates="user")


class AgentDefunt(Base):
    __tablename__ = "agents_defunts"

    id = Column(Integer, primary_key=True, index=True)
    im = Column(String(50), unique=True, index=True, nullable=False)  # Indice Matricule
    nom = Column(String(120), nullable=False)
    prenoms = Column(String(150), nullable=False)
    statut_activite = Column(SQLEnum(StatutActivite), nullable=False, default=StatutActivite.ACTIVITE)
    date_deces = Column(Date, nullable=False)
    lieu_deces = Column(String(150), nullable=True)
    ministere_institution = Column(String(200), nullable=True)
    dernier_grade = Column(String(100), nullable=True)
    corps_appartenance = Column(String(100), nullable=True)
    numero_pension = Column(String(50), nullable=True)  # Si pensionné

    dossiers = relationship("DossierSecours", back_populates="defunt")


class Demandeur(Base):
    __tablename__ = "demandeurs"

    id = Column(Integer, primary_key=True, index=True)
    nom = Column(String(120), nullable=False)
    prenoms = Column(String(150), nullable=False)
    lien_parente = Column(SQLEnum(LienParente), nullable=False)
    cin = Column(String(30), nullable=False)  # Carte d'Identité Nationale
    date_delivrance_cin = Column(Date, nullable=True)
    lieu_delivrance_cin = Column(String(100), nullable=True)
    adresse = Column(String(255), nullable=True)
    telephone = Column(String(50), nullable=True)
    compte_bancaire_tresor = Column(String(80), nullable=True)
    ordonnance_tutelle_ref = Column(String(100), nullable=True)  # Réf ordonnance tribunal si tuteur

    dossiers = relationship("DossierSecours", back_populates="demandeur")


class Enfant(Base):
    __tablename__ = "enfants"

    id = Column(Integer, primary_key=True, index=True)
    dossier_id = Column(Integer, ForeignKey("dossiers_secours.id"), nullable=False)
    nom = Column(String(120), nullable=False)
    prenoms = Column(String(150), nullable=False)
    date_naissance = Column(Date, nullable=False)
    est_mineur = Column(Boolean, default=True)  # < 21 ans selon réglementation
    est_handicape = Column(Boolean, default=False)
    certificat_medical_ref = Column(String(100), nullable=True)  # Si enfant handicapé majeur
    numero_lit = Column(Integer, default=1)  # Pour pluralité de lits

    dossier = relationship("DossierSecours", back_populates="enfants")


class DossierSecours(Base):
    __tablename__ = "dossiers_secours"

    id = Column(Integer, primary_key=True, index=True)
    numero_dossier = Column(String(50), unique=True, index=True, nullable=False)
    
    # 8 Colonnes Excel obligatoires
    date_arrivee = Column(Date, nullable=False, default=date.today)
    defunt_id = Column(Integer, ForeignKey("agents_defunts.id"), nullable=False)
    demandeur_id = Column(Integer, ForeignKey("demandeurs.id"), nullable=False)
    date_envoi_cf = Column(Date, nullable=True)               # Contrôle Financier
    num_decision = Column(String(100), nullable=True)          # N° Décision (CF)
    date_mandatement = Column(Date, nullable=True)             # Comptabilité / Mandat
    motif_rejet = Column(Text, nullable=True)                  # Renseigné si rejet CF

    # Champs complémentaires de gestion
    num_mandat = Column(String(100), nullable=True)
    statut = Column(SQLEnum(StatutWorkflow), default=StatutWorkflow.RECEPTION_EN_COURS, nullable=False)
    situation_complexe = Column(String(100), nullable=True)    # "DEUX_PARENTS_DECES", "PLURALITE_LITS", "DIVORCE"
    montant_secours = Column(Float, default=500000.0)          # Montant réglementaire en Ariary
    observations = Column(Text, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relations
    defunt = relationship("AgentDefunt", back_populates="dossiers")
    demandeur = relationship("Demandeur", back_populates="dossiers")
    enfants = relationship("Enfant", back_populates="dossier", cascade="all, delete-orphan")
    pieces = relationship("PieceJustificative", back_populates="dossier", cascade="all, delete-orphan")
    audit_logs = relationship("AuditLog", back_populates="dossier", cascade="all, delete-orphan")


class PieceJustificative(Base):
    __tablename__ = "pieces_justificatives"

    id = Column(Integer, primary_key=True, index=True)
    dossier_id = Column(Integer, ForeignKey("dossiers_secours.id"), nullable=False)
    code_piece = Column(String(60), nullable=False)            # e.g., "ACTE_DECES", "ORDONNANCE_TUTELLE"
    intitule = Column(String(255), nullable=False)
    est_obligatoire = Column(Boolean, default=True)
    statut = Column(SQLEnum(StatutPiece), default=StatutPiece.NON_FOURNIE, nullable=False)
    fichier_url = Column(String(500), nullable=True)
    date_depot = Column(DateTime, nullable=True)
    verifie_par = Column(String(100), nullable=True)
    date_verification = Column(DateTime, nullable=True)
    remarque = Column(Text, nullable=True)

    dossier = relationship("DossierSecours", back_populates="pieces")


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    dossier_id = Column(Integer, ForeignKey("dossiers_secours.id"), nullable=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    user_role = Column(String(50), nullable=False)
    user_email = Column(String(120), nullable=False)
    action = Column(String(100), nullable=False)               # "CREATION", "ENQUETE_VALIDEE", "ENVOI_CF", "DECISION_CF", "MANDATEMENT"
    details = Column(Text, nullable=True)
    ip_address = Column(String(45), nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow)

    dossier = relationship("DossierSecours", back_populates="audit_logs")
    user = relationship("User", back_populates="logs")
