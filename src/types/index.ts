export type StatutActivite = 'ACTIVITE' | 'RETRAITE_PENSIONNE';

export type TypeAgentActivite = 'FONCTIONNAIRE' | 'EFA_ELD';

export type LienParente =
  | 'VEUF_VEUVE'
  | 'TUTEUR_ENFANT_MINEUR'
  | 'CELIBATAIRE_AVEC_MINEUR'
  | 'ENFANT_MAJEUR'
  | 'AUTRE_AYANT_DROIT';

export type StatutWorkflow =
  | 'RECEPTION_EN_COURS'
  | 'ENQUETE_CONFORME'
  | 'DOSSIER_INCOMPLET'
  | 'TRANSMIS_CF'     // Envoyé au Contrôle Financier
  | 'RETOUR_CF'       // Revenu du Contrôle Financier (observations/pièces demandées)
  | 'VALIDE_CF'       // Visé par le Contrôle Financier (prêt pour comptable)
  | 'ENGAGE'          // Engagé par le Comptable
  | 'MANDATE'         // Mandaté par le Comptable (prix mandaté saisi)
  | 'REJETE_CF'
  | 'EN_ATTENTE_MANDAT'
  | 'CLOTURE';

export type StatutPiece = 'NON_FOURNIE' | 'CONFORME' | 'NON_CONFORME';

export type WorkflowActionType =
  | 'ENVOI_CF'
  | 'RETOUR_CF'
  | 'VISA_CF'
  | 'DECISION_CF'
  | 'SAISIE_DECISION'
  | 'ENGAGEMENT'
  | 'MANDATEMENT';

export type UserRole = 'AGENT' | 'ADMIN';

export interface User {
  id: number;
  email: string;
  nomComplet: string;
  role: UserRole;
  poste: string;
  departement?: string;
  matricule?: string;
  telephone?: string;
  password?: string;
  lastLogin?: string;
  createdAt?: string;
  partageDossiers?: boolean;
}

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  title: string;
  message?: string;
}

export interface AgentDefunt {
  im: string; // Indice Matricule
  nom: string;
  prenoms: string;
  statutActivite: StatutActivite;
  typeAgentActivite?: TypeAgentActivite; // 'FONCTIONNAIRE' ou 'EFA_ELD'
  dateDeces: string; // YYYY-MM-DD
  lieuDeces?: string;
  ministereInstitution?: string;
  dernierGrade?: string;
  corpsAppartenance?: string;
  numeroPension?: string;
  salaireDeBase?: number; // Total rubrique ou salaire de base mensuel pour calcul automatique du secours
}

export interface CoDemandeur {
  id: string;
  nom: string;
  prenoms: string;
  lienParente: 'CONJOINT_DIVORCE' | 'CONJOINT_ACTUEL' | LienParente;
  cin: string;
  partPourcentage: number; // e.g. 50% or 100% or 0%
  partMontant: number;     // calculated in Ariary
  statutDemande?: 'PRESENT' | 'ABSENT_EN_ATTENTE'; // Absent = n'a pas encore fait sa demande
  dateDelivranceCin?: string;
  lieuDelivranceCin?: string;
  adresse?: string;
  telephone?: string;
}

export interface Demandeur {
  nom: string;
  prenoms: string;
  lienParente: LienParente;
  cin: string;
  dateDelivranceCin?: string;
  lieuDelivranceCin?: string;
  adresse?: string;
  telephone?: string;
}

export interface Enfant {
  id: string;
  nom: string;
  prenoms: string;
  dateNaissance: string;
  estMineur: boolean;
  estHandicape: boolean;
  certificatMedicalRef?: string;
  numeroLit: number;
}

export interface PieceJustificative {
  id: string;
  codePiece: string;
  intitule: string;
  categorie: string;
  estObligatoire: boolean;
  statut: StatutPiece;
  instruction?: string;
  remarque?: string;
  dateVerification?: string;
  verifiePar?: string;
}

export interface DossierSecours {
  id: string;
  numeroDossier: string;
  // Les 8 colonnes Excel réglementaires et Suivi CF / Comptable
  dateArrivee: string;
  dateEnvoiCf?: string;        // Date et heure d'envoi / renvoi au CF
  dateRetourCf?: string;       // Date et heure automatique de retour du CF
  motifRetourCf?: string;      // Motif ou observations du retour par le CF
  dateVisaCf?: string;         // Date et heure du visa accordé par le CF
  numVisaCf?: string;          // N° du Visa CF délivré par le Contrôle Financier
  numDecision?: string;        // N° de Décision d'octroi du secours (saisi par l'agent après le visa CF)
  dateDecision?: string;       // Date de la Décision
  dateEngagement?: string;     // Date et heure d'engagement par le comptable
  refEngagement?: string;      // Référence d'engagement comptable
  dateMandatement?: string;    // Date de mandatement
  numMandat?: string;          // N° Mandat Trésor
  montantMandat?: number;      // Prix / Montant mandaté saisi directement par le comptable
  motifRejet?: string;
  dateDelaiComplet?: string;

  // Données associées
  defunt: AgentDefunt;
  demandeur: Demandeur;
  coDemandeurs?: CoDemandeur[];
  enfants: Enfant[];
  pieces: PieceJustificative[];
  statut: StatutWorkflow;
  situationComplexe?: 'DEUX_PARENTS_DECES' | 'PLURALITE_LITS' | 'DIVORCE' | 'AUCUN';
  montantSecours: number;
  partPourcentage?: number; // Pourcentage exact (ex: 50% en cas de scission/partage)
  observations?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuditLogEntry {
  id: string;
  dossierId?: string;
  dossierNumero?: string;
  userRole: UserRole;
  userNom: string;
  userEmail: string;
  action: string;
  details: string;
  timestamp: string;
}

export interface ChecklistRuleSpec {
  codePiece: string;
  intitule: string;
  estObligatoire: boolean;
  categorie: string;
  instruction: string;
}
