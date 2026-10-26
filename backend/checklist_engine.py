"""
Moteur de Check-list Dynamique de Contrôle des Pièces Justificatives
Règlementation Secours aux Décès sur Pension
"""

from typing import List, Dict, Any


def generer_checklist_requise(
    statut_defunt: str,              # "ACTIVITE" ou "RETRAITE_PENSIONNE"
    lien_demandeur: str,             # "VEUF_VEUVE", "TUTEUR_ENFANT_MINEUR", "CELIBATAIRE_AVEC_MINEUR", etc.
    cas_complexes: List[str] = None, # ["DEUX_PARENTS_DECES", "PLURALITE_LITS", "DIVORCE"]
    enfants_handicapes: bool = False,
    nb_enfants_mineurs: int = 0
) -> List[Dict[str, Any]]:
    """
    Génère la liste exacte des pièces justificatives obligatoires et facultatives
    selon la situation juridique du défunt et du demandeur.
    """
    if cas_complexes is None:
        cas_complexes = []

    checklist = []

    # -------------------------------------------------------------
    # 1. PIÈCES FONDAMENTALES COMMUNES (Tous les dossiers)
    # -------------------------------------------------------------
    checklist.append({
        "code_piece": "DEMANDE_CHEF_SERVICE",
        "intitule": "Demande manuscrite timbrée adressée au Chef de service / Ministre",
        "est_obligatoire": True,
        "categorie": "Général",
        "instruction": "Doit être signée par le demandeur légitime avec coordonnées complètes."
    })

    checklist.append({
        "code_piece": "ACTE_DECES",
        "intitule": "Acte de décès légalisé de l'agent",
        "est_obligatoire": True,
        "categorie": "État Civil Défunt",
        "instruction": "Délivré par le Firaisana / Mairie du lieu de décès ou de transcription."
    })

    # Pièce financière selon statut d'activité
    if statut_defunt == "RETRAITE_PENSIONNE":
        checklist.append({
            "code_piece": "BULLETIN_PENSION",
            "intitule": "Titre de pension ou Bulletin de pension du mois de décès",
            "est_obligatoire": True,
            "categorie": "Situation Financière",
            "instruction": "Justifiant la liquidation effective des droits à la pension de retraite."
        })
    else:  # ACTIVITE
        checklist.append({
            "code_piece": "BULLETIN_SOLDE",
            "intitule": "Bulletin de solde du mois de décès (ou certificat de cessation de paiement)",
            "est_obligatoire": True,
            "categorie": "Situation Financière",
            "instruction": "Délivré par le Ministère employeur ou la Direction de la Solde."
        })

    # -------------------------------------------------------------
    # 2. SELON LE LIEN DU DEMANDEUR
    # -------------------------------------------------------------

    # Cas A.1 : VEUF / VEUVE
    if lien_demandeur == "VEUF_VEUVE":
        checklist.extend([
            {
                "code_piece": "ACTE_MARIAGE",
                "intitule": "Acte de mariage civil (copie intégrale délivrée depuis moins de 3 mois)",
                "est_obligatoire": True,
                "categorie": "Lien Matrimonial",
                "instruction": "Doit attester du mariage civil non dissous avant la date du décès."
            },
            {
                "code_piece": "CERTIF_NON_SEPARATION_CORPS",
                "intitule": "Certificat de non-séparation de corps et de non-divorce (Firaisana)",
                "est_obligatoire": True,
                "categorie": "Lien Matrimonial",
                "instruction": "Délivré par les autorités municipales (Firaisana) du domicile conjugal."
            },
            {
                "code_piece": "ACTE_NOTORIETE",
                "intitule": "Acte de Notoriété constatant la qualité d'héritier / conjoint survivant",
                "est_obligatoire": True,
                "categorie": "Succession",
                "instruction": "Établi par le Tribunal de Première Instance ou acte notarié."
            },
            {
                "code_piece": "CIN_DEMANDEUR_CERTIFIEE",
                "intitule": "Copie de la Carte d'Identité Nationale certifiée du veuf/veuve",
                "est_obligatoire": True,
                "categorie": "Identification",
                "instruction": "Certification conforme de moins de 6 mois."
            }
        ])

    # Cas A.2 : TUTEUR D'ENFANT(S) MINEUR(S)
    elif lien_demandeur == "TUTEUR_ENFANT_MINEUR":
        checklist.extend([
            {
                "code_piece": "ORDONNANCE_TUTELLE",
                "intitule": "Ordonnance de tutelle délivrée par le Tribunal de Première Instance",
                "est_obligatoire": True,
                "categorie": "Protection Juridique",
                "instruction": "Désignation légale du tuteur pour administrer les biens des mineurs."
            },
            {
                "code_piece": "ACTE_NAISSANCE_MINEURS",
                "intitule": f"Acte(s) de naissance des enfants à charge (< 21 ans) [Total: {nb_enfants_mineurs or 'Mineurs'}]",
                "est_obligatoire": True,
                "categorie": "Filiation",
                "instruction": "Attestant de la filiation avec l'agent décédé et de l'âge inférieur à 21 ans."
            },
            {
                "code_piece": "CERTIF_VIE_COLLECTIF",
                "intitule": "Certificat de vie collectif des enfants à charge (Firaisana)",
                "est_obligatoire": True,
                "categorie": "État Civil",
                "instruction": "Attestation récente délivrée par le Fokontany et visée par le Firaisana."
            },
            {
                "code_piece": "CIN_TUTEUR_CERTIFIEE",
                "intitule": "Copie certifiée de la CIN du tuteur légal",
                "est_obligatoire": True,
                "categorie": "Identification",
                "instruction": "En cours de validité."
            }
        ])

    # Cas A.3 : CÉLIBATAIRE AVEC ENFANT(S) MINEUR(S)
    elif lien_demandeur == "CELIBATAIRE_AVEC_MINEUR":
        checklist.extend([
            {
                "code_piece": "CERTIF_CELIBAT",
                "intitule": "Certificat de célibat du défunt (Firaisana / Fokontany)",
                "est_obligatoire": True,
                "categorie": "État Civil Défunt",
                "instruction": "Prouvant l'absence de conjoint survivant ayant droit."
            },
            {
                "code_piece": "ACTE_NOTORIETE",
                "intitule": "Acte de Notoriété héréditaire",
                "est_obligatoire": True,
                "categorie": "Succession",
                "instruction": "Délivré par le Tribunal de Première Instance."
            },
            {
                "code_piece": "ORDONNANCE_TUTELLE",
                "intitule": "Ordonnance de tutelle légale délivrée par le Tribunal",
                "est_obligatoire": True,
                "categorie": "Protection Juridique",
                "instruction": "Désignation du tuteur d'instance."
            },
            {
                "code_piece": "ACTE_NAISSANCE_RECONNAISSANCE",
                "intitule": "Actes de naissance & Actes de reconnaissance des enfants",
                "est_obligatoire": True,
                "categorie": "Filiation",
                "instruction": "Mention expresse de la reconnaissance par le père/mère défunt(e)."
            },
            {
                "code_piece": "CERTIF_VIE_COLLECTIF",
                "intitule": "Certificat de vie collectif des orphelins",
                "est_obligatoire": True,
                "categorie": "État Civil",
                "instruction": "Délivré par la Commune / Firaisana."
            },
            {
                "code_piece": "CERTIF_CHARGE_ET_GARDE",
                "intitule": "Certificat de charge effective et de garde des enfants",
                "est_obligatoire": True,
                "categorie": "Prise en charge",
                "instruction": "Établi par le chef Fokontany et légalisé par l'autorité administrative."
            },
            {
                "code_piece": "CERTIF_CESSATION_PAIEMENT",
                "intitule": "Certificat de cessation de paiement de secours aux décès antérieurs",
                "est_obligatoire": True,
                "categorie": "Non-cumul",
                "instruction": "Attestation de non-double mandatement du secours."
            },
            {
                "code_piece": "CIN_TUTEUR_CERTIFIEE",
                "intitule": "Copie certifiée de la CIN du tuteur / demandeur",
                "est_obligatoire": True,
                "categorie": "Identification",
                "instruction": "Pièce d'identité officielle légalisée."
            }
        ])

    # Autres cas généraux
    else:
        checklist.extend([
            {
                "code_piece": "ACTE_NOTORIETE",
                "intitule": "Acte de Notoriété héréditaire",
                "est_obligatoire": True,
                "categorie": "Succession",
                "instruction": "Établissant la qualité d'ayant droit direct."
            },
            {
                "code_piece": "CIN_DEMANDEUR_CERTIFIEE",
                "intitule": "Copie certifiée conforme de la CIN du demandeur",
                "est_obligatoire": True,
                "categorie": "Identification",
                "instruction": "Légalisée par la Commune."
            }
        ])

    # -------------------------------------------------------------
    # 3. CAS PARTICULIERS ET COMPLEXES
    # -------------------------------------------------------------

    # Cas complexe : Deux parents décédés
    if "DEUX_PARENTS_DECES" in cas_complexes:
        checklist.append({
            "code_piece": "ACTE_DECES_SECOND_PARENT",
            "intitule": "Acte de décès du second parent (père et mère décédés)",
            "est_obligatoire": True,
            "categorie": "Cas Complexe - Orphelin Total",
            "instruction": "Permet l'attribution intégrale des droits aux orphelins sous tutelle."
        })

    # Cas complexe : Pluralité de lits
    if "PLURALITE_LITS" in cas_complexes:
        checklist.append({
            "code_piece": "JUGEMENT_PLURALITE_LITS",
            "intitule": "Actes d'état civil des différents lits et protocole de répartition ou tutelle multiple",
            "est_obligatoire": True,
            "categorie": "Cas Complexe - Pluralité de Lits",
            "instruction": "Vérification des filiations de chaque lit pour le partage équitable des secours."
        })

    # Cas complexe : Défunt Divorcé
    if "DIVORCE" in cas_complexes:
        checklist.append({
            "code_piece": "JUGEMENT_DIVORCE",
            "intitule": "Grosse du Jugement de divorce définitif avec certificat de non-appel",
            "est_obligatoire": True,
            "categorie": "Cas Complexe - Divorce",
            "instruction": "Atteste de l'extinction des droits du conjoint et fixe la garde des mineurs."
        })

    # Cas particulier B : Enfant majeur handicapé
    if enfants_handicapes:
        checklist.append({
            "code_piece": "CERTIFICAT_MEDICAL_HANDICAP",
            "intitule": "Certificat médical d'incapacité permanente délivré par la Commission Médicale Agréée",
            "est_obligatoire": True,
            "categorie": "Enfant Handicapé",
            "instruction": "Constatant l'incapacité absolue et définitive de subvenir à ses besoins (> 21 ans)."
        })

    # Pièce bancaire recommandée pour mandatement
    checklist.append({
        "code_piece": "RIB_BANCAIRE_OU_TRESOR",
        "intitule": "Relevé d'Identité Bancaire (RIB) ou Attestation de compte au Trésor Public",
        "est_obligatoire": True,
        "categorie": "Paiement / Trésor",
        "instruction": "Au nom exclusif du bénéficiaire ou du tuteur légal pour virement du mandat."
    })

    return checklist
