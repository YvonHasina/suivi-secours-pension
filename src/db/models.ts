import mongoose, { Schema, Document } from 'mongoose';

export interface IDossier extends Document {
  numeroDossier: string;
  dateArrivee?: string;
  dateEnvoiCf?: string;
  dateVisaCf?: string;
  dateRetourCf?: string;
  motifRetourCf?: string;
  numDecision?: string;
  dateEngagement?: string;
  refEngagement?: string;
  dateMandatement?: string;
  numMandat?: string;
  motifRejet?: string;
  statut: string;
  montantSecours: number;
  situationComplexe?: string;
  defunt: any;
  demandeur: any;
  enfants?: any[];
  pieces?: any[];
  observations?: string;
  createdAt?: string;
  updatedAt?: string;
}

const DossierSchema = new Schema(
  {
    _id: { type: String },
    id: { type: String },
    numeroDossier: { type: String, required: true, index: true },
    dateArrivee: { type: String },
    dateEnvoiCf: { type: String },
    dateVisaCf: { type: String },
    dateRetourCf: { type: String },
    motifRetourCf: { type: String },
    numDecision: { type: String },
    dateEngagement: { type: String },
    refEngagement: { type: String },
    dateMandatement: { type: String },
    numMandat: { type: String },
    motifRejet: { type: String },
    statut: { type: String, default: 'RECEPTION_EN_COURS', index: true },
    montantSecours: { type: Number, default: 500000 },
    situationComplexe: { type: String },
    defunt: { type: Schema.Types.Mixed },
    demandeur: { type: Schema.Types.Mixed },
    enfants: { type: [Schema.Types.Mixed], default: [] },
    pieces: { type: [Schema.Types.Mixed], default: [] },
    observations: { type: String },
    createdAt: { type: String },
    updatedAt: { type: String },
  },
  { _id: false, timestamps: true, strict: false }
);

const AuditLogSchema = new Schema(
  {
    _id: { type: String },
    id: { type: String },
    dossierId: { type: String, index: true },
    dossierNumero: { type: String },
    userRole: { type: String },
    userNom: { type: String },
    userEmail: { type: String },
    action: { type: String, required: true },
    details: { type: String },
    timestamp: { type: String, default: () => new Date().toISOString() },
  },
  { _id: false, timestamps: true, strict: false }
);

const UserSchema = new Schema(
  {
    _id: { type: String },
    id: { type: Number },
    email: { type: String, required: true, index: true },
    nomComplet: { type: String },
    role: { type: String },
    poste: { type: String },
    departement: { type: String },
    matricule: { type: String },
    telephone: { type: String },
    partageDossiers: { type: Boolean, default: true },
    createdAt: { type: String },
    lastLogin: { type: String },
  },
  { _id: false, timestamps: true, strict: false }
);

export const DossierModel: any =
  (mongoose.models.Dossier as any) || mongoose.model('Dossier', DossierSchema, 'dossiers');

export const AuditLogModel: any =
  (mongoose.models.AuditLog as any) || mongoose.model('AuditLog', AuditLogSchema, 'audit_logs');

export const UserModel: any =
  (mongoose.models.User as any) || mongoose.model('User', UserSchema, 'users');
