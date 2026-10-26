"""
Schémas Pydantic pour l'API de Suivi Secours aux Décès sur Pension
"""

from typing import Optional, List
from datetime import date, datetime
from pydantic import BaseModel, Field, EmailStr
from models import StatutActivite, LienParente, StatutWorkflow, StatutPiece, UserRole


# --- Auth & User ---
class UserLogin(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    user_id: int
    nom_complet: str
    role: UserRole
    email: str


class UserRead(BaseModel):
    id: int
    email: str
    nom_complet: str
    role: UserRole
    is_active: bool

    class Config:
        from_attributes = True


# --- Défunt & Demandeur & Enfants ---
class AgentDefuntCreate(BaseModel):
    im: str = Field(..., description="Indice Matricule (IM)")
    nom: str
    prenoms: str
    statut_activite: StatutActivite = StatutActivite.ACTIVITE
    date_deces: date
    lieu_deces: Optional[str] = None
    ministere_institution: Optional[str] = None
    dernier_grade: Optional[str] = None
    corps_appartenance: Optional[str] = None
    numero_pension: Optional[str] = None


class AgentDefuntRead(AgentDefuntCreate):
    id: int

    class Config:
        from_attributes = True


class DemandeurCreate(BaseModel):
    nom: str
    prenoms: str
    lien_parente: LienParente
    cin: str
    date_delivrance_cin: Optional[date] = None
    lieu_delivrance_cin: Optional[str] = None
    adresse: Optional[str] = None
    telephone: Optional[str] = None
    compte_bancaire_tresor: Optional[str] = None
    ordonnance_tutelle_ref: Optional[str] = None


class DemandeurRead(DemandeurCreate):
    id: int

    class Config:
        from_attributes = True


class EnfantCreate(BaseModel):
    nom: str
    prenoms: str
    date_naissance: date
    est_mineur: bool = True
    est_handicape: bool = False
    certificat_medical_ref: Optional[str] = None
    numero_lit: int = 1


class EnfantRead(EnfantCreate):
    id: int

    class Config:
        from_attributes = True


# --- Pièces Justificatives ---
class PieceJustificativeRead(BaseModel):
    id: int
    code_piece: str
    intitule: str
    est_obligatoire: bool
    statut: StatutPiece
    fichier_url: Optional[str] = None
    date_depot: Optional[datetime] = None
    verifie_par: Optional[str] = None
    date_verification: Optional[datetime] = None
    remarque: Optional[str] = None

    class Config:
        from_attributes = True


class PieceStatusUpdate(BaseModel):
    statut: StatutPiece
    remarque: Optional[str] = None


# --- Dossier Secours ---
class DossierSecoursCreate(BaseModel):
    date_arrivee: date = Field(default_factory=date.today)
    defunt: AgentDefuntCreate
    demandeur: DemandeurCreate
    enfants: List[EnfantCreate] = []
    situation_complexe: Optional[str] = None  # DEUX_PARENTS_DECES, PLURALITE_LITS, DIVORCE
    montant_secours: float = 500000.0
    observations: Optional[str] = None


# 8 colonnes Excel export format
class DossierSecoursExcelRow(BaseModel):
    date_arrivee: Optional[str]
    nom_beneficiaire: str
    noms_defunt: str
    im: str
    date_envoi_cf: Optional[str]
    num_decision: Optional[str]
    date_mandatement: Optional[str]
    motif_rejet: Optional[str]


class DossierSecoursRead(BaseModel):
    id: int
    numero_dossier: str
    date_arrivee: date
    statut: StatutWorkflow
    situation_complexe: Optional[str] = None
    montant_secours: float
    observations: Optional[str] = None

    # Les 8 Colonnes Excel
    date_envoi_cf: Optional[date] = None
    num_decision: Optional[str] = None
    date_mandatement: Optional[date] = None
    motif_rejet: Optional[str] = None
    num_mandat: Optional[str] = None

    defunt: AgentDefuntRead
    demandeur: DemandeurRead
    enfants: List[EnfantRead] = []
    pieces: List[PieceJustificativeRead] = []

    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# --- Workflow Transitions (RBAC) ---
class EnvoiCFRequest(BaseModel):
    date_envoi_cf: date
    observations: Optional[str] = None


class DecisionCFRequest(BaseModel):
    decision: str = Field(..., description="'VALIDE' ou 'REJETE'")
    num_decision: Optional[str] = Field(None, description="Obligatoire si VALIDE")
    motif_rejet: Optional[str] = Field(None, description="Obligatoire si REJETE")


class MandatementRequest(BaseModel):
    date_mandatement: date
    num_mandat: str
    observations: Optional[str] = None


# --- Check-list dynamique endpoint request ---
class ChecklistGenerateRequest(BaseModel):
    statut_defunt: StatutActivite
    lien_demandeur: LienParente
    cas_complexes: List[str] = []
    enfants_handicapes: bool = False
    nb_enfants_mineurs: int = 0


# --- Audit Log ---
class AuditLogRead(BaseModel):
    id: int
    dossier_id: Optional[int] = None
    user_role: str
    user_email: str
    action: str
    details: Optional[str] = None
    ip_address: Optional[str] = None
    timestamp: datetime

    class Config:
        from_attributes = True


# --- Dashboard Stats ---
class StatsOverview(BaseModel):
    total_dossiers: int
    en_attente_pieces: int
    enquete_conforme: int
    transmis_cf: int
    valides_cf: int
    rejetes_cf: int
    mandates: int
    delai_moyen_traitement_jours: float
    taux_conformite_pieces: float
