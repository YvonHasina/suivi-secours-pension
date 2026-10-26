import { StatutActivite, LienParente, ChecklistRuleSpec } from '../types';

export function genererChecklistRequise(
  statutDefunt: StatutActivite,
  lienDemandeur: LienParente,
  casComplexes: string[] = [],
  enfantsHandicapes: boolean = false,
  nbEnfantsMineurs: number = 0
): ChecklistRuleSpec[] {
  const pieces: ChecklistRuleSpec[] = [];

  // Distinguons d'abord entre AGENT EN ACTIVITÉ (sur solde) et AGENT RETRAITÉ (sur pensions)
  if (statutDefunt === 'ACTIVITE') {
    // -------------------------------------------------------------
    // SECOURS AUX DECES DES AGENTS DECEDES EN ACTIVITES (sur solde)
    // -------------------------------------------------------------

    // A. Cas 1 : Veuf ou la veuve (sans orphelins mineurs)
    if (lienDemandeur === 'VEUF_VEUVE' && !casComplexes.includes('DIVORCE') && !casComplexes.includes('DEUX_PARENTS_DECES')) {
      pieces.push(
        {
          codePiece: 'DEMANDE_TIMBREE',
          intitule: 'Demande formulée avec adresse exacte et numéro de téléphone (en 3 ex : 1 orig + 2 photocopies)',
          estObligatoire: true,
          categorie: 'Demande',
          instruction: 'Rédigée et signée par le conjoint survivant.',
        },
        {
          codePiece: 'ACTE_DECES',
          intitule: 'Acte de décès (en 3 ex : 1 orig + 2 photocopies)',
          estObligatoire: true,
          categorie: 'État Civil Défunt',
          instruction: 'Délivré par la Commune / Mairie.',
        },
        {
          codePiece: 'ACTE_MARIAGE',
          intitule: 'Acte de mariage (en 3 ex : 1 orig + 2 photocopies)',
          estObligatoire: true,
          categorie: 'Lien Matrimonial',
          instruction: 'Copie conforme du mariage civil.',
        },
        {
          codePiece: 'CERTIF_NON_SEPARATION_CORPS',
          intitule: 'Certificat de non-séparation de corps et de non-divorce (en 3 ex : 1 orig + 2 photocopies)',
          estObligatoire: true,
          categorie: 'Lien Matrimonial',
          instruction: 'Délivré par la Commune, le Fokotany et certifié avec 2 témoins.',
        },
        {
          codePiece: 'ACTE_NOTORIETE',
          intitule: 'Acte de notoriété (en 3 ex : 1 orig + 2 photocopies)',
          estObligatoire: true,
          categorie: 'Succession',
          instruction: 'Délivré par la Commune, le District ou le Notaire.',
        },
        {
          codePiece: 'CIN_DEMANDEUR_CERTIFIEE',
          intitule: 'Photocopie de la CIN certifiée du veuf/veuve (en 3 ex : 1 orig + 2 photocopies)',
          estObligatoire: true,
          categorie: 'Identification',
          instruction: 'Légalisation de la Carte d’Identité Nationale.',
        },
        {
          codePiece: 'BULLETIN_SOLDE',
          intitule: "Photocopie de l'avis de crédit, bulletin de solde ou bon de caisse du mois du décès (en 3 ex : 1 orig + 2 photocopies)",
          estObligatoire: true,
          categorie: 'Situation Financière',
          instruction: 'Doit être certifié conforme et parfaitement lisible.',
        },
        {
          codePiece: 'CERTIF_CESSATION_PAIEMENT',
          intitule: 'Certificat de cessation de paiement (CCP) (en 3 ex : 1 orig + 2 photocopies)',
          estObligatoire: true,
          categorie: 'Situation Financière',
          instruction: 'Délivré par la Direction de la Solde ou Trésor.',
        }
      );
    }

    // B. Cas 2 : Veuf/veuve et tuteur/tutrice des enfants mineurs
    else if (lienDemandeur === 'TUTEUR_ENFANT_MINEUR' && !casComplexes.includes('DEUX_PARENTS_DECES') && !casComplexes.includes('DIVORCE')) {
      pieces.push(
        {
          codePiece: 'DEMANDE_TIMBREE',
          intitule: 'Demande formulée avec adresse et téléphone (en 3 ex : 1 orig + 2 photocopies)',
          estObligatoire: true,
          categorie: 'Demande',
          instruction: 'Établie par le veuf/veuve ou le tuteur légal.',
        },
        {
          codePiece: 'ACTE_DECES',
          intitule: 'Acte de décès et acte de mariage (en 3 ex : 1 orig + 2 photocopies)',
          estObligatoire: true,
          categorie: 'État Civil',
          instruction: 'Délivrés par la Mairie/Commune.',
        },
        {
          codePiece: 'CERTIF_NON_SEPARATION_CORPS',
          intitule: 'Certificat de non-séparation de corps et de non-divorce (en 3 ex : 1 orig + 2 photocopies)',
          estObligatoire: true,
          categorie: 'Lien Matrimonial',
          instruction: 'Délivré par l’officier municipal ou Fokontany.',
        },
        {
          codePiece: 'ACTE_NOTORIETE',
          intitule: 'Acte de notoriété (en 3 ex : 1 orig + 2 photocopies)',
          estObligatoire: true,
          categorie: 'Succession',
          instruction: 'Délivré par la Commune, le District ou le Notaire.',
        },
        {
          codePiece: 'ORDONNANCE_TUTELLE',
          intitule: 'Ordonnance de tutelle des enfants mineurs (en 3 ex : 1 orig + 2 photocopies)',
          estObligatoire: true,
          categorie: 'Protection Juridique',
          instruction: 'Délivrée par le Tribunal de Première Instance.',
        },
        {
          codePiece: 'ACTE_NAISSANCE_MINEURS',
          intitule: 'Acte de naissance de chaque enfant mineur (en 3 ex : 1 orig + 2 photocopies)',
          estObligatoire: true,
          categorie: 'Filiation',
          instruction: 'Copie d’acte de naissance certifiée.',
        },
        {
          codePiece: 'CERTIF_VIE_COLLECTIF',
          intitule: 'Certificat de vie collectif des enfants mineurs (en 3 ex : 1 orig + 2 photocopies)',
          estObligatoire: true,
          categorie: 'État Civil Mineurs',
          instruction: 'Certifié avec 2 témoins par l’arrondissement municipal.',
        },
        {
          codePiece: 'CIN_DEMANDEUR_CERTIFIEE',
          intitule: 'Photocopie de la CIN certifiée du demandeur (en 3 ex : 1 orig + 2 photocopies)',
          estObligatoire: true,
          categorie: 'Identification',
          instruction: 'CIN en cours de validité, légalisée.',
        },
        {
          codePiece: 'BULLETIN_SOLDE',
          intitule: "Photocopie de l'avis de crédit/bulletin de solde du mois du décès (en 3 ex : 1 orig + 2 photocopies)",
          estObligatoire: true,
          categorie: 'Situation Financière',
          instruction: 'Certifiée et bien lisible.',
        },
        {
          codePiece: 'CERTIF_CESSATION_PAIEMENT',
          intitule: 'Certificat de cessation de paiement (CCP) (en 3 ex : 1 orig + 2 photocopies)',
          estObligatoire: true,
          categorie: 'Situation Financière',
          instruction: 'Délivré par la Direction de la Solde ou Trésor.',
        }
      );
    }

    // C. Cas 3 : Si le défunt célibataire avec mineur
    else if (lienDemandeur === 'CELIBATAIRE_AVEC_MINEUR') {
      pieces.push(
        {
          codePiece: 'DEMANDE_TIMBREE',
          intitule: 'Demande formulée par le tuteur pour les enfants mineurs avec adresse et téléphone (en 3 ex : 1 orig + 2 photocopies)',
          estObligatoire: true,
          categorie: 'Demande',
          instruction: 'Établie par le tuteur.',
        },
        {
          codePiece: 'ACTE_DECES',
          intitule: 'Acte de décès (en 3 ex : 1 orig + 2 photocopies)',
          estObligatoire: true,
          categorie: 'État Civil Défunt',
          instruction: 'Délivré par la Commune.',
        },
        {
          codePiece: 'CERTIF_CELIBAT',
          intitule: 'Certificat de célibat du défunt (en 3 ex : 1 orig + 2 photocopies)',
          estObligatoire: true,
          categorie: 'État Civil Défunt',
          instruction: 'Délivré par la mairie.',
        },
        {
          codePiece: 'ACTE_NOTORIETE',
          intitule: 'Acte de notoriété (en 3 ex : 1 orig + 2 photocopies)',
          estObligatoire: true,
          categorie: 'Succession',
          instruction: 'Établit les héritiers du défunt.',
        },
        {
          codePiece: 'ORDONNANCE_TUTELLE',
          intitule: 'Ordonnance de tutelle délivrée par le Tribunal (en 3 ex : 1 orig + 2 photocopies)',
          estObligatoire: true,
          categorie: 'Protection Juridique',
          instruction: 'Délivrée par le tribunal compétent.',
        },
        {
          codePiece: 'ACTE_NAISSANCE_MINEURS',
          intitule: 'Acte de naissance de chaque enfant mineur (en 3 ex : 1 orig + 2 photocopies)',
          estObligatoire: true,
          categorie: 'Filiation',
          instruction: 'Preuve de la filiation.',
        },
        {
          codePiece: 'ACTE_RECONNAISSANCE',
          intitule: 'Acte de reconnaissance de chaque enfant mineur (en 3 ex : 1 orig + 2 photocopies)',
          estObligatoire: true,
          categorie: 'Filiation',
          instruction: 'Acte de reconnaissance expresse par le défunt.',
        },
        {
          codePiece: 'CERTIF_VIE_COLLECTIF',
          intitule: 'Certificat de vie collectif des enfants mineurs (en 3 ex : 1 orig + 2 photocopies)',
          estObligatoire: true,
          categorie: 'État Civil Mineurs',
          instruction: 'Preuve de vie des orphelins.',
        },
        {
          codePiece: 'CIN_DEMANDEUR_CERTIFIEE',
          intitule: 'Photocopie de la CIN (Carte d\'Identité Nationale) du tuteur (en 3 ex : 1 orig + 2 photocopies)',
          estObligatoire: true,
          categorie: 'Identification',
          instruction: 'CIN certifiée conforme du tuteur.',
        },
        {
          codePiece: 'BULLETIN_SOLDE',
          intitule: 'Avis de crédit / Bulletin de solde / Bon de caisse de décès (en 3 ex : 1 orig + 2 photocopies)',
          estObligatoire: true,
          categorie: 'Situation Financière',
          instruction: 'Avis de paiement de solde.',
        },
        {
          codePiece: 'CERTIF_CHARGE_ET_GARDE',
          intitule: 'Certificat de charge et de garde (en 3 ex : 1 orig + 2 photocopies)',
          estObligatoire: true,
          categorie: 'Garde légale',
          instruction: 'Délivré par le Fokontany.',
        },
        {
          codePiece: 'CERTIF_CESSATION_PAIEMENT',
          intitule: 'Certificat de cessation de paiement (CCP) (en 3 ex : 1 orig + 2 photocopies)',
          estObligatoire: true,
          categorie: 'Situation Financière',
          instruction: 'Délivré par la Direction de la Solde.',
        }
      );
    }

    // D. Cas 4 : Si père et mère de l’enfant mineur décédés
    else if (casComplexes.includes('DEUX_PARENTS_DECES')) {
      pieces.push(
        {
          codePiece: 'DEMANDE_TIMBREE',
          intitule: 'Demande formulée par le Tuteur(ice) avec adresse exacte et numéro de téléphone (en 3 ex : 1 orig + 2 photocopies)',
          estObligatoire: true,
          categorie: 'Demande',
          instruction: 'Établie par le tuteur désigné.',
        },
        {
          codePiece: 'ACTE_DECES_PERE',
          intitule: 'Acte de décès du père (en 3 ex : 1 orig + 2 photocopies)',
          estObligatoire: true,
          categorie: 'État Civil Parents',
          instruction: 'Délivré par la Mairie.',
        },
        {
          codePiece: 'ACTE_DECES_MERE',
          intitule: 'Acte de décès de la mère (en 3 ex : 1 orig + 2 photocopies)',
          estObligatoire: true,
          categorie: 'État Civil Parents',
          instruction: 'Délivré par la Mairie.',
        },
        {
          codePiece: 'ACTE_MARIAGE_PARENTS',
          intitule: 'Acte de mariage des parents (en 3 ex : 1 orig + 2 photocopies)',
          estObligatoire: true,
          categorie: 'Lien Matrimonial Parents',
          instruction: 'Preuve de mariage civil.',
        },
        {
          codePiece: 'ACTE_NAISSANCE_MINEURS',
          intitule: 'Acte de naissance de chaque enfant mineur (en 3 ex : 1 orig + 2 photocopies)',
          estObligatoire: true,
          categorie: 'Filiation',
          instruction: 'Filiation certifiée conforme.',
        },
        {
          codePiece: 'CERTIF_NON_REMARIAGE_DEFUNT',
          intitule: 'Certificat de non-remariage de l’agent décédé en activité (en 3 ex : 1 orig + 2 photocopies)',
          estObligatoire: true,
          categorie: 'État Civil Défunt',
          instruction: 'Délivré par la commune (+2 témoins) ; ou Fokontany visé par la commune (+2 témoins).',
        },
        {
          codePiece: 'ACTE_NOTORIETE',
          intitule: 'Acte de notoriété (en 3 ex : 1 orig + 2 photocopies)',
          estObligatoire: true,
          categorie: 'Succession',
          instruction: 'Tribunal ou Commune.',
        },
        {
          codePiece: 'ORDONNANCE_TUTELLE',
          intitule: 'Ordonnance de tutelle des enfants mineurs délivrée par le tribunal (en 3 ex : 1 orig + 2 photocopies)',
          estObligatoire: true,
          categorie: 'Protection Juridique',
          instruction: 'Délivrée par le juge de tutelle.',
        },
        {
          codePiece: 'CERTIF_VIE_COLLECTIF',
          intitule: 'Certificat de vie collectif des enfants mineurs (en 3 ex : 1 orig + 2 photocopies)',
          estObligatoire: true,
          categorie: 'État Civil Mineurs',
          instruction: 'Délivré par la mairie.',
        },
        {
          codePiece: 'CERTIF_CHARGE_ET_GARDE',
          intitule: 'Certificat de charge et de garde (+2 témoins) (en 3 ex : 1 orig + 2 photocopies)',
          estObligatoire: true,
          categorie: 'Garde légale',
          instruction: 'Certificat de garde Fokontany.',
        },
        {
          codePiece: 'CIN_DEMANDEUR_CERTIFIEE',
          intitule: 'Photocopie de la CIN certifiée du tuteur (en 3 ex : 1 orig + 2 photocopies)',
          estObligatoire: true,
          categorie: 'Identification',
          instruction: 'Légalisation CIN.',
        },
        {
          codePiece: 'BULLETIN_SOLDE',
          intitule: 'Photocopie de l’avis de crédit, du bulletin de solde ou du bon de caisse du mois de décès (en 3 ex : 1 orig + 2 photocopies)',
          estObligatoire: true,
          categorie: 'Situation Financière',
          instruction: 'Situation salariale du mois de décès.',
        },
        {
          codePiece: 'CERTIF_CESSATION_PAIEMENT',
          intitule: 'Certificat de Cessation de Paiement (CCP) (en 3 ex : 1 orig + 2 photocopies)',
          estObligatoire: true,
          categorie: 'Situation Financière',
          instruction: 'Enregistrement de fin de versement de la solde.'
        }
      );
    }

    // E. Cas 5 : Si défunt divorcé
    else if (casComplexes.includes('DIVORCE') || lienDemandeur === 'AUTRE_AYANT_DROIT' && casComplexes.includes('DIVORCE')) {
      pieces.push(
        {
          codePiece: 'DEMANDE_TIMBREE',
          intitule: 'Demande formulée par le tuteur(ice) des enfants mineurs avec adresse exacte et numéro de téléphone (en 3 ex : 1 orig + 2 photocopies)',
          estObligatoire: true,
          categorie: 'Demande',
          instruction: 'Établie par le tuteur de l’enfant.',
        },
        {
          codePiece: 'ACTE_DECES',
          intitule: 'Acte de décès (en 3 ex : 1 orig + 2 photocopies)',
          estObligatoire: true,
          categorie: 'État Civil Défunt',
          instruction: 'Preuve de décès de l’agent.',
        },
        {
          codePiece: 'JUGEMENT_DIVORCE',
          intitule: 'Jugement de divorce délivré par le Tribunal ou acte de divorce délivré par la Commune (en 3 ex : 1 orig + 2 photocopies)',
          estObligatoire: true,
          categorie: 'Protection Juridique',
          instruction: 'Décision de divorce légale.',
        },
        {
          codePiece: 'CERTIF_NON_REMARIAGE_DEFUNT',
          intitule: 'Certificat de non remariage du défunt après divorce (+ deux témoins) (en 3 ex : 1 orig + 2 photocopies)',
          estObligatoire: true,
          categorie: 'État Civil Défunt',
          instruction: 'Délivré par l’officier d’état civil.',
        },
        {
          codePiece: 'ACTE_NOTORIETE',
          intitule: 'Acte de notoriété délivré par la Commune, le District ou le Notaire (en 3 ex : 1 orig + 2 photocopies)',
          estObligatoire: true,
          categorie: 'Succession',
          instruction: 'Prouve la qualité d’héritier.',
        },
        {
          codePiece: 'ORDONNANCE_TUTELLE',
          intitule: 'Ordonnance de tutelle des enfants mineurs délivrée par le Tribunal (en 3 ex : 1 orig + 2 photocopies)',
          estObligatoire: true,
          categorie: 'Protection Juridique',
          instruction: 'Nomination officielle du tuteur.',
        },
        {
          codePiece: 'ACTE_NAISSANCE_MINEURS',
          intitule: 'Acte de naissance de chaque enfant mineur (en 3 ex : 1 orig + 2 photocopies)',
          estObligatoire: true,
          categorie: 'Filiation',
          instruction: 'Acte conforme.',
        },
        {
          codePiece: 'CERTIF_VIE_COLLECTIF',
          intitule: 'Certificat de vie collectif des enfants mineurs (en 3 ex : 1 orig + 2 photocopies)',
          estObligatoire: true,
          categorie: 'État Civil Mineurs',
          instruction: 'Preuve de vie des mineurs.',
        },
        {
          codePiece: 'CIN_DEMANDEUR_CERTIFIEE',
          intitule: 'Photocopie CIN certifiée du tuteur(ice) (en 3 ex : 1 orig + 2 photocopies)',
          estObligatoire: true,
          categorie: 'Identification',
          instruction: 'CIN légalisée.',
        },
        {
          codePiece: 'BULLETIN_SOLDE',
          intitule: 'Photocopie Avis de crédit/Bulletin de solde/Bon de caisse du mois de décès certifiée et bien lisible (en 3 ex : 1 orig + 2 photocopies)',
          estObligatoire: true,
          categorie: 'Situation Financière',
          instruction: 'Dernière solde perçue.',
        },
        {
          codePiece: 'CERTIF_CESSATION_PAIEMENT',
          intitule: 'Certificat de Cessation de Paiement (CCP) (en 3 ex : 1 orig + 2 photocopies)',
          estObligatoire: true,
          categorie: 'Situation Financière',
          instruction: 'Fait foi pour la liquidation.'
        }
      );
    }

    // F. Cas 6 : Enfants infirmes / handicapés
    else if (enfantsHandicapes || lienDemandeur === 'ENFANT_MAJEUR') {
      pieces.push(
        {
          codePiece: 'DEMANDE_TIMBREE',
          intitule: 'Demande formulée par le tuteur des enfants infirmes avec adresse exacte et numéro de téléphone (en 3 ex : 1 orig + 2 photocopies)',
          estObligatoire: true,
          categorie: 'Demande',
          instruction: 'Établie par le tuteur désigné.',
        },
        {
          codePiece: 'ACTE_DECES',
          intitule: 'Acte de décès (en 3 ex : 1 orig + 2 photocopies)',
          estObligatoire: true,
          categorie: 'État Civil Défunt',
          instruction: 'Délivré par la mairie.',
        },
        {
          codePiece: 'ACTE_MARIAGE',
          intitule: 'Acte de mariage (en 3 ex : 1 orig + 2 photocopies)',
          estObligatoire: true,
          categorie: 'Lien Matrimonial',
          instruction: 'Attestant d’un mariage valide.',
        },
        {
          codePiece: 'CERTIF_NON_SEPARATION_CORPS',
          intitule: 'Certificat de non-séparation de corps et de non-divorce (en 3 ex : 1 orig + 2 photocopies)',
          estObligatoire: true,
          categorie: 'Lien Matrimonial',
          instruction: 'Délivré par la Commune ou Fokontany et certifié avec 2 témoins.',
        },
        {
          codePiece: 'ACTE_NOTORIETE',
          intitule: 'Acte de notoriété délivré par la Commune, le District ou le Notaire (en 3 ex : 1 orig + 2 photocopies)',
          estObligatoire: true,
          categorie: 'Succession',
          instruction: 'Preuve de la qualité de successeur.',
        },
        {
          codePiece: 'ORDONNANCE_TUTELLE',
          intitule: 'Ordonnance de tutelle délivrée par le Tribunal (en 3 ex : 1 orig + 2 photocopies)',
          estObligatoire: true,
          categorie: 'Protection Juridique',
          instruction: 'Tutelle requise pour l’enfant infirme.',
        },
        {
          codePiece: 'CERTIFICAT_MEDICAL_HANDICAP',
          intitule: 'Certificat médical délivré par un médecin d’État et Certificat Administratif du MSP de moins de 3 mois (en 3 ex : 1 orig + 2 photocopies)',
          estObligatoire: true,
          categorie: 'Enfant Handicapé / Infirme',
          instruction: 'Atteste l’incapacité définitive de subsister de ses propres moyens.',
        },
        {
          codePiece: 'ACTE_NAISSANCE_INFIRME',
          intitule: 'Acte de naissance de l’enfant infirme (en 3 ex : 1 orig + 2 photocopies)',
          estObligatoire: true,
          categorie: 'Filiation',
          instruction: 'Filiation légitime de l’infirme.',
        },
        {
          codePiece: 'CERTIF_VIE_ENFANT_INFIRME',
          intitule: 'Certificat de vie de l’enfant infirme (en 3 ex : 1 orig + 2 photocopies)',
          estObligatoire: true,
          categorie: 'État Civil Infirme',
          instruction: 'Délivré par l’arrondissement municipal.',
        },
        {
          codePiece: 'CIN_DEMANDEUR_CERTIFIEE',
          intitule: 'Photocopie CIN certifiée du tuteur (en 3 ex : 1 orig + 2 photocopies)',
          estObligatoire: true,
          categorie: 'Identification',
          instruction: 'Pièce légalisée.',
        },
        {
          codePiece: 'CERTIF_CHARGE_ET_GARDE',
          intitule: 'Certificat de charge et de garde (+ deux témoins) (en 3 ex : 1 orig + 2 photocopies)',
          estObligatoire: true,
          categorie: 'Garde légale',
          instruction: 'Certificat Fokontany.',
        },
        {
          codePiece: 'BULLETIN_SOLDE',
          intitule: 'Photocopie Avis de crédit / Bulletin de solde / Bon de caisse du mois de décès certifiée et bien lisible (en 3 ex : 1 orig + 2 photocopies)',
          estObligatoire: true,
          categorie: 'Situation Financière',
          instruction: 'Justificatif de solde.',
        },
        {
          codePiece: 'CERTIF_CESSATION_PAIEMENT',
          intitule: 'Certificat de Cessation de Paiement (CCP) (en 3 ex : 1 orig + 2 photocopies)',
          estObligatoire: true,
          categorie: 'Situation Financière',
          instruction: 'Certificat d’arrêt de paiement.'
        }
      );
    }

    // Default fallback si aucun
    else {
      pieces.push(
        {
          codePiece: 'DEMANDE_TIMBREE',
          intitule: 'Demande formulée avec adresse exacte et téléphone (en 3 ex : 1 orig + 2 photocopies)',
          estObligatoire: true,
          categorie: 'Demande',
          instruction: 'Signée par l’intéressé.',
        },
        {
          codePiece: 'ACTE_DECES',
          intitule: 'Acte de décès (en 3 ex : 1 orig + 2 photocopies)',
          estObligatoire: true,
          categorie: 'État Civil Défunt',
          instruction: 'Délivré par la mairie.',
        },
        {
          codePiece: 'ACTE_NOTORIETE',
          intitule: 'Acte de notoriété (en 3 ex : 1 orig + 2 photocopies)',
          estObligatoire: true,
          categorie: 'Succession',
          instruction: 'Délivré par le Tribunal.',
        },
        {
          codePiece: 'CIN_DEMANDEUR_CERTIFIEE',
          intitule: 'Photocopie de la CIN certifiée (en 3 ex : 1 orig + 2 photocopies)',
          estObligatoire: true,
          categorie: 'Identification',
          instruction: 'Légalisation.',
        },
        {
          codePiece: 'BULLETIN_SOLDE',
          intitule: 'Photocopie bulletin de solde du mois de décès (en 3 ex : 1 orig + 2 photocopies)',
          estObligatoire: true,
          categorie: 'Situation Financière',
          instruction: 'Justificatif de solde.',
        },
        {
          codePiece: 'CERTIF_CESSATION_PAIEMENT',
          intitule: 'Certificat de cessation de paiement (CCP) (en 3 ex : 1 orig + 2 photocopies)',
          estObligatoire: true,
          categorie: 'Situation Financière',
          instruction: 'Cessation obligatoire.'
        }
      );
    }

  } else {
    // -------------------------------------------------------------
    // SECOURS AUX DECES DES AGENTS RETRAITES DECEDES (sur pensions)
    // -------------------------------------------------------------

    // A. Pour le veuf / la veuve (pensionné)
    if (lienDemandeur === 'VEUF_VEUVE') {
      pieces.push(
        {
          codePiece: 'DEMANDE_TIMBREE',
          intitule: 'Demande formulée par le veuf/la veuve avec adresse exacte et numéro de téléphone (en 2 ex : 1 orig + 1 photocopie)',
          estObligatoire: true,
          categorie: 'Demande',
          instruction: 'Rédigée par le conjoint survivant.',
        },
        {
          codePiece: 'CERTIF_NON_SEPARATION_CORPS',
          intitule: 'Certificat de non-séparation de corps et de non-divorce (en 2 ex : 1 orig + 1 photocopie)',
          estObligatoire: true,
          categorie: 'Lien Matrimonial',
          instruction: 'Délivré ou certifié par la Commune / le Fokotany.',
        },
        {
          codePiece: 'ACTE_MARIAGE',
          intitule: 'Acte de mariage (en 2 ex : 1 orig + 1 photocopie)',
          estObligatoire: true,
          categorie: 'Lien Matrimonial',
          instruction: 'Lien de mariage civil actif au moment du décès.',
        },
        {
          codePiece: 'ACTE_DECES',
          intitule: 'Acte de décès (en 2 ex : 1 orig + 1 photocopie)',
          estObligatoire: true,
          categorie: 'État Civil Défunt',
          instruction: 'Preuve de décès de l’agent retraité.',
        },
        {
          codePiece: 'CIN_DEMANDEUR_CERTIFIEE',
          intitule: 'Photocopie de la CIN certifiée du veuf/la veuve (en 2 ex : 1 orig + 1 photocopie)',
          estObligatoire: true,
          categorie: 'Identification',
          instruction: 'CIN légalisée.',
        },
        {
          codePiece: 'BULLETIN_PENSION',
          intitule: 'Bulletin de pension ou, à défaut, un Certificat Administratif (en 2 ex : 1 orig + 1 photocopie)',
          estObligatoire: true,
          categorie: 'Situation Financière',
          instruction: 'Bulletin de pension de l’agent.',
        }
      );
    }

    // B. Pour les enfants mineurs (pensionné)
    else if (lienDemandeur === 'TUTEUR_ENFANT_MINEUR' || lienDemandeur === 'CELIBATAIRE_AVEC_MINEUR') {
      pieces.push(
        {
          codePiece: 'DEMANDE_TIMBREE',
          intitule: 'Demande formulée par le tuteur avec adresse et téléphone (en 2 ex : 1 orig + 1 photocopie)',
          estObligatoire: true,
          categorie: 'Demande',
          instruction: 'Signée par le tuteur légal.',
        },
        {
          codePiece: 'ACTE_DECES',
          intitule: 'Acte de décès de l’agent (en 2 ex : 1 orig + 1 photocopie)',
          estObligatoire: true,
          categorie: 'État Civil Défunt',
          instruction: 'Preuve de décès de l’agent.',
        },
        {
          codePiece: 'ACTE_DECES_CONJOINT_OU_DIVORCE',
          intitule: 'Acte de décès du conjoint de l’agent ou acte de divorce (en 2 ex : 1 orig + 1 photocopie)',
          estObligatoire: true,
          categorie: 'État Civil Conjoint',
          instruction: 'Prouve la vacance de conjoint.',
        },
        {
          codePiece: 'ORDONNANCE_TUTELLE',
          intitule: 'Ordonnance de tutelle des enfants mineurs délivrée par le Tribunal (en 2 ex : 1 orig + 1 photocopie)',
          estObligatoire: true,
          categorie: 'Protection Juridique',
          instruction: 'Tutelle homologuée par décision de justice.',
        },
        {
          codePiece: 'ACTE_NAISSANCE_MINEURS',
          intitule: 'Acte de naissance des enfants mineurs (en 2 ex : 1 orig + 1 photocopie)',
          estObligatoire: true,
          categorie: 'Filiation',
          instruction: 'Filiation certifiée conforme.',
        },
        {
          codePiece: 'CERTIF_VIE_COLLECTIF',
          intitule: 'Certificat de vie collectif des enfants mineurs (en 2 ex : 1 orig + 1 photocopie)',
          estObligatoire: true,
          categorie: 'État Civil Mineurs',
          instruction: 'Preuve d’existence physique des mineurs.',
        },
        {
          codePiece: 'CERTIF_NON_REMARIAGE_OU_CELIBAT_COMMUNE',
          intitule: 'Certificat de non-remariage ou certificat de célibat de l’agent décédé, délivré par la Commune (avec deux témoins) (en 2 ex : 1 orig + 1 photocopie)',
          estObligatoire: true,
          categorie: 'État Civil Défunt',
          instruction: 'Atteste du statut de célibat ou de non-remariage.',
        },
        {
          codePiece: 'CIN_DEMANDEUR_CERTIFIEE',
          intitule: 'Photocopie de la CIN certifiée du tuteur (en 2 ex : 1 orig + 1 photocopie)',
          estObligatoire: true,
          categorie: 'Identification',
          instruction: 'CIN conforme du tuteur.',
        },
        {
          codePiece: 'BULLETIN_PENSION',
          intitule: 'Bulletin de pension ou à défaut, Certificat Administratif (en 2 ex : 1 orig + 1 photocopie)',
          estObligatoire: true,
          categorie: 'Situation Financière',
          instruction: 'Titre de pension de retraite ou pension de décès.',
        }
      );
    }

    // C. Pour les enfants infirmes (pensionné)
    else if (enfantsHandicapes || lienDemandeur === 'ENFANT_MAJEUR') {
      pieces.push(
        {
          codePiece: 'DEMANDE_TIMBREE',
          intitule: 'Demande formulée et signée par le tuteur des enfants infirmes avec adresse exacte et téléphone (en 2 ex : 1 orig + 1 photocopie)',
          estObligatoire: true,
          categorie: 'Demande',
          instruction: 'Signée par le tuteur de l’infirme.',
        },
        {
          codePiece: 'ACTE_DECES',
          intitule: 'Acte de décès de l’agent (en 2 ex : 1 orig + 1 photocopie)',
          estObligatoire: true,
          categorie: 'État Civil Défunt',
          instruction: 'Décès de l’agent.',
        },
        {
          codePiece: 'ACTE_DECES_CONJOINT_OU_DIVORCE',
          intitule: 'Acte de décès du conjoint de l’agent ou acte de divorce (en 2 ex : 1 orig + 1 photocopie)',
          estObligatoire: true,
          categorie: 'État Civil Conjoint',
          instruction: 'Status du conjoint.',
        },
        {
          codePiece: 'CERTIF_VIE_ENFANT_INFIRME',
          intitule: 'Certificat de vie de l’enfant infirme (en 2 ex : 1 orig + 1 photocopie)',
          estObligatoire: true,
          categorie: 'État Civil Infirme',
          instruction: 'Vie de l’infirme.',
        },
        {
          codePiece: 'CERTIFICAT_MEDICAL_HANDICAP',
          intitule: 'Certificat médical délivré par un médecin d’État (en 2 ex : 1 orig + 1 photocopie)',
          estObligatoire: true,
          categorie: 'Enfant Handicapé / Infirme',
          instruction: 'Certificat constatant l’incapacité définitive.',
        },
        {
          codePiece: 'ACTE_NAISSANCE_INFIRME',
          intitule: 'Acte de naissance de l’enfant infirme (en 2 ex : 1 orig + 1 photocopie)',
          estObligatoire: true,
          categorie: 'Filiation',
          instruction: 'Filiation.',
        },
        {
          codePiece: 'CERTIF_NON_REMARIAGE_OU_CELIBAT_COMMUNE',
          intitule: 'Certificat de non-remariage ou certificat de célibat de l’agent décédé, délivré par la Commune (avec deux témoins) (en 2 ex : 1 orig + 1 photocopie)',
          estObligatoire: true,
          categorie: 'État Civil Défunt',
          instruction: 'Certificat communal officiel.',
        },
        {
          codePiece: 'BULLETIN_PENSION',
          intitule: 'Bulletin de pension récent à défaut de certificat administratif (en 2 ex : 1 orig + 1 photocopie)',
          estObligatoire: true,
          categorie: 'Situation Financière',
          instruction: 'Atteste de la pension.',
        },
        {
          codePiece: 'CIN_DEMANDEUR_CERTIFIEE',
          intitule: 'Photocopie CIN certifiée du tuteur (en 2 ex : 1 orig + 1 photocopie)',
          estObligatoire: true,
          categorie: 'Identification',
          instruction: 'CIN conforme légalisée.'
        }
      );
    }

    // Default fallback Retraite
    else {
      pieces.push(
        {
          codePiece: 'DEMANDE_TIMBREE',
          intitule: 'Demande formulée par le tuteur / héritier (en 2 ex : 1 orig + 1 photocopie)',
          estObligatoire: true,
          categorie: 'Demande',
          instruction: 'Rédigée et signée par le demandeur.',
        },
        {
          codePiece: 'ACTE_DECES',
          intitule: 'Acte de décès (en 2 ex : 1 orig + 1 photocopie)',
          estObligatoire: true,
          categorie: 'État Civil Défunt',
          instruction: 'Mairie de décès.',
        },
        {
          codePiece: 'BULLETIN_PENSION',
          intitule: 'Bulletin de pension ou à défaut, Certificat Administratif (en 2 ex : 1 orig + 1 photocopie)',
          estObligatoire: true,
          categorie: 'Situation Financière',
          instruction: 'Prouve le versement effectif de pension.',
        },
        {
          codePiece: 'CIN_DEMANDEUR_CERTIFIEE',
          intitule: 'Photocopie de la CIN certifiée (en 2 ex : 1 orig + 1 photocopie)',
          estObligatoire: true,
          categorie: 'Identification',
          instruction: 'Identité certifiée.'
        }
      );
    }
  }

  return pieces;
}
