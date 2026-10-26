import { DossierSecours, PieceJustificative, UserRole } from '../types';

export type WorkflowActionType =
  | 'ENVOI_CF'
  | 'RETOUR_CF'
  | 'VISA_CF'
  | 'SAISIE_DECISION'
  | 'ENGAGEMENT'
  | 'MANDATEMENT'
  | 'DECISION_CF'; // pour compatibilité

export interface WorkflowPrerequisiteCheck {
  allowed: boolean;
  reason?: string;
  blockingPrerequisites: string[];
  piecesManquantes?: PieceJustificative[];
}

export interface WorkflowStepSummary {
  stepNumber: number;
  id: 'ENQUETE' | 'TRANSMISSION_CF' | 'VISA_CF' | 'ENGAGEMENT_MANDATEMENT' | 'DECISION_CF' | 'MANDATEMENT';
  label: string;
  roleResponsable: string;
  status: 'COMPLETED' | 'IN_PROGRESS' | 'LOCKED' | 'REJECTED';
  description: string;
  priorities: string[];
  isLocked: boolean;
  unfulfilledPriorities: string[];
}

export class WorkflowValidationService {
  /**
   * Étape 1 : Réception et Étude de fond et de forme (Agent Instructeur)
   * Priorités :
   * - Données de base de l'agent décédé valides (IM, Nom, Date décès, N° pension si retraité)
   * - Données de base de l'ayant droit valides (Nom, CIN, Ordonnance de tutelle si requise)
   * - TOUTES les pièces justificatives obligatoires doivent être CONFORMES
   */
  static checkEtape1Enquete(dossier: DossierSecours): {
    accomplie: boolean;
    motifsIncomplets: string[];
    piecesManquantes: PieceJustificative[];
  } {
    const motifsIncomplets: string[] = [];
    const piecesManquantes: PieceJustificative[] = [];

    // 1. Contrôle défunt
    if (!dossier.defunt.im || !dossier.defunt.im.trim()) {
      motifsIncomplets.push("Indice Matricule (IM) de l'agent décédé manquant");
    }
    if (!dossier.defunt.nom || !dossier.defunt.nom.trim()) {
      motifsIncomplets.push("Nom de l'agent décédé manquant");
    }
    if (!dossier.defunt.dateDeces) {
      motifsIncomplets.push('Date du décès non renseignée');
    }
    if (dossier.defunt.statutActivite === 'RETRAITE_PENSIONNE' && !dossier.defunt.numeroPension) {
      motifsIncomplets.push('Numéro de pension manquant pour agent retraité');
    }

    // 2. Contrôle demandeur
    if (!dossier.demandeur.nom || !dossier.demandeur.nom.trim()) {
      motifsIncomplets.push("Nom de l'ayant droit demandeur manquant");
    }
    if (!dossier.demandeur.cin || !dossier.demandeur.cin.trim()) {
      motifsIncomplets.push('Numéro de CIN du demandeur manquant');
    }

    // 3. Contrôle des pièces obligatoires (PRIORITÉ FONDAMENTALE POUR MANDATEMENT)
    const obligatoires = (dossier.pieces || []).filter((p) => p.estObligatoire);
    if (obligatoires.length > 0) {
      for (const piece of obligatoires) {
        if (piece.statut !== 'CONFORME') {
          piecesManquantes.push(piece);
        }
      }
    }

    const accomplie = motifsIncomplets.length === 0;

    return {
      accomplie,
      motifsIncomplets,
      piecesManquantes,
    };
  }

  /**
   * Étape 2 : Transmission au Contrôle Financier
   * Priorités :
   * - Étape 1 accomplie à 100%
   * - Enregistrement formel de la date de transmission (dateEnvoiCf)
   */
  static checkEtape2Transmission(dossier: DossierSecours): {
    accomplie: boolean;
    motifsIncomplets: string[];
  } {
    const motifsIncomplets: string[] = [];

    // Vérifier l'étape 1 précédente
    const etape1 = this.checkEtape1Enquete(dossier);
    if (!etape1.accomplie) {
      motifsIncomplets.push(
        `Étape 1 incomplète : ${etape1.motifsIncomplets[0] || 'Pièces ou données manquantes'}`
      );
    }

    // Vérifier la transmission
    if (!dossier.dateEnvoiCf) {
      motifsIncomplets.push("Date de transmission au Contrôle Financier (DATE ENVOI CF) non renseignée");
    }

    const accomplie = etape1.accomplie && !!dossier.dateEnvoiCf;

    return {
      accomplie,
      motifsIncomplets,
    };
  }

  /**
   * Étape 3 : Visa / Décision du Contrôle Financier
   * Priorités :
   * - Étape 2 accomplie (dossier transmis avec dateEnvoiCf)
   * - Pour validation : N° de Décision CF attribué
   * - Pour rejet : Motif de rejet motivé
   */
  static checkEtape3DecisionCf(dossier: DossierSecours): {
    accomplie: boolean;
    estValide: boolean;
    estRejete: boolean;
    motifsIncomplets: string[];
  } {
    const motifsIncomplets: string[] = [];

    const etape2 = this.checkEtape2Transmission(dossier);
    if (!etape2.accomplie) {
      motifsIncomplets.push("Le dossier n'a pas encore été formellement transmis au CF (Étape 2 requise)");
    }

    const estValide =
      (dossier.statut === 'VALIDE_CF' || dossier.statut === 'ENGAGE' || dossier.statut === 'MANDATE') &&
      (!!dossier.numVisaCf || !!dossier.numDecision || dossier.statut === 'MANDATE');
    const estRejete = dossier.statut === 'REJETE_CF' && !!dossier.motifRejet;

    if (!estValide && !estRejete) {
      motifsIncomplets.push('Visa du Contrôle Financier en attente (aucun visa enregistré)');
    }

    const accomplie =
      (etape2.accomplie || dossier.statut === 'MANDATE' || dossier.statut === 'VALIDE_CF' || dossier.statut === 'ENGAGE') &&
      (estValide || estRejete);

    return {
      accomplie,
      estValide,
      estRejete,
      motifsIncomplets,
    };
  }

  /**
   * Étape 4 : Mandatement et Paiement Trésor
   * Priorités :
   * - Étape 3 accomplie avec visa favorable (statut VALIDE_CF et numDecision)
   * - Date de mandatement Trésor
   * - N° de Mandat Trésor
   */
  static checkEtape4Mandatement(dossier: DossierSecours): {
    accomplie: boolean;
    motifsIncomplets: string[];
  } {
    const motifsIncomplets: string[] = [];

    const etape3 = this.checkEtape3DecisionCf(dossier);
    if (!etape3.estValide) {
      if (dossier.statut === 'REJETE_CF') {
        motifsIncomplets.push('Dossier rejeté par le Contrôle Financier : mandatement impossible sans régularisation');
      } else {
        motifsIncomplets.push('Visa préalable du Contrôle Financier (N° Décision) obligatoire avant tout mandatement');
      }
    }

    if (!dossier.dateMandatement && dossier.statut !== 'MANDATE') {
      motifsIncomplets.push('Date de mandatement Trésor non renseignée');
    }
    if (!dossier.numMandat && dossier.statut !== 'MANDATE') {
      motifsIncomplets.push('N° Titre de Mandat Trésor non attribué');
    }

    const accomplie =
      dossier.statut === 'MANDATE' ||
      (etape3.estValide && !!dossier.dateMandatement);

    return {
      accomplie,
      motifsIncomplets,
    };
  }

  /**
   * Vérifie si une action de workflow spécifique peut être exécutée
   */
  static canExecuteWorkflowAction(
    dossier: DossierSecours,
    action: WorkflowActionType,
    activeRole?: UserRole
  ): WorkflowPrerequisiteCheck {
    if (action === 'ENVOI_CF') {
      if (dossier.statut === 'MANDATE') {
        return {
          allowed: false,
          reason: 'Ce dossier a déjà été mandaté et payé au Trésor.',
          blockingPrerequisites: ['Dossier déjà mandaté'],
        };
      }

      return {
        allowed: true,
        blockingPrerequisites: [],
      };
    }

    if (action === 'RETOUR_CF') {
      if (dossier.statut === 'MANDATE') {
        return {
          allowed: false,
          reason: 'Ce dossier a déjà été mandaté et payé au Trésor.',
          blockingPrerequisites: ['Dossier déjà mandaté et archivé'],
        };
      }
      return { allowed: true, blockingPrerequisites: [] };
    }

    if (action === 'VISA_CF' || action === 'DECISION_CF') {
      if (dossier.statut === 'MANDATE') {
        return {
          allowed: false,
          reason: 'Ce dossier est déjà mandaté.',
          blockingPrerequisites: ['Dossier déjà mandaté'],
        };
      }
      return { allowed: true, blockingPrerequisites: [] };
    }

    if (action === 'SAISIE_DECISION') {
      if (dossier.statut !== 'VALIDE_CF' && dossier.statut !== 'ENGAGE' && dossier.statut !== 'MANDATE') {
        return {
          allowed: false,
          reason: "Le N° de décision est établi par l'agent après l'obtention du visa du CF.",
          blockingPrerequisites: ['Visa CF préalable requis'],
        };
      }
      return { allowed: true, blockingPrerequisites: [] };
    }

    if (action === 'ENGAGEMENT') {
      // Règle stricte : L'engagement n'aura pas lieu si le dossier n'est pas visé par le CF
      const aEteVise =
        !!dossier.numVisaCf ||
        !!dossier.numDecision ||
        !!dossier.dateVisaCf ||
        dossier.statut === 'VALIDE_CF' ||
        dossier.statut === 'ENGAGE';

      if (!aEteVise) {
        return {
          allowed: false,
          reason: "L'engagement n'aura pas lieu si le dossier n'est pas préalablement visé par le Contrôle Financier (CF).",
          blockingPrerequisites: [
            "Visa préalable du Contrôle Financier obligatoire avant engagement.",
            "Veuillez faire viser le dossier par le CF avant de procéder à l'engagement.",
          ],
        };
      }

      // Dossier incomplet : négligeable par le CF et par le comptable
      const piecesIncompletes = (dossier.pieces || []).filter(
        (p) => p.estObligatoire && p.statut !== 'CONFORME'
      );

      return {
        allowed: true,
        blockingPrerequisites: [],
        piecesManquantes: piecesIncompletes,
        reason: piecesIncompletes.length > 0
          ? `Dossier visé par le CF avec ${piecesIncompletes.length} pièce(s) manquante(s) (statut incomplet négligeable) : engagement autorisé.`
          : undefined,
      };
    }

    if (action === 'MANDATEMENT') {
      if ((dossier.statut as string) === 'MANDATE') {
        return {
          allowed: false,
          reason: 'Ce dossier a déjà été mandaté au Trésor.',
          blockingPrerequisites: [`Mandat déjà émis : ${dossier.numMandat || ''}`],
        };
      }

      // Le mandatement nécessite que le dossier ait été visé préalablement
      const aEteVise =
        !!dossier.numVisaCf ||
        !!dossier.numDecision ||
        !!dossier.dateVisaCf ||
        dossier.statut === 'VALIDE_CF' ||
        dossier.statut === 'ENGAGE';

      if (!aEteVise) {
        return {
          allowed: false,
          reason: "Le mandatement ne peut pas avoir lieu sans visa préalable du Contrôle Financier.",
          blockingPrerequisites: ["Visa préalable du Contrôle Financier obligatoire."],
        };
      }

      // Dossier incomplet : négligeable par le CF et par le comptable
      const piecesIncompletes = (dossier.pieces || []).filter(
        (p) => p.estObligatoire && p.statut !== 'CONFORME'
      );

      return {
        allowed: true,
        blockingPrerequisites: [],
        piecesManquantes: piecesIncompletes,
        reason: piecesIncompletes.length > 0
          ? `Dossier incomplet (${piecesIncompletes.length} pièce(s) manquante(s)), mais négligeable : mandatement autorisé par le comptable.`
          : undefined,
      };
    }

    return {
      allowed: true,
      blockingPrerequisites: [],
    };
  }

  /**
   * Retourne l'état complet de la procédure par étapes pour affichage visuel
   */
  static getDossierWorkflowProgress(dossier: DossierSecours): WorkflowStepSummary[] {
    const etape1 = this.checkEtape1Enquete(dossier);

    // Étape 1 : Réception et Étude de fond et de forme
    const step1: WorkflowStepSummary = {
      stepNumber: 1,
      id: 'ENQUETE',
      label: 'Étude de fond et de forme et Pièces (Agent)',
      roleResponsable: 'Agent Instructeur',
      status: (dossier.statut !== 'RECEPTION_EN_COURS' && dossier.statut !== 'DOSSIER_INCOMPLET') ? 'COMPLETED' : 'IN_PROGRESS',
      description: "Saisie initiale du dossier et contrôle des pièces fournies",
      priorities: [
        'Identification agent défunt et ayant droit',
        'Contrôle des pièces justificatives obligatoires',
      ],
      isLocked: false,
      unfulfilledPriorities: etape1.motifsIncomplets,
    };

    // Étape 2 : Transmission et Retours CF
    let step2Status: WorkflowStepSummary['status'] = 'LOCKED';
    if (dossier.statut === 'VALIDE_CF' || dossier.statut === 'ENGAGE' || dossier.statut === 'MANDATE') {
      step2Status = 'COMPLETED';
    } else if (dossier.statut === 'TRANSMIS_CF') {
      step2Status = 'IN_PROGRESS';
    } else if (dossier.statut === 'RETOUR_CF' || dossier.statut === 'REJETE_CF') {
      step2Status = 'REJECTED';
    } else {
      step2Status = 'IN_PROGRESS';
    }

    const step2: WorkflowStepSummary = {
      stepNumber: 2,
      id: 'TRANSMISSION_CF',
      label: 'Échanges Contrôle Financier (Agent)',
      roleResponsable: 'Agent Instructeur',
      status: step2Status,
      description: dossier.dateEnvoiCf
        ? `Envoyé au CF le ${dossier.dateEnvoiCf}${dossier.dateRetourCf ? ` | Revenu le ${dossier.dateRetourCf}` : ''}`
        : "Enregistrement de la date et heure d'envoi et de retour éventuel jusqu'au visa",
      priorities: [
        dossier.dateEnvoiCf ? `Date/heure d'envoi : ${dossier.dateEnvoiCf}` : "Transmission au CF avec date et heure",
        dossier.motifRetourCf ? `Motif retour : ${dossier.motifRetourCf}` : "Attente du retour ou visa du CF",
      ],
      isLocked: false,
      unfulfilledPriorities: [],
    };

    // Étape 3 : Visa du CF
    let step3Status: WorkflowStepSummary['status'] = 'LOCKED';
    if (dossier.statut === 'VALIDE_CF' || dossier.statut === 'ENGAGE' || dossier.statut === 'MANDATE') {
      step3Status = 'COMPLETED';
    } else if (dossier.statut === 'TRANSMIS_CF') {
      step3Status = 'IN_PROGRESS';
    } else {
      step3Status = 'LOCKED';
    }

    const step3: WorkflowStepSummary = {
      stepNumber: 3,
      id: 'VISA_CF',
      label: 'Visa CF et Décision (Agent -> Comptable)',
      roleResponsable: 'Agent Instructeur',
      status: step3Status,
      description: (dossier.numVisaCf || dossier.numDecision)
        ? `Visa CF N° ${dossier.numVisaCf || dossier.numDecision}${dossier.dateVisaCf ? ` (${dossier.dateVisaCf})` : ''}${dossier.numDecision ? ` | Décision N° ${dossier.numDecision}` : ' (Décision à rédiger par l\'agent)'}`
        : "Notification de visa accordé par le CF puis établissement de la décision par l'agent",
      priorities: [
        dossier.numVisaCf ? `Visa CF N° : ${dossier.numVisaCf}` : "Attente du visa du Contrôle Financier",
        dossier.numDecision ? `N° Décision : ${dossier.numDecision}` : "Décision administrative à rédiger par l'agent après visa",
        "Mise à disposition du comptable pour engagement et mandatement",
      ],
      isLocked: dossier.statut !== 'VALIDE_CF' && dossier.statut !== 'ENGAGE' && dossier.statut !== 'MANDATE' && dossier.statut !== 'TRANSMIS_CF',
      unfulfilledPriorities: [],
    };

    // Étape 4 : Engagement et Mandatement
    let step4Status: WorkflowStepSummary['status'] = 'LOCKED';
    if (dossier.statut === 'MANDATE') {
      step4Status = 'COMPLETED';
    } else if (dossier.statut === 'ENGAGE') {
      step4Status = 'IN_PROGRESS';
    } else if (dossier.statut === 'VALIDE_CF' || dossier.statut === 'EN_ATTENTE_MANDAT') {
      step4Status = 'IN_PROGRESS';
    } else {
      step4Status = 'LOCKED';
    }

    const step4: WorkflowStepSummary = {
      stepNumber: 4,
      id: 'ENGAGEMENT_MANDATEMENT',
      label: 'Engagement et Mandatement (Agent)',
      roleResponsable: 'Agent Instructeur',
      status: step4Status,
      description: dossier.statut === 'MANDATE'
        ? `Mandaté sous la réf ${dossier.numMandat} (${dossier.dateMandatement}) - Prix : ${(dossier.montantMandat || dossier.montantSecours).toLocaleString('fr-FR')} Ar`
        : dossier.statut === 'ENGAGE'
        ? `Engagé sous la réf ${dossier.refEngagement} (${dossier.dateEngagement}) - Prêt pour mandatement`
        : "Prise en charge du dossier visé, engagement comptable et mandatement avec saisie du prix",
      priorities: [
        dossier.refEngagement ? `Engagement : ${dossier.refEngagement}` : "Engagement comptable préalable",
        dossier.numMandat ? `Mandat N° : ${dossier.numMandat}` : "Mandatement avec saisie manuelle du prix",
      ],
      isLocked: dossier.statut !== 'VALIDE_CF' && dossier.statut !== 'ENGAGE' && dossier.statut !== 'MANDATE' && dossier.statut !== 'EN_ATTENTE_MANDAT',
      unfulfilledPriorities: [],
    };

    return [step1, step2, step3, step4];
  }
}
