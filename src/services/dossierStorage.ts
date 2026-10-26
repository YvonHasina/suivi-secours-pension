import {
  DossierSecours,
  AuditLogEntry,
  User,
  UserRole,
  StatutPiece,
  StatutWorkflow,
  StatutActivite,
  TypeAgentActivite,
  AgentDefunt,
  PieceJustificative,
} from '../types';
import { createInitialDossiers, INITIAL_AUDIT_LOGS, INITIAL_USERS } from './initialData';
import { WorkflowValidationService } from './workflowValidation';

export function getSecoursMultiplier(defunt: { statutActivite: StatutActivite; typeAgentActivite?: TypeAgentActivite }): number {
  if (defunt.statutActivite === 'RETRAITE_PENSIONNE') return 3;
  if (defunt.typeAgentActivite === 'EFA_ELD') return 3;
  return 12; // Fonctionnaire en activité
}

export function computeTotalEntitlement(
  defunt: { statutActivite: StatutActivite; typeAgentActivite?: TypeAgentActivite; salaireDeBase?: number },
  fallbackMontant: number = 500000
): number {
  const baseSal = defunt.salaireDeBase || 0;
  if (baseSal > 0) {
    return baseSal * getSecoursMultiplier(defunt);
  }
  return fallbackMontant;
}

export function formatCurrentDateTime(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const mins = String(d.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day} à ${hours}:${mins}`;
}

const STORAGE_KEY_DOSSIERS = 'secours_deces_dossiers_v1';
const STORAGE_KEY_LOGS = 'secours_deces_audit_logs_v1';
const STORAGE_KEY_ACTIVE_USER = 'secours_deces_active_user_v1';

export class DossierStorageService {
  private static listeners: (() => void)[] = [];

  static subscribe(callback: () => void) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== callback);
    };
  }

  private static notify() {
    this.listeners.forEach((l) => l());
  }

  // --- Users et Roles ---
  static getActiveUser(): User {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_ACTIVE_USER);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && typeof parsed === 'object' && (parsed.role === 'AGENT' || parsed.role === 'ADMIN')) {
          return parsed;
        }
      }
    } catch {
      // ignore
    }
    return INITIAL_USERS[0]; // Default: AGENT
  }

  static setActiveRole(role: UserRole): User {
    const targetRole = role;
    const user = INITIAL_USERS.find((u) => u.role === targetRole) || {
      id: 1,
      email: 'agent@tresor.mg',
      nomComplet: 'Rabe Andrianaivo',
      role: targetRole,
      poste: targetRole === 'ADMIN' ? 'Administrateur / Suivi du circuit' : 'Agent Chargé d’Étude et Mandatement',
      departement: 'Direction',
    };
    localStorage.setItem(STORAGE_KEY_ACTIVE_USER, JSON.stringify(user));
    this.addAuditLog({
      userRole: user.role,
      userNom: user.nomComplet,
      userEmail: user.email,
      action: 'CHANGEMENT_ROLE_ACTIF',
      details: `Session basculée sur le profil ${user.role} (${user.poste}).`,
    });
    this.notify();
    return user;
  }

  private static initializedSync = false;

  private static initSync() {
    if (this.initializedSync || typeof window === 'undefined') return;
    this.initializedSync = true;

    window.addEventListener('storage', (e) => {
      if (e.key === STORAGE_KEY_DOSSIERS || e.key === STORAGE_KEY_LOGS) {
        this.notify();
      }
    });

    try {
      const channel = new BroadcastChannel('secours_deces_multi_device_sync');
      channel.onmessage = () => {
        this.notify();
      };
      (this as any)._broadcastChannel = channel;
    } catch {
      // ignore
    }
  }

  // --- Dossiers (Aucun calcul imposé, conservation stricte des saisies manuelles) ---
  static recalculateSharedDefuntAmounts(dossiers: DossierSecours[]): DossierSecours[] {
    for (const d of dossiers) {
      // Supprimer la pièce RIB bancaire / trésor des dossiers existants
      if (d.pieces && d.pieces.length > 0) {
        d.pieces = d.pieces.filter(
          (p) =>
            p.codePiece !== 'RIB_BANCAIRE_OU_TRESOR' &&
            !p.intitule.includes('Relevé d’Identité Bancaire') &&
            !p.intitule.includes("Releve d'Identite Bancaire")
        );
      }

      // Corriger toute incohérence de semence antérieure où un dossier engagé/mandaté avait une pièce non conforme
      if (d.id === 'dos-5' && (d.statut === 'ENGAGE' || d.statut === 'MANDATE')) {
        const pieceManquante = (d.pieces || []).find((p) => p.codePiece === 'ACTE_DECES_SECOND_PARENT');
        if (pieceManquante && pieceManquante.statut !== 'CONFORME') {
          pieceManquante.statut = 'CONFORME';
          pieceManquante.verifiePar = 'Rabe Andrianaivo (Agent)';
          pieceManquante.dateVerification = '2026-02-06T14:00:00Z';
        }
      }
    }
    return dossiers;
  }

  static getDossiers(): DossierSecours[] {
    this.initSync();
    const activeUser = this.getActiveUser();
    if (activeUser && activeUser.role !== 'ADMIN' && activeUser.partageDossiers === false) {
      return [];
    }
    try {
      const data = localStorage.getItem(STORAGE_KEY_DOSSIERS);
      if (data) {
        const parsed = JSON.parse(data);
        return this.recalculateSharedDefuntAmounts(parsed);
      }
    } catch {
      // ignore
    }
    const initial = createInitialDossiers();
    const normalized = this.recalculateSharedDefuntAmounts(initial);
    this.saveDossiers(normalized);
    return normalized;
  }

  static saveDossiers(dossiers: DossierSecours[]) {
    this.initSync();
    const normalized = this.recalculateSharedDefuntAmounts(dossiers);
    localStorage.setItem(STORAGE_KEY_DOSSIERS, JSON.stringify(normalized));
    try {
      const channel = (this as any)._broadcastChannel as BroadcastChannel;
      if (channel) channel.postMessage('sync');
    } catch {
      // ignore
    }

    // Synchronisation en arrière-plan avec MongoDB / API backend
    if (typeof window !== 'undefined' && window.fetch) {
      fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dossiers: normalized }),
      }).catch(() => {
        // Mode hors-ligne ou fallback gracieux
      });
    }

    this.notify();
  }

  static getDossierById(id: string): DossierSecours | undefined {
    return this.getDossiers().find((d) => d.id === id);
  }

  static addDossier(newDossier: DossierSecours) {
    const list = this.getDossiers();
    const updated = [newDossier, ...list];
    this.saveDossiers(updated);

    const activeUser = this.getActiveUser();
    this.addAuditLog({
      dossierId: newDossier.id,
      dossierNumero: newDossier.numeroDossier,
      userRole: activeUser.role,
      userNom: activeUser.nomComplet,
      userEmail: activeUser.email,
      action: 'CREATION_DOSSIER',
      details: `Nouveau dossier ${newDossier.numeroDossier} créé pour l'agent défunt IM: ${newDossier.defunt.im} (${newDossier.defunt.nom} ${newDossier.defunt.prenoms}).`,
    });
  }

  static updateDossier(updatedDossier: DossierSecours) {
    const list = this.getDossiers();
    const idx = list.findIndex((d) => d.id === updatedDossier.id);
    if (idx !== -1) {
      list[idx] = {
        ...updatedDossier,
        updatedAt: new Date().toISOString(),
      };
      this.saveDossiers(list);
    }
  }

  static modifyDossier(updatedDossier: DossierSecours, summaryNote?: string): DossierSecours {
    const list = this.getDossiers();
    const idx = list.findIndex((d) => d.id === updatedDossier.id);
    const stampedDossier: DossierSecours = {
      ...updatedDossier,
      updatedAt: new Date().toISOString(),
    };

    if (idx !== -1) {
      list[idx] = stampedDossier;
      this.saveDossiers(list);
    } else {
      list.unshift(stampedDossier);
      this.saveDossiers(list);
    }

    const activeUser = this.getActiveUser();
    this.addAuditLog({
      dossierId: stampedDossier.id,
      dossierNumero: stampedDossier.numeroDossier,
      userRole: activeUser.role,
      userNom: activeUser.nomComplet,
      userEmail: activeUser.email,
      action: 'MODIFICATION_DOSSIER',
      details: summaryNote
        ? `Modification du dossier ${stampedDossier.numeroDossier} : ${summaryNote}`
        : `Mise à jour des informations administratives du dossier ${stampedDossier.numeroDossier} (IM: ${stampedDossier.defunt.im}).`,
    });

    return stampedDossier;
  }

  static setDossierDeadline(dossierId: string, dateDelai: string) {
    const list = this.getDossiers();
    const idx = list.findIndex((d) => d.id === dossierId);
    if (idx !== -1) {
      list[idx] = {
        ...list[idx],
        dateDelaiComplet: dateDelai,
        updatedAt: new Date().toISOString(),
      };
      this.saveDossiers(list);

      const activeUser = this.getActiveUser();
      this.addAuditLog({
        dossierId: list[idx].id,
        dossierNumero: list[idx].numeroDossier,
        userRole: activeUser.role,
        userNom: activeUser.nomComplet,
        userEmail: activeUser.email,
        action: 'FIXATION_DELAI_COMPLET',
        details: `Définition du délai limite de régularisation au ${dateDelai} pour le dossier ${list[idx].numeroDossier}.`,
      });
    }
  }

  static rejectDossierByDeadline(dossierId: string, motifRejet: string) {
    const list = this.getDossiers();
    const idx = list.findIndex((d) => d.id === dossierId);
    if (idx !== -1) {
      list[idx] = {
        ...list[idx],
        statut: 'REJETE_CF',
        motifRejet: motifRejet,
        updatedAt: new Date().toISOString(),
      };
      this.saveDossiers(list);

      const activeUser = this.getActiveUser();
      this.addAuditLog({
        dossierId: list[idx].id,
        dossierNumero: list[idx].numeroDossier,
        userRole: activeUser.role,
        userNom: activeUser.nomComplet,
        userEmail: activeUser.email,
        action: 'REJET_POUR_DELAI_DEPASSE',
        details: `Dossier ${list[idx].numeroDossier} rejeté pour délai de régularisation dépassé. Motif : ${motifRejet}`,
      });
    }
  }

  static deleteDossier(dossierId: string, motif?: string): boolean {
    const activeUser = this.getActiveUser();
    if (activeUser.role !== 'ADMIN' && activeUser.role !== 'AGENT') {
      throw new Error("Action non autorisée : Seuls l'Administrateur et l'Agent instructeur peuvent supprimer un dossier.");
    }
    const list = this.getDossiers();
    const dossier = list.find((d) => d.id === dossierId);
    if (!dossier) return false;

    const filtered = list.filter((d) => d.id !== dossierId);
    this.saveDossiers(filtered);

    this.addAuditLog({
      dossierId: dossier.id,
      dossierNumero: dossier.numeroDossier,
      userRole: activeUser.role,
      userNom: activeUser.nomComplet,
      userEmail: activeUser.email,
      action: 'SUPPRESSION_DOSSIER',
      details: `Suppression définitive du dossier ${dossier.numeroDossier} (Défunt IM ${dossier.defunt.im} - ${dossier.defunt.nom}, Ayant droit ${dossier.demandeur.nom}). Motif: ${motif || 'Suppression manuelle autorisée'}.`,
    });

    return true;
  }

  // --- Pièces justificatives ---
  static updatePieceStatus(
    dossierId: string,
    pieceId: string,
    newStatut: StatutPiece,
    remarque?: string
  ) {
    const list = this.getDossiers();
    const dossier = list.find((d) => d.id === dossierId);
    if (!dossier) return false;

    const activeUser = this.getActiveUser();
    const aEteVise =
      !!dossier.numVisaCf ||
      !!dossier.numDecision ||
      !!dossier.dateVisaCf ||
      dossier.statut === 'VALIDE_CF' ||
      dossier.statut === 'ENGAGE';

    if (dossier.statut === 'MANDATE' && activeUser.role !== 'ADMIN') {
      console.warn('Action refusée : le dossier est déjà mandaté et archivé.');
      return false;
    }

    const piece = dossier.pieces.find((p) => p.id === pieceId);
    if (!piece) return false;

    piece.statut = newStatut;
    piece.remarque = remarque ?? piece.remarque;
    piece.verifiePar = `${activeUser.nomComplet} (${activeUser.role})`;
    piece.dateVerification = new Date().toISOString();

    // Recalculer l'état global du dossier
    const obligatoires = dossier.pieces.filter((p) => p.estObligatoire);
    const toutesConformes = obligatoires.every((p) => p.statut === 'CONFORME');
    const hasNonConforme = obligatoires.some((p) => p.statut === 'NON_CONFORME');

    if (toutesConformes && (dossier.statut === 'RECEPTION_EN_COURS' || dossier.statut === 'DOSSIER_INCOMPLET')) {
      dossier.statut = 'ENQUETE_CONFORME';
    } else if (hasNonConforme && dossier.statut === 'RECEPTION_EN_COURS') {
      dossier.statut = 'DOSSIER_INCOMPLET';
    }

    this.saveDossiers(list);

    this.addAuditLog({
      dossierId: dossier.id,
      dossierNumero: dossier.numeroDossier,
      userRole: activeUser.role,
      userNom: activeUser.nomComplet,
      userEmail: activeUser.email,
      action: 'CONTROLE_PIECE',
      details: `Pièce "${piece.intitule}" marquée comme [${newStatut}]${remarque ? ' Note: ' + remarque : ''}.`,
    });
  }

  static addCustomPiece(
    dossierId: string,
    pieceData: { intitule: string; categorie: string; instruction?: string }
  ): boolean {
    const list = this.getDossiers();
    const dossier = list.find((d) => d.id === dossierId);
    if (!dossier) return false;

    const activeUser = this.getActiveUser();
    if (dossier.statut === 'MANDATE' && activeUser.role !== 'ADMIN') {
      return false;
    }

    const newPiece: PieceJustificative = {
      id: `custom-p-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      codePiece: `CUSTOM_${pieceData.intitule.toUpperCase().replace(/[^A-Z0-9]/g, '_')}`,
      intitule: pieceData.intitule,
      categorie: pieceData.categorie || 'ADMINISTRATIF',
      estObligatoire: true, // Rendu obligatoire comme demandé
      statut: 'NON_FOURNIE',
      instruction: pieceData.instruction || 'Pièce justificative additionnelle requise par l’agent instructeur.',
      verifiePar: `${activeUser.nomComplet} (${activeUser.role})`,
      dateVerification: new Date().toISOString(),
    };

    if (!dossier.pieces) {
      dossier.pieces = [];
    }
    dossier.pieces.push(newPiece);

    dossier.statut = 'DOSSIER_INCOMPLET';

    this.saveDossiers(list);

    this.addAuditLog({
      dossierId: dossier.id,
      dossierNumero: dossier.numeroDossier,
      userRole: activeUser.role,
      userNom: activeUser.nomComplet,
      userEmail: activeUser.email,
      action: 'AJOUT_PIECE_OBLIGATOIRE',
      details: `Ajout d'une nouvelle pièce obligatoire : "${pieceData.intitule}" (${pieceData.categorie}).`,
    });

    return true;
  }

  // --- Workflow Actions pour le Suivi Simplifié ---

  /**
   * Action Agent 1 : Envoyer ou renvoyer le dossier au Contrôle Financier
   * Enregistre automatiquement la date et l'heure d'envoi.
   */
  static marquerTransmisCf(
    dossierId: string,
    dateEnvoi?: string,
    note?: string
  ): { success: boolean; error?: string } {
    const dossier = this.getDossierById(dossierId);
    if (!dossier) return { success: false, error: 'Dossier introuvable.' };

    const activeUser = this.getActiveUser();
    const dateHeureEnvoi = dateEnvoi && dateEnvoi.trim() ? dateEnvoi : formatCurrentDateTime();

    dossier.dateEnvoiCf = dateHeureEnvoi;
    dossier.statut = 'TRANSMIS_CF';
    // Réinitialiser les observations de rejet si c'est un renvoi
    dossier.motifRetourCf = undefined;
    dossier.motifRejet = undefined;

    // Règle formelle : le numéro de visa et le numéro de décision ne changent pas lors d'un renvoi au CF
    const visaPreserve = dossier.numVisaCf;
    const decisionPreservee = dossier.numDecision;

    if (note && note.trim()) {
      dossier.observations = (dossier.observations ? dossier.observations + ' | ' : '') + `Envoi CF (${dateHeureEnvoi}): ${note.trim()}`;
    }
    dossier.updatedAt = new Date().toISOString();
    this.updateDossier(dossier);

    const detailPreservation = visaPreserve || decisionPreservee
      ? ` (N° Visa CF : ${visaPreserve || '—'} et N° Décision : ${decisionPreservee || '—'} strictement inchangés)`
      : '';

    this.addAuditLog({
      dossierId: dossier.id,
      dossierNumero: dossier.numeroDossier,
      userRole: activeUser.role,
      userNom: activeUser.nomComplet,
      userEmail: activeUser.email,
      action: 'TRANSMISSION_CF',
      details: `Dossier envoyé au Contrôle Financier le ${dateHeureEnvoi} par l'agent ${activeUser.nomComplet}.${detailPreservation}`,
    });

    return { success: true };
  }

  /**
   * Action Agent 2 : Marquer le retour du dossier depuis le CF (observations ou pièces réclamées)
   * Enregistre automatiquement la date et l'heure de retour.
   */
  static marquerRetourCf(
    dossierId: string,
    params: {
      motif: string;
      dateRetour?: string;
    }
  ): { success: boolean; error?: string } {
    const dossier = this.getDossierById(dossierId);
    if (!dossier) return { success: false, error: 'Dossier introuvable.' };

    if (!params.motif || !params.motif.trim()) {
      return { success: false, error: 'Veuillez préciser le motif ou les remarques du retour du CF.' };
    }

    const activeUser = this.getActiveUser();
    const dateHeureRetour = params.dateRetour && params.dateRetour.trim() ? params.dateRetour : formatCurrentDateTime();

    dossier.dateRetourCf = dateHeureRetour;
    dossier.motifRetourCf = params.motif.trim();
    dossier.motifRejet = params.motif.trim();
    dossier.statut = 'RETOUR_CF';
    dossier.updatedAt = new Date().toISOString();
    this.updateDossier(dossier);

    this.addAuditLog({
      dossierId: dossier.id,
      dossierNumero: dossier.numeroDossier,
      userRole: activeUser.role,
      userNom: activeUser.nomComplet,
      userEmail: activeUser.email,
      action: 'RETOUR_CF',
      details: `Retour du dossier depuis le CF enregistré le ${dateHeureRetour}. Motif : ${params.motif.trim()}`,
    });

    return { success: true };
  }

  /**
   * Action Agent 3 : Notifier que le dossier a été visé par le Contrôle Financier
   * Enregistre automatiquement la date et heure du visa et le N° de décision.
   * Le dossier devient alors directement disponible pour le Comptable !
   */
  /**
   * Action Agent 3 : Notifier le Visa accordé par le Contrôle Financier
   * Saisie du N° de Visa CF (ex: VISA-CF-2026/0418) et date/heure du visa.
   * L'agent saisira ensuite le N° de décision administrative.
   */
  static marquerVisaCf(
    dossierId: string,
    params: {
      numVisaCf?: string;
      numDecision?: string;
      dateVisa?: string;
      note?: string;
    }
  ): { success: boolean; error?: string } {
    const dossier = this.getDossierById(dossierId);
    if (!dossier) return { success: false, error: 'Dossier introuvable.' };

    const activeUser = this.getActiveUser();
    const dateHeureVisa = params.dateVisa && params.dateVisa.trim() ? params.dateVisa : formatCurrentDateTime();
    const visaNum = params.numVisaCf && params.numVisaCf.trim()
      ? params.numVisaCf.trim()
      : (params.numDecision && params.numDecision.trim() ? params.numDecision.trim() : `VISA-CF-${new Date().getFullYear()}/${Math.floor(1000 + Math.random() * 9000)}`);

    dossier.dateVisaCf = dateHeureVisa;
    dossier.numVisaCf = visaNum;
    if (params.numDecision && params.numDecision.trim()) {
      dossier.numDecision = params.numDecision.trim();
    }
    dossier.statut = 'VALIDE_CF';
    dossier.motifRetourCf = undefined;
    dossier.motifRejet = undefined;

    if (params.note && params.note.trim()) {
      dossier.observations = (dossier.observations ? dossier.observations + ' | ' : '') + `Visa CF (${visaNum}): ${params.note.trim()}`;
    }
    dossier.updatedAt = new Date().toISOString();
    this.updateDossier(dossier);

    this.addAuditLog({
      dossierId: dossier.id,
      dossierNumero: dossier.numeroDossier,
      userRole: activeUser.role,
      userNom: activeUser.nomComplet,
      userEmail: activeUser.email,
      action: 'VISA_CF_ACCORDE',
      details: `Dossier visé par le Contrôle Financier (Visa CF N° ${visaNum}) enregistré par ${activeUser.nomComplet} le ${dateHeureVisa}. Dossier transmis au comptable.`,
    });

    return { success: true };
  }

  /**
   * Action Agent 3 bis : Enregistrer la Décision après le Visa CF
   * Le numéro de décision et le visa CF sont distincts.
   * L'agent saisit ce champ après obtention du visa CF.
   */
  static enregistrerDecision(
    dossierId: string,
    params: {
      numDecision: string;
      dateDecision?: string;
      note?: string;
    }
  ): { success: boolean; error?: string } {
    const dossier = this.getDossierById(dossierId);
    if (!dossier) return { success: false, error: 'Dossier introuvable.' };

    const activeUser = this.getActiveUser();
    const decisionNum = params.numDecision.trim();
    if (!decisionNum) {
      return { success: false, error: 'Le N° de décision est obligatoire.' };
    }

    dossier.numDecision = decisionNum;
    if (params.dateDecision && params.dateDecision.trim()) {
      dossier.dateDecision = params.dateDecision.trim();
    } else if (!dossier.dateDecision) {
      dossier.dateDecision = new Date().toISOString().slice(0, 10);
    }

    if (params.note && params.note.trim()) {
      dossier.observations = (dossier.observations ? dossier.observations + ' | ' : '') + `Décision (${decisionNum}): ${params.note.trim()}`;
    }
    dossier.updatedAt = new Date().toISOString();
    this.updateDossier(dossier);

    this.addAuditLog({
      dossierId: dossier.id,
      dossierNumero: dossier.numeroDossier,
      userRole: activeUser.role,
      userNom: activeUser.nomComplet,
      userEmail: activeUser.email,
      action: 'SAISIE_DECISION',
      details: `N° de Décision ${decisionNum} établi et enregistré par l'agent ${activeUser.nomComplet} suite au visa CF (${dossier.numVisaCf || 'Visé'}).`,
    });

    return { success: true };
  }

  /**
   * Action Comptable 1 : Engager le dossier
   * Saisie de la référence d'engagement et date d'engagement.
   */
  static marquerEngagement(
    dossierId: string,
    params: {
      refEngagement: string;
      dateEngagement?: string;
      note?: string;
    }
  ): { success: boolean; error?: string } {
    const dossier = this.getDossierById(dossierId);
    if (!dossier) return { success: false, error: 'Dossier introuvable.' };

    // Règle stricte : L'engagement n'aura pas lieu si le dossier n'est pas visé par le CF
    const aEteVise =
      !!dossier.numVisaCf ||
      !!dossier.numDecision ||
      !!dossier.dateVisaCf ||
      dossier.statut === 'VALIDE_CF' ||
      dossier.statut === 'ENGAGE';
    if (!aEteVise) {
      return {
        success: false,
        error: "L'engagement n'aura pas lieu si le dossier n'est pas préalablement visé par le Contrôle Financier.",
      };
    }

    const activeUser = this.getActiveUser();
    const dateHeureEng = params.dateEngagement && params.dateEngagement.trim() ? params.dateEngagement : formatCurrentDateTime();

    // Dossier incomplet : désormais négligeable par le CF et par le comptable
    const piecesIncompletes = (dossier.pieces || []).filter(
      (p) => p.estObligatoire && p.statut !== 'CONFORME'
    );

    if (!params.refEngagement || !params.refEngagement.trim()) {
      return { success: false, error: "Veuillez renseigner la référence d'engagement comptable." };
    }

    dossier.refEngagement = params.refEngagement.trim();
    dossier.dateEngagement = dateHeureEng;
    dossier.statut = 'ENGAGE';

    if (params.note && params.note.trim()) {
      dossier.observations = (dossier.observations ? dossier.observations + ' | ' : '') + `Engagement (${params.refEngagement.trim()}): ${params.note.trim()}`;
    }
    dossier.updatedAt = new Date().toISOString();
    this.updateDossier(dossier);

    const incompleteNote = piecesIncompletes.length > 0
      ? ` (Dossier incomplet avec ${piecesIncompletes.length} pièce(s) manquante(s) : négligé/autorisé par le comptable)`
      : '';

    this.addAuditLog({
      dossierId: dossier.id,
      dossierNumero: dossier.numeroDossier,
      userRole: activeUser.role,
      userNom: activeUser.nomComplet,
      userEmail: activeUser.email,
      action: 'ENGAGEMENT_COMPTABLE',
      details: `Dossier engagé sous la référence ${params.refEngagement.trim()} le ${dateHeureEng} par le comptable ${activeUser.nomComplet}.${incompleteNote}`,
    });

    return { success: true };
  }

  /**
   * Action Comptable 2 : Mandater le dossier
   * Saisie du N° de mandat, date de mandatement, et prix de mandatement saisi (sans calcul !).
   * Dossier incomplet : négligeable par le CF et par le comptable (mandatement autorisé).
   */
  static marquerMandatement(
    dossierId: string,
    params: {
      dateMandatement: string;
      numMandat: string;
      montantMandat: number;
      observation?: string;
    }
  ): { success: boolean; error?: string } {
    const dossier = this.getDossierById(dossierId);
    if (!dossier) return { success: false, error: 'Dossier introuvable.' };

    // Dossier incomplet : négligeable par le CF et par le comptable
    const piecesIncompletes = (dossier.pieces || []).filter(
      (p) => p.estObligatoire && p.statut !== 'CONFORME'
    );

    if (!params.numMandat || !params.numMandat.trim()) {
      return { success: false, error: 'Le numéro de mandat du Trésor est obligatoire.' };
    }
    if (!params.dateMandatement) {
      return { success: false, error: 'La date de mandatement est obligatoire.' };
    }
    if (!params.montantMandat || isNaN(Number(params.montantMandat)) || Number(params.montantMandat) <= 0) {
      return { success: false, error: 'Le prix / montant de mandatement saisi doit être supérieur à 0.' };
    }

    // Si pas encore formellement engagé ou visé, assurer la cohérence sans bloquer l'opérateur
    if (!dossier.refEngagement) {
      dossier.refEngagement = `ENG-${new Date().getFullYear()}/${Math.floor(1000 + Math.random() * 9000)}`;
      dossier.dateEngagement = params.dateMandatement;
    }
    if (!dossier.numVisaCf) {
      dossier.numVisaCf = `VISA-CF-${new Date().getFullYear()}/${Math.floor(1000 + Math.random() * 9000)}`;
      dossier.dateVisaCf = params.dateMandatement;
    }

    const activeUser = this.getActiveUser();
    const montantSaisi = Number(params.montantMandat);

    dossier.dateMandatement = params.dateMandatement;
    dossier.numMandat = params.numMandat.trim();
    dossier.montantMandat = montantSaisi;
    dossier.montantSecours = montantSaisi; // Strictement la valeur saisie, pas de formule !
    dossier.statut = 'MANDATE';

    if (params.observation && params.observation.trim()) {
      dossier.observations = (dossier.observations ? dossier.observations + ' | ' : '') + `Mandatement: ${params.observation.trim()}`;
    }
    dossier.updatedAt = new Date().toISOString();
    this.updateDossier(dossier);

    const incompleteNote = piecesIncompletes.length > 0
      ? ` (Dossier incomplet avec ${piecesIncompletes.length} pièce(s) manquante(s) : négligé et mandaté par le comptable)`
      : '';

    this.addAuditLog({
      dossierId: dossier.id,
      dossierNumero: dossier.numeroDossier,
      userRole: activeUser.role,
      userNom: activeUser.nomComplet,
      userEmail: activeUser.email,
      action: 'MANDATEMENT_PAIEMENT',
      details: `Paiement mandaté sous la réf ${params.numMandat.trim()} le ${params.dateMandatement} pour un prix de ${montantSaisi.toLocaleString('fr-FR')} Ar par le comptable ${activeUser.nomComplet}.${incompleteNote}`,
    });

    return { success: true };
  }

  /**
   * Action Agent / Comptable : Renvoyer directement le dossier au mandatement
   * Utilisé lors d'un retour après engagement où le dossier peut être renvoyé directement au mandatement.
   * Le numéro de visa CF, le numéro de décision et la référence d'engagement restent strictement inchangés.
   */
  static renvoyerAuMandatement(
    dossierId: string,
    note?: string
  ): { success: boolean; error?: string } {
    const dossier = this.getDossierById(dossierId);
    if (!dossier) return { success: false, error: 'Dossier introuvable.' };

    const activeUser = this.getActiveUser();
    dossier.statut = 'ENGAGE';
    dossier.motifRetourCf = undefined;
    dossier.motifRejet = undefined;

    if (!dossier.refEngagement) {
      dossier.refEngagement = `ENG-${new Date().getFullYear()}/${Math.floor(1000 + Math.random() * 9000)}`;
      dossier.dateEngagement = formatCurrentDateTime();
    }

    if (note && note.trim()) {
      dossier.observations = (dossier.observations ? dossier.observations + ' | ' : '') + `Renvoi Mandatement: ${note.trim()}`;
    }

    dossier.updatedAt = new Date().toISOString();
    this.updateDossier(dossier);

    this.addAuditLog({
      dossierId: dossier.id,
      dossierNumero: dossier.numeroDossier,
      userRole: activeUser.role,
      userNom: activeUser.nomComplet,
      userEmail: activeUser.email,
      action: 'RENVOI_MANDATEMENT',
      details: `Dossier renvoyé directement au mandatement par l'agent ${activeUser.nomComplet}. Visa CF N° ${dossier.numVisaCf || 'Accordé'} et Décision N° ${dossier.numDecision || '—'} inchangés. Réf. engagement : ${dossier.refEngagement}.`,
    });

    return { success: true };
  }

  // Méthodes de compatibilité descendante
  static appliquerDecisionCf(
    dossierId: string,
    params: { decision: 'VALIDE' | 'REJETE'; numDecision?: string; motifRejet?: string; dateEnvoiCf?: string }
  ): { success: boolean; error?: string } {
    if (params.decision === 'VALIDE') {
      return this.marquerVisaCf(dossierId, { numDecision: params.numDecision });
    } else {
      return this.marquerRetourCf(dossierId, { motif: params.motifRejet || 'Retourné pour correction' });
    }
  }

  static appliquerMandatement(
    dossierId: string,
    params: { dateMandatement: string; numMandat: string; montantSecours?: number; observation?: string }
  ): { success: boolean; error?: string } {
    return this.marquerMandatement(dossierId, {
      dateMandatement: params.dateMandatement,
      numMandat: params.numMandat,
      montantMandat: params.montantSecours || 500000,
      observation: params.observation,
    });
  }

  // --- Audit Logs ---
  static getAuditLogs(): AuditLogEntry[] {
    try {
      const data = localStorage.getItem(STORAGE_KEY_LOGS);
      if (data) {
        return JSON.parse(data);
      }
    } catch {
      // ignore
    }
    localStorage.setItem(STORAGE_KEY_LOGS, JSON.stringify(INITIAL_AUDIT_LOGS));
    return INITIAL_AUDIT_LOGS;
  }

  static addAuditLog(entry: Omit<AuditLogEntry, 'id' | 'timestamp'>) {
    const logs = this.getAuditLogs();
    const newEntry: AuditLogEntry = {
      ...entry,
      id: `log-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toISOString(),
    };
    const updated = [newEntry, ...logs];
    localStorage.setItem(STORAGE_KEY_LOGS, JSON.stringify(updated.slice(0, 200)));

    // Synchronisation temps réel du journal d'audit avec MongoDB
    if (typeof window !== 'undefined' && window.fetch) {
      fetch('/api/audit-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newEntry),
      }).catch(() => {
        // Mode hors-ligne ou fallback silencieux
      });
    }

    this.notify();
  }

  // --- Export Excel / CSV complet ---
  static exportExcelCsv(filteredDossiers?: DossierSecours[]) {
    const list = filteredDossiers || this.getDossiers();

    const headers = [
      'DATE ARRIVÉE',
      'DATE DÉLAI COMPLET',
      'NOM BÉNÉFICIAIRE',
      'NOMS DÉFUNT',
      'IM',
      'DATE ENVOI CF',
      'DATE REJET/RETOUR CF',
      'N° VISA CF',
      'N° DÉCISION',
      'DATE MANDATEMENT',
      'N° MANDAT',
      'MONTANT (AR)',
      'MOTIF REJET',
    ];

    const escapeCsv = (str: string | undefined | null) => {
      if (!str) return '""';
      const clean = String(str).replace(/"/g, '""');
      return `"${clean}"`;
    };

    const formatDate = (dateStr?: string) => {
      if (!dateStr) return '';
      try {
        const parts = dateStr.split('-');
        if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
        return dateStr;
      } catch {
        return dateStr;
      }
    };

    const rows = list.map((d) => [
      escapeCsv(formatDate(d.dateArrivee)),
      escapeCsv(formatDate(d.dateDelaiComplet)),
      escapeCsv(`${d.demandeur.nom} ${d.demandeur.prenoms}`.trim()),
      escapeCsv(`${d.defunt.nom} ${d.defunt.prenoms}`.trim()),
      escapeCsv(d.defunt.im),
      escapeCsv(formatDate(d.dateEnvoiCf)),
      escapeCsv(formatDate(d.dateRetourCf)),
      escapeCsv(d.numVisaCf || ''),
      escapeCsv(d.numDecision || ''),
      escapeCsv(formatDate(d.dateMandatement)),
      escapeCsv(d.numMandat || ''),
      escapeCsv(d.montantSecours ? d.montantSecours.toString() : '0'),
      escapeCsv(d.motifRejet || ''),
    ]);

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `suivi_secours_deces_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // --- Clear all data (0 dossier) ---
  static clearAllData() {
    this.saveDossiers([]);
    localStorage.setItem(STORAGE_KEY_LOGS, JSON.stringify([]));
    this.setActiveRole('AGENT');
    this.notify();
  }

  static resetToDemo() {
    this.clearAllData();
  }

  static resetToInitialData() {
    this.clearAllData();
  }
}
