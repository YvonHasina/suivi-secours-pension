import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  FileSpreadsheet,
  User,
  Users,
  Building2,
  Calendar,
  CreditCard,
  CheckCircle2,
  XCircle,
  Clock,
  Send,
  AlertTriangle,
  FileCheck,
  FileText,
  ShieldCheck,
  Edit3,
  Trash2,
  Lock,
  ArrowRight,
  ShieldAlert,
  Plus,
  RotateCcw,
} from 'lucide-react';
import { DossierSecours, StatutPiece, UserRole, StatutWorkflow, CoDemandeur, LienParente } from '../types';
import { DossierStorageService, computeTotalEntitlement, getSecoursMultiplier } from '../services/dossierStorage';
import { WorkflowValidationService, WorkflowActionType } from '../services/workflowValidation';

interface DossierDetailModalProps {
  dossier: DossierSecours;
  activeRole: UserRole;
  onClose: () => void;
  onOpenWorkflowAction: (action: WorkflowActionType) => void;
  onEdit?: (dossier: DossierSecours) => void;
  onDelete?: (dossier: DossierSecours) => void;
}

export const DossierDetailModal: React.FC<DossierDetailModalProps> = ({
  dossier,
  activeRole,
  onClose,
  onOpenWorkflowAction,
  onEdit,
  onDelete,
}) => {
  const [currentDossier, setCurrentDossier] = useState(dossier);
  const [activeTab, setActiveTab] = useState<'pieces' | 'defunt' | 'audit' | 'docs' | 'auto'>('pieces');
  const [selectedDoc, setSelectedDoc] = useState<'fiche' | 'bordereau'>('fiche');
  const [editingDeadline, setEditingDeadline] = useState(false);
  const [deadlineInput, setDeadlineInput] = useState(currentDossier.dateDelaiComplet || '');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectMotifInput, setRejectMotifInput] = useState(
    currentDossier.motifRejet || `N.B. / Cause du rejet : Délai réglementaire de régularisation des pièces incomplètes dépassé (Échéance fixée au ${currentDossier.dateDelaiComplet || 'non spécifiée'}).`
  );

  const [autoSuccessMessage, setAutoSuccessMessage] = useState<string>('');

  const [showAddCoForm, setShowAddCoForm] = useState(false);
  const [coNom, setCoNom] = useState('');
  const [coPrenoms, setCoPrenoms] = useState('');
  const [coCin, setCoCin] = useState('');
  const [coLien, setCoLien] = useState<'CONJOINT_DIVORCE' | 'CONJOINT_ACTUEL' | LienParente>('CONJOINT_DIVORCE');
  const [coPart, setCoPart] = useState(50);

  const [showAddPieceForm, setShowAddPieceForm] = useState(false);
  const [newPieceIntitule, setNewPieceIntitule] = useState('');
  const [newPieceCategorie, setNewPieceCategorie] = useState('ADMINISTRATIF');
  const [newPieceInstruction, setNewPieceInstruction] = useState('');

  const handleAddCustomPiece = () => {
    if (!canEditPieces || !newPieceIntitule.trim()) return;
    const success = DossierStorageService.addCustomPiece(currentDossier.id, {
      intitule: newPieceIntitule.trim(),
      categorie: newPieceCategorie,
      instruction: newPieceInstruction.trim() || undefined,
    });
    if (success) {
      const updated = DossierStorageService.getDossierById(currentDossier.id);
      if (updated) setCurrentDossier(updated);
      setNewPieceIntitule('');
      setNewPieceInstruction('');
      setShowAddPieceForm(false);
    }
  };

  useEffect(() => {
    setCurrentDossier(dossier);
    setDeadlineInput(dossier.dateDelaiComplet || '');
    setRejectMotifInput(
      dossier.motifRejet || `N.B. / Cause du rejet : Délai réglementaire de régularisation des pièces incomplètes dépassé (Échéance fixée au ${dossier.dateDelaiComplet || 'non spécifiée'}).`
    );
  }, [dossier]);

  const aEteVise =
    !!currentDossier.numVisaCf ||
    !!currentDossier.numDecision ||
    !!currentDossier.dateVisaCf ||
    currentDossier.statut === 'VALIDE_CF' ||
    currentDossier.statut === 'ENGAGE';

  // Après le visa du CF : l'Agent et le Comptable peuvent modifier les statuts des pièces
  // Avant le visa du CF : seul l'Agent d'enquête (et Admin) peut modifier les statuts des pièces
  const canEditPieces =
    currentDossier.statut !== 'MANDATE' &&
    activeRole === 'AGENT';
  const canEditCoDemandeurs = activeRole === 'AGENT' && currentDossier.statut !== 'VALIDE_CF' && currentDossier.statut !== 'MANDATE';

  const coDemandeursList = useMemo(() => currentDossier.coDemandeurs || [], [currentDossier]);
  const totalCoPercentage = useMemo(() => coDemandeursList.reduce((acc, c) => acc + c.partPourcentage, 0), [coDemandeursList]);
  const primaryPercentage = 100 - totalCoPercentage;
  const isSplitValid = primaryPercentage >= 0 && primaryPercentage <= 100;

  const baseSal = currentDossier.defunt.salaireDeBase || 0;
  const totalEntitlement = computeTotalEntitlement(currentDossier.defunt, currentDossier.montantSecours);

  const handleAddCoDemandeur = () => {
    if (!canEditCoDemandeurs) return;
    if (!coNom || !coPrenoms || !coCin) return;

    const newCo: CoDemandeur = {
      id: `co-${Date.now()}`,
      nom: coNom,
      prenoms: coPrenoms,
      cin: coCin,
      lienParente: coLien,
      partPourcentage: 0,
      partMontant: 0,
    };

    const updatedCos = [...coDemandeursList, newCo];
    const totalClaimants = 1 + updatedCos.length;
    const equalPct = Math.round(100 / totalClaimants);
    const equalAmount = Math.round(totalEntitlement / totalClaimants);

    const normalizedCos = updatedCos.map(c => ({
      ...c,
      partPourcentage: equalPct,
      partMontant: equalAmount
    }));

    const newPrimaryAmount = totalEntitlement - (equalAmount * normalizedCos.length);

    const updatedDossier = {
      ...currentDossier,
      coDemandeurs: normalizedCos,
      montantSecours: newPrimaryAmount,
      situationComplexe: (currentDossier.situationComplexe === 'AUCUN' || !currentDossier.situationComplexe) 
        ? 'DIVORCE' as const 
        : currentDossier.situationComplexe
    };

    DossierStorageService.updateDossier(updatedDossier);
    setCurrentDossier(updatedDossier);

    // Reset Form
    setCoNom('');
    setCoPrenoms('');
    setCoCin('');
    setCoPart(10);
    setShowAddCoForm(false);

    // Add log
    DossierStorageService.addAuditLog({
      dossierId: currentDossier.id,
      dossierNumero: currentDossier.numeroDossier,
      userRole: activeRole,
      userNom: 'Utilisateur',
      userEmail: 'user@dps.gov.mg',
      action: 'AJOUT_CO_DEMANDEUR',
      details: `Ajout du co-bénéficiaire ${newCo.nom} ${newCo.prenoms} (${newCo.lienParente}). Montant divisé automatiquement pour ${totalClaimants} ayants droit.`
    });
  };

  const handleDeleteCoDemandeur = (coId: string) => {
    if (!canEditCoDemandeurs) return;

    const updatedCos = coDemandeursList.filter(c => c.id !== coId);
    const totalClaimants = 1 + updatedCos.length;
    const equalPct = totalClaimants > 0 ? Math.round(100 / totalClaimants) : 100;
    const equalAmount = totalClaimants > 0 ? Math.round(totalEntitlement / totalClaimants) : totalEntitlement;

    const normalizedCos = updatedCos.map(c => ({
      ...c,
      partPourcentage: equalPct,
      partMontant: equalAmount
    }));

    const newPrimaryAmount = totalEntitlement - (equalAmount * normalizedCos.length);

    const updatedDossier = {
      ...currentDossier,
      coDemandeurs: normalizedCos,
      montantSecours: newPrimaryAmount,
    };

    DossierStorageService.updateDossier(updatedDossier);
    setCurrentDossier(updatedDossier);

    // Add log
    DossierStorageService.addAuditLog({
      dossierId: currentDossier.id,
      dossierNumero: currentDossier.numeroDossier,
      userRole: activeRole,
      userNom: 'Utilisateur',
      userEmail: 'user@dps.gov.mg',
      action: 'SUPP_CO_DEMANDEUR',
      details: `Suppression d'un co-bénéficiaire du dossier.`
    });
  };

  const handleDetachCoDemandeurAsDossier = (co: CoDemandeur) => {
    if (!canEditCoDemandeurs) return;
    const allDossiers = DossierStorageService.getDossiers();
    const newNumero = `2026-${String(allDossiers.length + 101).padStart(3, '0')}`;
    
    const newDossier: DossierSecours = {
      id: `dossier-${Date.now()}`,
      numeroDossier: newNumero,
      dateArrivee: new Date().toISOString().split('T')[0],
      defunt: { ...currentDossier.defunt },
      demandeur: {
        nom: co.nom,
        prenoms: co.prenoms,
        lienParente: co.lienParente === 'CONJOINT_DIVORCE' ? 'VEUF_VEUVE' : 'AUTRE_AYANT_DROIT',
        cin: co.cin,
        adresse: co.adresse,
        telephone: co.telephone
      },
      enfants: [],
      pieces: currentDossier.pieces.map(p => ({ ...p, id: `p-${Math.random()}`, statut: 'NON_FOURNIE' })),
      statut: 'RECEPTION_EN_COURS',
      montantSecours: co.partMontant,
      situationComplexe: 'DIVORCE',
      observations: `Dossier détaché suite à la scission de part (${co.partPourcentage}% / ${co.partMontant.toLocaleString()} Ar) du dossier initial ${currentDossier.numeroDossier}.`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    DossierStorageService.addDossier(newDossier);

    const updatedCos = coDemandeursList.filter(c => c.id !== co.id);
    const updatedDossier = {
      ...currentDossier,
      coDemandeurs: updatedCos,
    };
    DossierStorageService.updateDossier(updatedDossier);
    setCurrentDossier(updatedDossier);

    DossierStorageService.addAuditLog({
      dossierId: currentDossier.id,
      dossierNumero: currentDossier.numeroDossier,
      userRole: activeRole,
      userNom: 'Utilisateur',
      userEmail: 'user@dps.gov.mg',
      action: 'SCISSION_DOSSIER_CO_DEMANDEUR',
      details: `Détachement du co-réclamant ${co.nom} ${co.prenoms} (${co.partPourcentage}%) vers le nouveau dossier indépendant N° ${newNumero}.`
    });

    setAutoSuccessMessage(`Succès : Le co-réclamant a été détaché dans un nouveau dossier indépendant N° ${newNumero} (${co.partMontant.toLocaleString()} Ar), prêt à suivre son propre circuit CF.`);
    setTimeout(() => setAutoSuccessMessage(''), 6000);
  };

  const handleChangeSituationComplexe = (situation: 'DEUX_PARENTS_DECES' | 'PLURALITE_LITS' | 'DIVORCE' | 'AUCUN') => {
    if (!canEditCoDemandeurs) return;
    const updatedDossier = {
      ...currentDossier,
      situationComplexe: situation,
    };
    DossierStorageService.updateDossier(updatedDossier);
    setCurrentDossier(updatedDossier);

    // Add log
    DossierStorageService.addAuditLog({
      dossierId: currentDossier.id,
      dossierNumero: currentDossier.numeroDossier,
      userRole: activeRole,
      userNom: 'Utilisateur',
      userEmail: 'user@dps.gov.mg',
      action: 'CHANGEMENT_COMPLEXITE',
      details: `Modification de la situation complexe du dossier : ${situation}.`
    });
  };

  const handleChangeCoPercentage = (coId: string, value: number) => {
    if (!canEditCoDemandeurs) return;
    const baseSal = currentDossier.defunt.salaireDeBase || 0;
    const isActif = currentDossier.defunt.statutActivite === 'ACTIVITE';
    const totalEntitlement = isActif ? baseSal * 12 : baseSal * 3;

    const updatedCos = coDemandeursList.map(c => {
      if (c.id === coId) {
        return {
          ...c,
          partPourcentage: value,
          partMontant: Math.round((value / 100) * totalEntitlement)
        };
      }
      return c;
    });

    const newTotalCoPct = updatedCos.reduce((acc, c) => acc + c.partPourcentage, 0);
    const newPrimaryPct = 100 - newTotalCoPct;
    const newPrimaryAmount = Math.max(0, Math.round((newPrimaryPct / 100) * totalEntitlement));

    const updatedDossier = {
      ...currentDossier,
      coDemandeurs: updatedCos,
      montantSecours: newPrimaryAmount,
    };

    DossierStorageService.updateDossier(updatedDossier);
    setCurrentDossier(updatedDossier);
  };

  const handleTogglePiece = (pieceId: string, currentStatut: StatutPiece) => {
    if (!canEditPieces) return;
    let nextStatut: StatutPiece = 'CONFORME';
    if (currentStatut === 'CONFORME') nextStatut = 'NON_CONFORME';
    else if (currentStatut === 'NON_CONFORME') nextStatut = 'NON_FOURNIE';
    else nextStatut = 'CONFORME';

    DossierStorageService.updatePieceStatus(currentDossier.id, pieceId, nextStatut);
    const updated = DossierStorageService.getDossierById(currentDossier.id);
    if (updated) setCurrentDossier(updated);
  };

  const handleSaveDeadline = () => {
    DossierStorageService.setDossierDeadline(currentDossier.id, deadlineInput);
    const updated = DossierStorageService.getDossierById(currentDossier.id);
    if (updated) setCurrentDossier(updated);
    setEditingDeadline(false);
  };

  const handleConfirmReject = () => {
    if (!rejectMotifInput.trim()) return;
    DossierStorageService.rejectDossierByDeadline(currentDossier.id, rejectMotifInput.trim());
    const updated = DossierStorageService.getDossierById(currentDossier.id);
    if (updated) setCurrentDossier(updated);
    setShowRejectModal(false);
  };

  const isDeadlineExceeded = useMemo(() => {
    if (!currentDossier.dateDelaiComplet) return false;
    const today = new Date().toISOString().split('T')[0];
    return currentDossier.dateDelaiComplet < today && currentDossier.statut === 'DOSSIER_INCOMPLET';
  }, [currentDossier]);

  const obligatoires = currentDossier.pieces.filter((p) => p.estObligatoire);
  const conformes = obligatoires.filter((p) => p.statut === 'CONFORME').length;
  const pctConforme = Math.round((conformes / obligatoires.length) * 100);

  // Workflow validation checks
  const workflowProgress = useMemo(
    () => WorkflowValidationService.getDossierWorkflowProgress(currentDossier),
    [currentDossier]
  );
  const checkEnvoi = useMemo(() => {
    const defaultCheck = WorkflowValidationService.canExecuteWorkflowAction(currentDossier, 'ENVOI_CF', activeRole);
    if (!isSplitValid) {
      return { allowed: false, reason: "La répartition des parts entre bénéficiaires est déséquilibrée (somme ≠ 100%)." };
    }
    return defaultCheck;
  }, [currentDossier, activeRole, isSplitValid]);

  const checkCf = useMemo(() => {
    const defaultCheck = WorkflowValidationService.canExecuteWorkflowAction(currentDossier, 'DECISION_CF', activeRole);
    if (!isSplitValid) {
      return { allowed: false, reason: "La répartition des parts entre bénéficiaires est déséquilibrée (somme ≠ 100%)." };
    }
    return defaultCheck;
  }, [currentDossier, activeRole, isSplitValid]);

  const checkMandat = useMemo(() => {
    const defaultCheck = WorkflowValidationService.canExecuteWorkflowAction(currentDossier, 'MANDATEMENT', activeRole);
    if (!isSplitValid) {
      return { allowed: false, reason: "La répartition des parts entre bénéficiaires est déséquilibrée (somme ≠ 100%)." };
    }
    return defaultCheck;
  }, [currentDossier, activeRole, isSplitValid]);

  const getStatusBadge = (statut: string) => {
    switch (statut) {
      case 'MANDATE':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'VALIDE_CF':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'TRANSMIS_CF':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'REJETE_CF':
        return 'bg-rose-100 text-rose-800 border-rose-200';
      case 'ENQUETE_CONFORME':
        return 'bg-teal-100 text-teal-800 border-teal-200';
      case 'DOSSIER_INCOMPLET':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const auditLogs = DossierStorageService.getAuditLogs().filter(
    (l) => l.dossierId === currentDossier.id || l.dossierNumero === currentDossier.numeroDossier
  );

  const handlePrint = () => {
    const isFiche = selectedDoc === 'fiche';
    const numDossier = currentDossier.numeroDossier;
    const dateToday = new Date().toLocaleDateString('fr-FR');
    
    const piecesRows = currentDossier.pieces
      .map((p, idx) => `
        <tr>
          <td style="text-align: center; border: 1px solid #000; padding: 6px;">${idx + 1}</td>
          <td style="border: 1px solid #000; padding: 6px;"><strong>${p.intitule}</strong></td>
          <td style="text-align: center; border: 1px solid #000; padding: 6px;">${p.estObligatoire ? 'Oui' : 'Non'}</td>
          <td style="text-align: center; border: 1px solid #000; padding: 6px; font-weight: bold; color: ${p.statut === 'CONFORME' || p.statut === 'VALIDE' ? 'green' : 'red'};">
            ${p.statut === 'CONFORME' || p.statut === 'VALIDE' ? 'Fournie / Conforme' : 'Non conforme / Manquante'}
          </td>
        </tr>
      `).join('');

    const contentHtml = isFiche ? `
      <div style="font-family: 'Courier New', Courier, monospace; line-height: 1.6; max-width: 800px; margin: 0 auto; color: #000;">
        <div style="text-align: center; margin-bottom: 25px;">
          <h3 style="margin: 0; font-size: 16px; letter-spacing: 1px; text-transform: uppercase;">REPOBLIKAN'I MADAGASIKARA</h3>
          <p style="margin: 3px 0 0; font-size: 11px; font-style: italic;">Fitiavana - Tanindrazana - Fandrosoana</p>
          <div style="width: 80px; height: 1px; background: #000; margin: 8px auto;"></div>
          <p style="margin: 2px 0; font-size: 11px; font-weight: bold;">MINISTÈRE DE L'ÉCONOMIE ET DES FINANCES</p>
          <p style="margin: 2px 0; font-size: 11px;">DIRECTION GÉNÉRALE DES OPÉRATIONS FINANCIÈRES</p>
          <p style="margin: 2px 0; font-size: 11px; font-weight: bold; text-decoration: underline;">DIRECTION DES PENSIONS ET DE LA SOLDE</p>
          <p style="margin: 2px 0; font-size: 10px;">Service des Secours et Allocations Décès</p>
        </div>

        <div style="text-align: center; border: 2px solid #000; padding: 12px; margin: 25px 0; background: #f9f9f9;">
          <h2 style="margin: 0; font-size: 18px; text-transform: uppercase; font-weight: bold; letter-spacing: 0.5px;">
            FICHE DE LIQUIDATION DE SECOURS AUX DÉCÈS
          </h2>
          <p style="margin: 5px 0 0; font-size: 13px; font-weight: bold; font-family: monospace;">
            N° : REG-${numDossier} / DPS / DPS.4
          </p>
        </div>

        <div style="margin-bottom: 25px;">
          <h3 style="margin: 0 0 10px; font-size: 13px; text-transform: uppercase; font-weight: bold; border-bottom: 1px solid #000; padding-bottom: 3px;">
            I. RENSEIGNEMENTS SUR L'AGENT DÉFUNT
          </h3>
          <table style="width: 100%; font-size: 12px; border-collapse: collapse;">
            <tr>
              <td style="width: 40%; padding: 4px 0; color: #555;">NOM ET PRÉNOMS :</td>
              <td style="font-weight: bold; padding: 4px 0;">${currentDossier.defunt.nom.toUpperCase()} ${currentDossier.defunt.prenoms}</td>
            </tr>
            <tr>
              <td style="padding: 4px 0; color: #555;">INDICE MATRICULE (IM) :</td>
              <td style="font-weight: bold; font-family: monospace; padding: 4px 0; text-decoration: underline;">${currentDossier.defunt.im}</td>
            </tr>
            <tr>
              <td style="padding: 4px 0; color: #555;">SITUATION D'ACTIVITÉ :</td>
              <td style="font-weight: bold; padding: 4px 0;">${currentDossier.defunt.statutActivite === 'ACTIVITE' ? 'EN ACTIVITÉ DE SERVICE' : 'RETRAITÉ / PENSIONNÉ'}</td>
            </tr>
            <tr>
              <td style="padding: 4px 0; color: #555;">MINISTÈRE D'ORIGINE :</td>
              <td style="padding: 4px 0;">${currentDossier.defunt.ministereInstitution || 'NON SPÉCIFIÉ'}</td>
            </tr>
            <tr>
              <td style="padding: 4px 0; color: #555;">CORPS ET GRADE :</td>
              <td style="padding: 4px 0;">${currentDossier.defunt.corpsAppartenance || '—'} / Grade: ${currentDossier.defunt.dernierGrade || '—'}</td>
            </tr>
            <tr>
              <td style="padding: 4px 0; color: #555;">DATE ET LIEU DE DÉCÈS :</td>
              <td style="font-weight: bold; padding: 4px 0;">Décédé le ${currentDossier.defunt.dateDeces} à ${currentDossier.defunt.lieuDeces || '—'}</td>
            </tr>
          </table>
        </div>

        <div style="margin-bottom: 25px;">
          <h3 style="margin: 0 0 10px; font-size: 13px; text-transform: uppercase; font-weight: bold; border-bottom: 1px solid #000; padding-bottom: 3px;">
            II. RENSEIGNEMENTS SUR LE BÉNÉFICIAIRE (DEMANDEUR)
          </h3>
          <table style="width: 100%; font-size: 12px; border-collapse: collapse;">
            <tr>
              <td style="width: 40%; padding: 4px 0; color: #555;">NOM ET PRÉNOMS :</td>
              <td style="font-weight: bold; padding: 4px 0;">${currentDossier.demandeur.nom.toUpperCase()} ${currentDossier.demandeur.prenoms}</td>
            </tr>
            <tr>
              <td style="padding: 4px 0; color: #555;">LIEN DE PARENTÉ :</td>
              <td style="font-weight: bold; padding: 4px 0;">${currentDossier.demandeur.lienParente.replace(/_/g, ' ')}</td>
            </tr>
            <tr>
              <td style="padding: 4px 0; color: #555;">CARTE D'IDENTITÉ NATIONALE (CIN) :</td>
              <td style="font-family: monospace; padding: 4px 0;">N° ${currentDossier.demandeur.cin} du ${currentDossier.demandeur.dateDelivranceCin || '—'} à ${currentDossier.demandeur.lieuDelivranceCin || '—'}</td>
            </tr>
            <tr>
              <td style="padding: 4px 0; color: #555;">PART ÉCOULÉE (%) :</td>
              <td style="font-weight: bold; font-family: monospace; padding: 4px 0;">${100 - (currentDossier.coDemandeurs || []).reduce((acc, c) => acc + c.partPourcentage, 0)}% (soit ${Math.round((100 - (currentDossier.coDemandeurs || []).reduce((acc, c) => acc + c.partPourcentage, 0)) / 100 * 500000).toLocaleString()} Ar)</td>
            </tr>
          </table>

          ${currentDossier.coDemandeurs && currentDossier.coDemandeurs.length > 0 ? `
            <div style="margin-top: 10px; padding: 10px; border: 1px dashed #000; background-color: #fafafa; font-size: 11px;">
              <p style="margin: 0 0 8px; font-weight: bold; text-transform: uppercase;">Co-bénéficiaires et parts de paiement (Arbitrage de divorce/litige) :</p>
              <table style="width: 100%; border-collapse: collapse;">
                <thead>
                  <tr style="border-bottom: 1px solid #000;">
                    <th style="text-align: left; padding: 3px;">Nom et Prénoms</th>
                    <th style="text-align: left; padding: 3px;">Qualité</th>
                    <th style="text-align: left; padding: 3px;">N° CIN</th>
                    <th style="text-align: right; padding: 3px;">Part %</th>
                    <th style="text-align: right; padding: 3px;">Montant Ar</th>
                  </tr>
                </thead>
                <tbody>
                  ${currentDossier.coDemandeurs.map(co => `
                    <tr>
                      <td style="padding: 3px;">${co.nom.toUpperCase()} ${co.prenoms}</td>
                      <td style="padding: 3px;">${co.lienParente.replace(/_/g, ' ')}</td>
                      <td style="padding: 3px; font-family: monospace;">${co.cin}</td>
                      <td style="text-align: right; padding: 3px; font-weight: bold;">${co.partPourcentage}%</td>
                      <td style="text-align: right; padding: 3px; font-weight: bold; font-family: monospace;">${co.partMontant.toLocaleString()} Ar</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          ` : ''}
        </div>

        <div style="margin-bottom: 30px;">
          <h3 style="margin: 0 0 10px; font-size: 13px; text-transform: uppercase; font-weight: bold; border-bottom: 1px solid #000; padding-bottom: 3px;">
            III. LIQUIDATION FINANCIÈRE RÉGLEMENTAIRE
          </h3>
          <div style="border: 1px solid #000; padding: 10px; font-size: 12px;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 6px; border-bottom: 1px dashed #ddd; padding-bottom: 4px;">
              <span>Libellé de l'Allocation :</span>
              <strong style="text-decoration: underline;">SECOURS AUX DÉCÈS (MANDATEMENT DIRECT)</strong>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 6px; border-bottom: 1px dashed #ddd; padding-bottom: 4px;">
              <span>Référence Tarifaire :</span>
              <span>Décret ministériel et Taux standard</span>
            </div>
            <div style="display: flex; justify-content: space-between; border-top: 1px dashed #000; padding-top: 8px; font-size: 14px;">
              <span>MONTANT DE L'OCTROI :</span>
              <strong style="font-size: 16px; font-family: monospace; text-decoration: underline; color: #000;">
                ${(Number(currentDossier.montantSecours) || 500000).toLocaleString()} ARIARY
              </strong>
            </div>
          </div>
        </div>

        <div style="font-size: 11px; text-align: right; margin-bottom: 30px; font-style: italic;">
          Antananarivo, le ${dateToday}
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 40px; font-size: 11px; margin-top: 40px; text-align: center;">
          <div>
            <p style="font-weight: bold; margin: 0 0 45px; text-decoration: underline;">L'AGENT INSTRUCTEUR (DPS)</p>
            <p style="margin: 0; font-style: italic; color: #777;">(Signature et nom d'agent)</p>
          </div>
          <div>
            <p style="font-weight: bold; margin: 0 0 45px; text-decoration: underline;">LE DIRECTEUR DES PENSIONS ET DE LA SOLDE</p>
            <p style="margin: 0; font-style: italic; color: #777;">(Visa, Cachet et Signature)</p>
          </div>
        </div>
      </div>
    ` : `
      <div style="font-family: 'Courier New', Courier, monospace; line-height: 1.6; max-width: 800px; margin: 0 auto; color: #000;">
        <div style="text-align: center; margin-bottom: 25px;">
          <h3 style="margin: 0; font-size: 16px; letter-spacing: 1px; text-transform: uppercase;">REPOBLIKAN'I MADAGASIKARA</h3>
          <p style="margin: 3px 0 0; font-size: 11px; font-style: italic;">Fitiavana - Tanindrazana - Fandrosoana</p>
          <div style="width: 80px; height: 1px; background: #000; margin: 8px auto;"></div>
          <p style="margin: 2px 0; font-size: 11px; font-weight: bold;">MINISTÈRE DE L'ÉCONOMIE ET DES FINANCES</p>
          <p style="margin: 2px 0; font-size: 11px;">DIRECTION GÉNÉRALE DES OPÉRATIONS FINANCIÈRES</p>
          <p style="margin: 2px 0; font-size: 11px; font-weight: bold; text-decoration: underline;">DIRECTION DES PENSIONS ET DE LA SOLDE</p>
          <p style="margin: 2px 0; font-size: 10px;">Service des Secours et Allocations Décès</p>
        </div>

        <div style="text-align: center; border: 2px solid #000; padding: 12px; margin: 25px 0;">
          <h2 style="margin: 0; font-size: 16px; text-transform: uppercase; font-weight: bold;">
            BORDEREAU D'ENVOI DES PIÈCES JUSTIFICATIVES
          </h2>
          <p style="margin: 5px 0 0; font-size: 12px;">
            A l'attention de : <strong>MONSIEUR LE CONTROLEUR FINANCIER (MEF)</strong>
          </p>
          <p style="margin: 2px 0 0; font-size: 12px; font-family: monospace;">
            Dossier de référence : REG-${numDossier} / DPS
          </p>
        </div>

        <div style="margin-bottom: 20px; font-size: 12px;">
          <p style="margin: 0 0 8px;"><strong>Objet :</strong> Transmission du dossier de secours décès de l'agent <strong>${currentDossier.defunt.nom.toUpperCase()} ${currentDossier.defunt.prenoms} (IM: ${currentDossier.defunt.im})</strong> pour visa réglementaire.</p>
          <p style="margin: 0 0 15px;">Le Service des Secours certifie avoir contrôlé et validé la conformité matérielle des pièces justificatives listées ci-après :</p>
        </div>

        <table style="width: 100%; font-size: 11px; border-collapse: collapse; margin-bottom: 30px;">
          <thead>
            <tr style="background: #f2f2f2;">
              <th style="border: 1px solid #000; padding: 6px; text-align: center; width: 8%;">N°</th>
              <th style="border: 1px solid #000; padding: 6px; text-align: left; width: 52%;">INTITULÉ DE LA PIÈCE EXIGÉE</th>
              <th style="border: 1px solid #000; padding: 6px; text-align: center; width: 15%;">OBLIGATOIRE</th>
              <th style="border: 1px solid #000; padding: 6px; text-align: center; width: 25%;">STATUT CONSTATÉ</th>
            </tr>
          </thead>
          <tbody>
            ${piecesRows}
          </tbody>
        </table>

        <div style="border: 1px dashed #000; padding: 10px; font-size: 11px; margin-bottom: 30px;">
          <p style="margin: 0 0 4px; font-weight: bold; text-decoration: underline;">OBSERVATIONS DE L'AGENT INSTRUCTEUR :</p>
          <p style="margin: 0; font-style: italic;">${currentDossier.observations || 'Le dossier est complet, certifié conforme et transmis pour visa du Contrôle Financier.'}</p>
        </div>

        <div style="font-size: 11px; text-align: right; margin-bottom: 30px; font-style: italic;">
          Fait à Antananarivo, le ${dateToday}
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 40px; font-size: 11px; margin-top: 40px; text-align: center;">
          <div>
            <p style="font-weight: bold; margin: 0 0 45px; text-decoration: underline;">L'AGENT INSTRUCTEUR (DPS)</p>
            <p style="margin: 0; font-style: italic; color: #777;">(Visa, Cachet et Signature)</p>
          </div>
          <div>
            <p style="font-weight: bold; margin: 0 0 45px; text-decoration: underline;">LE CONTROLEUR FINANCIER (CF)</p>
            <p style="margin: 0; font-style: italic; color: #777;">(Date, Visa et Cachet)</p>
          </div>
        </div>
      </div>
    `;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Impression Officielle - DPS</title>
            <style>
              @page { size: A4; margin: 15mm; }
              body { font-family: 'Courier New', Courier, monospace, sans-serif; padding: 15px; color: #000; background: #fff; }
              table { width: 100%; border-collapse: collapse; }
              th, td { border: 1px solid #000; padding: 6px; text-align: left; }
              @media print {
                body { padding: 0; }
              }
            </style>
          </head>
          <body onload="window.print();">
            ${contentHtml}
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  // Automated Diagnostics calculation for the Dossier
  const getAutonomousDiagnostics = () => {
    const missingObligatory: string[] = [];
    const incorrectObligatory: string[] = [];
    const validObligatory: string[] = [];
    const totalObligatory = currentDossier.pieces.filter(p => p.estObligatoire);

    totalObligatory.forEach(p => {
      if (p.statut === 'NON_FOURNIE') {
        missingObligatory.push(p.intitule);
      } else if (p.statut === 'NON_CONFORME') {
        incorrectObligatory.push(p.intitule);
      } else if (p.statut === 'CONFORME') {
        validObligatory.push(p.intitule);
      }
    });

    const complianceRate = totalObligatory.length > 0 
      ? Math.round((validObligatory.length / totalObligatory.length) * 100) 
      : 100;

    // Checks et Anomalies detected automatically
    const anomalies: string[] = [];
    
    // Check 1: Activity vs Pension status
    if (currentDossier.defunt.statutActivite === 'RETRAITE_PENSIONNE') {
      const hasPensionTitre = currentDossier.pieces.some(p => 
        (p.codePiece.toLowerCase().includes('pension') || p.intitule.toLowerCase().includes('pension')) && p.statut === 'CONFORME'
      );
      if (!hasPensionTitre) {
        anomalies.push("L'agent défunt est déclaré RETRAITÉ mais aucun titre ou brevet de pension n'est marqué comme Conforme.");
      }
    } else {
      const hasBulletin = currentDossier.pieces.some(p => 
        (p.codePiece.toLowerCase().includes('solde') || p.intitule.toLowerCase().includes('bulletin')) && p.statut === 'CONFORME'
      );
      if (!hasBulletin) {
        anomalies.push("L'agent défunt est en ACTIVITÉ mais son dernier bulletin de solde n'est pas validé comme Conforme.");
      }
    }

    // Check 2: Financial rate Check
    const baseSal = currentDossier.defunt.salaireDeBase || 0;
    if (baseSal <= 0) {
      anomalies.push("Le salaire de base du défunt n'est pas renseigné, ce qui empêche le calcul automatique du montant du secours.");
    }

    // Check 3: Complex Situations
    if (currentDossier.situationComplexe && currentDossier.situationComplexe !== 'AUCUN') {
      anomalies.push(`Situation de complexité détectée (${currentDossier.situationComplexe}). Le dossier requiert un audit rigoureux de tutelle ou de lits.`);
    }

    // Check 4: Age/Guardian
    const hasMinorEnfants = currentDossier.enfants.some(e => e.estMineur);
    if (hasMinorEnfants && currentDossier.demandeur.lienParente === 'TUTEUR_ENFANT_MINEUR') {
      const hasTutelle = currentDossier.pieces.some(p => 
        (p.codePiece.toLowerCase().includes('tutelle') || p.intitule.toLowerCase().includes('tutelle')) && p.statut === 'CONFORME'
      );
      if (!hasTutelle) {
        anomalies.push("Présence d'enfants mineurs sous tutelle, mais l'acte de tutelle réglementaire n'est pas encore marqué comme Conforme.");
      }
    }

    return {
      complianceRate,
      missingCount: missingObligatory.length,
      incorrectCount: incorrectObligatory.length,
      validCount: validObligatory.length,
      totalCount: totalObligatory.length,
      missingObligatory,
      incorrectObligatory,
      validObligatory,
      anomalies
    };
  };

  // Run autonomous instruction (Robot execution)
  const handleRunAutoInstruction = () => {
    setAutoSuccessMessage('');
    
    // Auto-update all mandatory pieces that are NOT_FOURNIE/NON_CONFORME to CONFORME
    const updatedPieces = currentDossier.pieces.map(p => {
      if (p.estObligatoire && p.statut !== 'CONFORME') {
        return { 
          ...p, 
          statut: 'CONFORME' as StatutPiece, 
          remarque: 'Vérifié automatiquement par le module d’Auto-Instruction' 
        };
      }
      return p;
    });

    const updatedDossier = {
      ...currentDossier,
      pieces: updatedPieces,
      montantSecours: 500000,
      statut: 'ENQUETE_CONFORME' as StatutWorkflow,
      observations: `[Auto-Instruction Robotisée] Traitement automatique de régularisation effectué le ${new Date().toLocaleDateString('fr-FR')}. Complétude portée à 100%. Montant fixé à 500 000 Ariary.`
    };

    DossierStorageService.updateDossier(updatedDossier);
    setCurrentDossier(updatedDossier);
    
    // Log the audit event
    DossierStorageService.addAuditLog({
      dossierId: currentDossier.id,
      dossierNumero: currentDossier.numeroDossier,
      userRole: activeRole,
      userNom: 'Robot d\'Instruction Autonome',
      userEmail: 'system-robot@dps.gov.mg',
      action: 'AUTO_INSTRUCTION',
      details: 'Régularisation automatique des pièces obligatoires, fixation du montant à 500 000 Ar et passage du statut à ENQUETE_CONFORME.'
    });

    setAutoSuccessMessage("L'auto-instruction a été exécutée avec succès ! Toutes les pièces obligatoires ont été validées comme conformes, le montant a été régularisé à 500 000 Ar (taux légal), et le dossier est passé au statut 'Enquête Conforme'.");
  };

  return (
    <div
      id="dossier-detail-modal-backdrop"
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-150"
    >
      <div
        id="dossier-detail-modal-box"
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center font-bold">
              {currentDossier.numeroDossier.slice(-4)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-tight">
                  Dossier {currentDossier.numeroDossier}
                </h2>
                <span
                  className={`px-2 py-0.5 rounded-full text-[11px] font-bold border ${getStatusBadge(
                    currentDossier.statut
                  )}`}
                >
                  {currentDossier.statut.replace(/_/g, ' ')}
                </span>
              </div>
              <p className="text-xs text-slate-300">
                Agent Défunt IM : <span className="font-mono font-semibold text-blue-300">{currentDossier.defunt.im}</span> — {currentDossier.defunt.nom} {currentDossier.defunt.prenoms}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onEdit && (
              <button
                onClick={() => onEdit(currentDossier)}
                className="px-3 py-1.5 text-xs font-bold text-slate-200 bg-slate-800 hover:bg-slate-700 hover:text-white rounded-xl border border-slate-700 shadow-2xs flex items-center gap-1.5 transition-all"
                title="Modifier les données de ce dossier"
              >
                <Edit3 className="w-3.5 h-3.5 text-blue-400" />
                <span className="hidden sm:inline">Modifier</span>
              </button>
            )}

            {onDelete && activeRole === 'AGENT' && (
              <button
                onClick={() => onDelete(currentDossier)}
                className="px-3 py-1.5 text-xs font-bold text-rose-300 bg-rose-950/60 hover:bg-rose-900/80 hover:text-white rounded-xl border border-rose-800/80 shadow-2xs flex items-center gap-1.5 transition-all"
                title="Supprimer définitivement ce dossier"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                <span className="hidden sm:inline">Supprimer</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 8 Excel Columns Summary Ribbon */}
        <div className="bg-slate-50 border-b border-slate-200 p-4">
          <div className="flex items-center gap-2 mb-2 text-xs font-bold text-slate-700 uppercase tracking-wider">
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Synthèse Réglementaire — 8 Colonnes Excel</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2 text-center text-xs">
            <div className="p-2 bg-white rounded-lg border border-slate-200 shadow-2xs">
              <span className="block text-[10px] text-slate-600 font-semibold uppercase">1. Arrivée</span>
              <span className="font-bold text-slate-800">{currentDossier.dateArrivee || '—'}</span>
            </div>

            <div className="p-2 bg-white rounded-lg border border-slate-200 shadow-2xs">
              <span className="block text-[10px] text-slate-600 font-semibold uppercase">2. Bénéficiaire</span>
              <span className="font-bold text-slate-800 truncate block" title={currentDossier.demandeur.nom}>
                {currentDossier.demandeur.nom}
              </span>
            </div>

            <div className="p-2 bg-white rounded-lg border border-slate-200 shadow-2xs">
              <span className="block text-[10px] text-slate-600 font-semibold uppercase">3. Noms Défunt</span>
              <span className="font-bold text-slate-800 truncate block" title={currentDossier.defunt.nom}>
                {currentDossier.defunt.nom}
              </span>
            </div>

            <div className="p-2 bg-white rounded-lg border border-slate-200 shadow-2xs">
              <span className="block text-[10px] text-slate-600 font-semibold uppercase">4. IM</span>
              <span className="font-bold font-mono text-blue-600">{currentDossier.defunt.im}</span>
            </div>

            <div className="p-2 bg-white rounded-lg border border-slate-200 shadow-2xs">
              <span className="block text-[10px] text-slate-600 font-semibold uppercase">5. Envoi CF</span>
              <span className="font-bold text-slate-800">{currentDossier.dateEnvoiCf || '—'}</span>
            </div>

            <div className="p-2 bg-white rounded-lg border border-slate-200 shadow-2xs">
              <span className="block text-[10px] text-slate-600 font-semibold uppercase">6. Visa et Décision</span>
              <div className="flex flex-col gap-0.5">
                <span className={`font-bold font-mono text-[11px] truncate ${currentDossier.numVisaCf ? 'text-emerald-700' : 'text-slate-600'}`} title={currentDossier.numVisaCf ? `Visa CF: ${currentDossier.numVisaCf}` : 'En attente Visa CF'}>
                  {currentDossier.numVisaCf ? `VCF: ${currentDossier.numVisaCf}` : 'Visa : —'}
                </span>
                <span className={`font-bold font-mono text-[11px] truncate ${currentDossier.numDecision ? 'text-blue-700' : 'text-slate-600'}`} title={currentDossier.numDecision ? `Décision: ${currentDossier.numDecision}` : 'Décision non saisie'}>
                  {currentDossier.numDecision ? `Déc: ${currentDossier.numDecision}` : 'Déc : —'}
                </span>
              </div>
            </div>

            <div className="p-2 bg-white rounded-lg border border-slate-200 shadow-2xs">
              <span className="block text-[10px] text-slate-600 font-semibold uppercase">7. Mandat et Prix</span>
              <span className={`font-bold text-xs block ${currentDossier.dateMandatement ? 'text-purple-700' : 'text-slate-600'}`}>
                {currentDossier.dateMandatement || '—'}
              </span>
              {currentDossier.dateMandatement && (
                <span className="text-[10px] font-bold text-emerald-700 block font-mono">
                  {(currentDossier.montantSecours || 500000).toLocaleString()} Ar
                </span>
              )}
            </div>

            <div className="p-2 bg-white rounded-lg border border-slate-200 shadow-2xs">
              <span className="block text-[10px] text-slate-600 font-semibold uppercase">8. Motif Rejet</span>
              <span
                className={`font-medium text-[11px] truncate block ${
                  currentDossier.motifRejet ? 'text-rose-600 font-bold' : 'text-slate-600'
                }`}
                title={currentDossier.motifRejet || 'Aucun rejet'}
              >
                {currentDossier.motifRejet || 'Néant'}
              </span>
            </div>
          </div>
        </div>

        {/* Workflow Progression Stepper (Enforcement of Sequential Procedure) */}
        <div className="bg-slate-100/70 border-b border-slate-200 px-6 py-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700">
                Procédure Réglementaire Séquentielle (Priorités par Étape)
              </span>
            </div>
            <span className="text-[11px] text-slate-600 font-medium">
              Progression : <strong className="text-slate-900">{workflowProgress.filter(s => s.status === 'COMPLETED').length}/4 étapes</strong>
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
            {workflowProgress.map((step) => {
              const isCompleted = step.status === 'COMPLETED';
              const isCurrent = step.status === 'IN_PROGRESS';
              const isBlocked = step.status === 'LOCKED';
              const isRejected = step.status === 'REJECTED';

              return (
                <div
                  key={step.stepNumber}
                  className={`p-2.5 rounded-xl border transition-all ${
                    isCompleted
                      ? 'bg-emerald-50/80 border-emerald-200 text-emerald-950'
                      : isRejected
                      ? 'bg-rose-50/80 border-rose-200 text-rose-950'
                      : isCurrent
                      ? 'bg-blue-50/80 border-blue-300 text-blue-950 ring-2 ring-blue-500/20'
                      : isBlocked
                      ? 'bg-slate-50 border-slate-200 text-slate-600 opacity-80'
                      : 'bg-white border-slate-200 text-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-bold uppercase tracking-wide">
                      Étape {step.stepNumber}
                    </span>
                    {isCompleted && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />}
                    {isRejected && <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />}
                    {isCurrent && <Clock className="w-4 h-4 text-blue-600 shrink-0 animate-pulse" />}
                    {isBlocked && <Lock className="w-3.5 h-3.5 text-slate-500 shrink-0" />}
                  </div>

                  <div className="text-xs font-bold truncate" title={step.label}>
                    {step.label}
                  </div>
                  <div className="text-[11px] font-semibold text-slate-600 truncate mt-0.5" title={step.roleResponsable}>
                    {step.roleResponsable}
                  </div>

                  <div className="mt-1.5 pt-1.5 border-t border-slate-200/60 text-[10px] leading-tight">
                    {isCompleted && (
                      <span className="text-emerald-800 font-semibold flex items-center gap-1">
                        ✓ {step.stepNumber === 1 && '100% pièces conformes'}
                        {step.stepNumber === 2 && `Transmis le ${currentDossier.dateEnvoiCf || '—'}`}
                        {step.stepNumber === 3 && `Visa CF N° ${currentDossier.numVisaCf || currentDossier.numDecision || 'Accordé'}${currentDossier.numDecision ? ` | Décision N° ${currentDossier.numDecision}` : ''}`}
                        {step.stepNumber === 4 && (currentDossier.numMandat ? `Mandaté N° ${currentDossier.numMandat}` : `Mandaté le ${currentDossier.dateMandatement || 'Effectué'}`)}
                      </span>
                    )}
                    {isRejected && (
                      <span className="text-rose-800 font-semibold flex items-center gap-1">
                        ✕ Rejeté : {currentDossier.motifRejet || 'Motif non précisé'}
                      </span>
                    )}
                    {isCurrent && (
                      <span className="text-blue-800 font-semibold">
                        {step.stepNumber === 1 && `${conformes}/${obligatoires.length} pièces prêtes`}
                        {step.stepNumber === 2 && 'Prêt pour transmission CF'}
                        {step.stepNumber === 3 && 'En instance de visa CF'}
                        {step.stepNumber === 4 && 'Prêt pour mandatement'}
                      </span>
                    )}
                    {isBlocked && (
                      <span className="text-slate-500 italic flex items-center gap-1">
                        <Lock className="w-2.5 h-2.5" />
                        Bloquée (Étape {step.stepNumber - 1} requise)
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Navigation Tabs inside Modal */}
        <div className="px-6 border-b border-slate-200 flex items-center gap-6 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('pieces')}
            className={`py-3 border-b-2 flex items-center gap-1.5 transition-colors ${
              activeTab === 'pieces'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <FileCheck className="w-4 h-4" />
            <span>Contrôle Pièces ({conformes}/{obligatoires.length} conformes)</span>
          </button>

          <button
            onClick={() => setActiveTab('defunt')}
            className={`py-3 border-b-2 flex items-center gap-1.5 transition-colors ${
              activeTab === 'defunt'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <User className="w-4 h-4" />
            <span>Fiche État Civil et Famille</span>
          </button>

          <button
            onClick={() => setActiveTab('audit')}
            className={`py-3 border-b-2 flex items-center gap-1.5 transition-colors ${
              activeTab === 'audit'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>Historique et Audit ({auditLogs.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('docs')}
            className={`py-3 border-b-2 flex items-center gap-1.5 transition-colors ${
              activeTab === 'docs'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <FileText className="w-4 h-4 text-blue-600" />
            <span className="text-blue-700 font-bold">Actes et Fiches Officielles 📄</span>
          </button>

          <button
            onClick={() => setActiveTab('auto')}
            className={`py-3 border-b-2 flex items-center gap-1.5 transition-colors ${
              activeTab === 'auto'
                ? 'border-indigo-600 text-indigo-600 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <ShieldCheck className="w-4 h-4 text-indigo-600" />
            <span className="text-indigo-700 font-bold">Audit et Auto-Instruction 🤖</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* TAB 1: PIECES JUSTIFICATIVES */}
          {activeTab === 'pieces' && (
            <div className="space-y-4">
              {/* Progress Bar */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <div className="flex items-center justify-between text-xs mb-1.5 font-semibold text-slate-700">
                  <span>Conformité des pièces obligatoires requises :</span>
                  <span className={pctConforme === 100 ? 'text-emerald-700 font-bold' : 'text-blue-700'}>
                    {conformes} / {obligatoires.length} ({pctConforme}%)
                  </span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ${
                      pctConforme === 100 ? 'bg-emerald-500' : 'bg-blue-600'
                    }`}
                    style={{ width: `${pctConforme}%` }}
                  />
                </div>
                {canEditPieces ? (
                  <div className="flex items-center justify-between mt-2 flex-wrap gap-2">
                    <p className="text-[11px] text-slate-500 italic">
                      Astuce : Cliquez sur le statut d’une pièce pour la faire basculer (Conforme → Non conforme → Non fournie).
                    </p>
                    {aEteVise && (
                      <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 inline-flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        Après visa CF : Modification autorisée pour l'Agent et le Comptable
                      </span>
                    )}
                  </div>

                ) : currentDossier.statut === 'MANDATE' ? (
                  <div className="flex items-center gap-2 mt-2.5 p-2.5 bg-slate-100 border border-slate-200 rounded-lg text-[11px] text-slate-600">
                    <Lock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>Dossier mandaté et clôturé : les pièces justificatives sont archivées en lecture seule.</span>
                  </div>
                ) : null}
              </div>

              {/* Délai de Traitement et Régularisation (Dossier Incomplet) */}
              <div className="p-4 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-amber-500 text-white flex items-center justify-center font-bold shadow-2xs">
                      ⏱️
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900">
                        Délai de Traitement / Régularisation (Dossier Incomplet)
                      </h4>
                      <p className="text-[11px] text-slate-600">
                        {currentDossier.dateDelaiComplet
                          ? `Échéance fixée au : ${currentDossier.dateDelaiComplet} ${isDeadlineExceeded ? '(DÉPASSEMENT DE DÉLAI)' : ''}`
                          : 'Aucun délai limite de régularisation défini pour ce dossier.'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {canEditPieces && !editingDeadline && (
                      <button
                        onClick={() => { setEditingDeadline(true); setDeadlineInput(currentDossier.dateDelaiComplet || ''); }}
                        className="px-3 py-1.5 text-xs font-bold text-amber-900 bg-amber-100 hover:bg-amber-200 rounded-lg border border-amber-300 transition-colors"
                      >
                        {currentDossier.dateDelaiComplet ? 'Modifier le délai' : 'Fixer un délai limite'}
                      </button>
                    )}

                    {canEditPieces && currentDossier.statut !== 'MANDATE' && currentDossier.statut !== 'VALIDE_CF' && (
                      <button
                        onClick={() => setShowRejectModal(true)}
                        className="px-3 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-sm transition-colors flex items-center gap-1"
                        title="Rejeter le dossier en raison du dépassement du délai de traitement"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        <span>Rejeter (Délai dépassé)</span>
                      </button>
                    )}
                  </div>
                </div>

                {editingDeadline && (
                  <div className="pt-2 border-t border-amber-200/80 flex items-center gap-2">
                    <input
                      type="date"
                      value={deadlineInput}
                      onChange={(e) => setDeadlineInput(e.target.value)}
                      className="text-xs bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-slate-900"
                    />
                    <button
                      onClick={handleSaveDeadline}
                      className="px-3 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-2xs"
                    >
                      Enregistrer
                    </button>
                    <button
                      onClick={() => setEditingDeadline(false)}
                      className="px-3 py-1.5 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg"
                    >
                      Annuler
                    </button>
                  </div>
                )}

                {isDeadlineExceeded && (
                  <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800 font-semibold flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>Attention : Le délai limite de régularisation est dépassé ! Vous pouvez rejeter le dossier dès à présent.</span>
                  </div>
                )}
              </div>

              {/* Add Custom Mandatory Piece Button et Form */}
              {canEditPieces && currentDossier.statut !== 'MANDATE' && (
                <div className="flex items-center justify-between pb-1">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Liste des Pièces Justificatives ({currentDossier.pieces.length})
                  </h4>
                  <button
                    type="button"
                    onClick={() => setShowAddPieceForm(!showAddPieceForm)}
                    className="px-3 py-1.5 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-xl border border-blue-200 flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Ajouter une pièce obligatoire</span>
                  </button>
                </div>
              )}

              {showAddPieceForm && (
                <div className="p-4 bg-blue-50/70 border border-blue-200 rounded-2xl space-y-3 animate-fadeIn">
                  <div className="flex items-center justify-between">
                    <h5 className="text-xs font-bold text-blue-900 flex items-center gap-1.5">
                      <FileText className="w-4 h-4 text-blue-600" />
                      <span>Ajouter une nouvelle pièce à fournir (automatiquement obligatoire)</span>
                    </h5>
                    <button
                      onClick={() => setShowAddPieceForm(false)}
                      className="text-xs text-slate-400 hover:text-slate-600 font-semibold"
                    >
                      Annuler
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Intitulé de la pièce *</label>
                      <input
                        type="text"
                        value={newPieceIntitule}
                        onChange={(e) => setNewPieceIntitule(e.target.value)}
                        placeholder="Ex: Certificat de non-remariage, Attestation..."
                        className="w-full text-xs bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Catégorie</label>
                      <select
                        value={newPieceCategorie}
                        onChange={(e) => setNewPieceCategorie(e.target.value)}
                        className="w-full text-xs bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="ADMINISTRATIF">Administratif</option>
                        <option value="CIVIL">État Civil</option>
                        <option value="FINANCIER">Financier / Solde</option>
                        <option value="MEDICAL">Médical</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Instruction / Remarque</label>
                    <input
                      type="text"
                      value={newPieceInstruction}
                      onChange={(e) => setNewPieceInstruction(e.target.value)}
                      placeholder="Ex: À fournir sous 15 jours."
                      className="w-full text-xs bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setShowAddPieceForm(false)}
                      className="px-3 py-1.5 text-xs font-semibold text-slate-600 bg-white hover:bg-slate-100 rounded-xl border border-slate-300"
                    >
                      Annuler
                    </button>
                    <button
                      type="button"
                      onClick={handleAddCustomPiece}
                      disabled={!newPieceIntitule.trim()}
                      className="px-4 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-55 rounded-xl shadow-sm transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Sauvegarder et rendre obligatoire</span>
                    </button>
                  </div>
                </div>
              )}

              {/* List of Pieces */}
              <div className="space-y-2">
                {currentDossier.pieces.map((piece) => {
                  return (
                    <div
                      key={piece.id}
                      className="p-3 bg-white border border-slate-200 rounded-xl hover:border-slate-300 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600 uppercase">
                            {piece.categorie}
                          </span>
                          {piece.estObligatoire && (
                            <span className="text-[10px] font-semibold text-rose-600">Obligatoire</span>
                          )}
                        </div>
                        <h4 className="text-xs font-bold text-slate-900 mt-1">
                          {piece.intitule}
                        </h4>
                        {piece.instruction && (
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            {piece.instruction}
                          </p>
                        )}
                        {piece.remarque && (
                          <p className="text-[11px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded mt-1 inline-block border border-amber-200">
                            Note : {piece.remarque}
                          </p>
                        )}
                      </div>

                      {/* Status Button */}
                      <div className="shrink-0 flex items-center gap-2">
                        {canEditPieces ? (
                          <button
                            type="button"
                            onClick={() => handleTogglePiece(piece.id, piece.statut)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                              piece.statut === 'CONFORME'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-300 hover:bg-emerald-100'
                                : piece.statut === 'NON_CONFORME'
                                ? 'bg-rose-50 text-rose-700 border border-rose-300 hover:bg-rose-100'
                                : 'bg-slate-100 text-slate-600 border border-slate-300 hover:bg-slate-200'
                            }`}
                            title="Cliquer pour changer l'état de conformité de cette pièce"
                          >
                            {piece.statut === 'CONFORME' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
                            {piece.statut === 'NON_CONFORME' && <XCircle className="w-3.5 h-3.5 text-rose-600" />}
                            {piece.statut === 'NON_FOURNIE' && <Clock className="w-3.5 h-3.5 text-slate-400" />}
                            <span>{piece.statut.replace(/_/g, ' ')}</span>
                          </button>
                        ) : (
                          <div
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 select-none cursor-not-allowed opacity-90 ${
                              piece.statut === 'CONFORME'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-300'
                                : piece.statut === 'NON_CONFORME'
                                ? 'bg-rose-50 text-rose-700 border border-rose-300'
                                : 'bg-slate-100 text-slate-600 border border-slate-300'
                            }`}
                            title={
                              currentDossier.statut === 'MANDATE'
                                ? 'Dossier mandaté et clôturé : pièces archivées en lecture seule'
                                : "Modification des pièces verrouillée à cette étape du circuit"
                            }
                          >
                            {piece.statut === 'CONFORME' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
                            {piece.statut === 'NON_CONFORME' && <XCircle className="w-3.5 h-3.5 text-rose-600" />}
                            {piece.statut === 'NON_FOURNIE' && <Clock className="w-3.5 h-3.5 text-slate-400" />}
                            <span>{piece.statut.replace(/_/g, ' ')}</span>
                            <Lock className="w-3 h-3 text-slate-400 ml-0.5" />
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 2: DEFUNT ET DEMANDEUR */}
          {activeTab === 'defunt' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Agent Défunt Card */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-900 pb-2 border-b border-slate-200">
                  <User className="w-4 h-4 text-blue-600" />
                  <span>Informations de l'Agent Décédé</span>
                </div>
                <div className="text-xs space-y-1.5">
                  <div>
                    <span className="text-slate-500 block text-[11px]">Indice Matricule (IM) :</span>
                    <span className="font-mono font-bold text-slate-900 text-sm">{currentDossier.defunt.im}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[11px]">Noms et Prénoms :</span>
                    <span className="font-semibold text-slate-900">{currentDossier.defunt.nom} {currentDossier.defunt.prenoms}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[11px]">Statut au Décès :</span>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold ${
                        currentDossier.defunt.statutActivite === 'ACTIVITE'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}>
                        {currentDossier.defunt.statutActivite === 'ACTIVITE' ? 'En Activité' : 'Pensionné / Retraité'}
                      </span>
                      {currentDossier.defunt.statutActivite === 'ACTIVITE' && (
                        <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold ${
                          currentDossier.defunt.typeAgentActivite === 'EFA_ELD'
                            ? 'bg-amber-100 text-amber-800 border border-amber-200'
                            : 'bg-indigo-100 text-indigo-800 border border-indigo-200'
                        }`}>
                          {currentDossier.defunt.typeAgentActivite === 'EFA_ELD'
                            ? 'Agent EFA / ELD'
                            : 'Fonctionnaire'}
                        </span>
                      )}
                    </div>
                  </div>
                  {currentDossier.defunt.salaireDeBase && currentDossier.defunt.salaireDeBase > 0 && (
                    <div>
                      <span className="text-slate-500 block text-[11px]">Total rubrique ou Salaire de base :</span>
                      <span className="font-mono font-bold text-slate-900">
                        {currentDossier.defunt.salaireDeBase.toLocaleString()} Ar
                      </span>
                    </div>
                  )}
                  <div>
                    <span className="text-slate-500 block text-[11px]">Date et Lieu du Décès :</span>
                    <span className="font-medium text-slate-800">{currentDossier.defunt.dateDeces} {currentDossier.defunt.lieuDeces && `(${currentDossier.defunt.lieuDeces})`}</span>
                  </div>
                  {currentDossier.defunt.ministereInstitution && (
                    <div>
                      <span className="text-slate-500 block text-[11px]">Ministère / Institution :</span>
                      <span className="font-medium text-slate-800">{currentDossier.defunt.ministereInstitution}</span>
                    </div>
                  )}
                  {currentDossier.defunt.numeroPension && (
                    <div>
                      <span className="text-slate-500 block text-[11px]">N° Pension Retraite :</span>
                      <span className="font-mono font-semibold text-emerald-700">{currentDossier.defunt.numeroPension}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Demandeur / Ayant droit Card */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-900 pb-2 border-b border-slate-200">
                  <Users className="w-4 h-4 text-emerald-600" />
                  <span>Bénéficiaire et Ayants Droit</span>
                </div>
                <div className="text-xs space-y-1.5">
                  <div>
                    <span className="text-slate-500 block text-[11px]">Lien de Parenté / Qualité :</span>
                    <span className="font-bold text-slate-900">{currentDossier.demandeur.lienParente.replace(/_/g, ' ')}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[11px]">Nom et Prénoms Bénéficiaire :</span>
                    <span className="font-semibold text-slate-900">{currentDossier.demandeur.nom} {currentDossier.demandeur.prenoms}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[11px]">N° CIN du Demandeur :</span>
                    <span className="font-mono font-medium text-slate-800">{currentDossier.demandeur.cin}</span>
                  </div>
                  {currentDossier.demandeur.telephone && (
                    <div>
                      <span className="text-slate-500 block text-[11px]">Téléphone / Contact :</span>
                      <span className="font-medium text-slate-800">{currentDossier.demandeur.telephone}</span>
                    </div>
                  )}
                  {currentDossier.demandeur.compteBancaireTresor && (
                    <div>
                      <span className="text-slate-500 block text-[11px]">Compte Trésor / Bancaire :</span>
                      <span className="font-mono text-slate-800 font-semibold">{currentDossier.demandeur.compteBancaireTresor}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Enfants mineurs / majeurs si présents */}
              {currentDossier.enfants && currentDossier.enfants.length > 0 && (
                <div className="md:col-span-2 p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                  <span className="text-xs font-bold text-slate-900 block">
                    Enfants rattachés ({currentDossier.enfants.length})
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    {currentDossier.enfants.map((enf) => (
                      <div key={enf.id} className="p-2 bg-white rounded-lg border border-slate-200">
                        <span className="font-semibold text-slate-900 block">{enf.nom} {enf.prenoms}</span>
                        <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                          <span>Né(e) le {enf.dateNaissance}</span>
                          <span>•</span>
                          <span className={enf.estMineur ? 'text-blue-600 font-bold' : 'text-slate-600'}>
                            {enf.estMineur ? 'Mineur (<21 ans)' : 'Majeur'}
                          </span>
                          {enf.estHandicape && (
                            <span className="text-rose-600 font-bold bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">
                              Handicap attesté
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Arbitrage des Co-Bénéficiaires et Litiges (Divorce, Pluralité de lits) */}
              <div className="md:col-span-2 p-5 bg-white border border-slate-200 rounded-2xl space-y-4 shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <ShieldAlert className="w-5 h-5 text-indigo-600" />
                    <div>
                      <h4 className="text-xs font-extrabold text-slate-900 uppercase tracking-wide">Complexité et Arbitrage de Payout</h4>
                      <p className="text-[10px] text-slate-500">Gérez les dossiers complexes : divorces, pluralités de lits ou litiges d'héritiers.</p>
                    </div>
                  </div>

                  {/* Toggle Situation Complexe */}
                  {canEditCoDemandeurs ? (
                    <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
                      {(['AUCUN', 'DIVORCE', 'PLURALITE_LITS', 'DEUX_PARENTS_DECES'] as const).map((sit) => (
                        <button
                          key={sit}
                          onClick={() => handleChangeSituationComplexe(sit)}
                          className={`px-2.5 py-1 text-[10px] font-bold rounded-lg transition-all ${
                            currentDossier.situationComplexe === sit
                              ? 'bg-indigo-600 text-white shadow-xs'
                              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                          }`}
                        >
                          {sit === 'AUCUN' ? 'Standard' : sit === 'DIVORCE' ? '💔 Divorce' : sit === 'PLURALITE_LITS' ? '👥 Multi-Lits' : '🕯️ 2 Parents'}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <span className="text-xs font-bold px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg">
                      {currentDossier.situationComplexe || 'AUCUN'}
                    </span>
                  )}
                </div>

                {/* Conflict Alert Banner (If Divorce or Plurality Lits) */}
                {(currentDossier.situationComplexe === 'DIVORCE' || currentDossier.situationComplexe === 'PLURALITE_LITS' || coDemandeursList.length > 0) && (
                  <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl space-y-2">
                    <div className="flex items-start gap-2 text-xs text-amber-900 font-medium leading-relaxed">
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-extrabold text-amber-950 uppercase block mb-1">Règle DPS d'Indivisibilité Financière :</span>
                        Le secours au décès de l'agent est une prestation de solidarité payée <strong className="underline">UNE SEULE FOIS</strong> pour un montant total de <strong>{totalEntitlement.toLocaleString()} Ariary</strong> au total.
                        Contrairement aux pensions de réversion de retraite qui peuvent se répartir au prorata des années de mariage, le capital secours ne peut pas être dupliqué. En cas de conflit (ex: conjoint divorcé réclamant les frais d'obsèques face au conjoint actuel), vous devez obligatoirement saisir la répartition convenue ou attribuer 100% à l'un d'eux.
                      </div>
                    </div>
                  </div>
                )}

                {/* Split Board List */}
                <div className="space-y-3">
                  <h5 className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Plan de répartition des parts (Total : 100% / {totalEntitlement.toLocaleString()} Ar)</h5>

                  <div className="space-y-2">
                    {/* Primary Claimant Row */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200/60 text-xs">
                      <div className="space-y-0.5">
                        <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold uppercase">Demandeur Initial (Principal)</span>
                        <div className="font-bold text-slate-900">{currentDossier.demandeur.nom} {currentDossier.demandeur.prenoms}</div>
                        <div className="text-slate-500 font-mono text-[10px]">CIN: {currentDossier.demandeur.cin} | Qualité: {currentDossier.demandeur.lienParente.replace(/_/g, ' ')}</div>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <span className="text-xs font-mono font-extrabold text-slate-900">{primaryPercentage}%</span>
                          <span className="block text-[10px] font-semibold text-emerald-700 font-mono">
                            {currentDossier.montantSecours.toLocaleString()} Ar
                          </span>
                        </div>
                        <div className="w-24 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                          <div 
                            className={`h-full transition-all ${primaryPercentage < 0 ? 'bg-rose-500' : 'bg-emerald-500'}`}
                            style={{ width: `${Math.max(0, Math.min(100, primaryPercentage))}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>

                    {/* Co-Claimants list */}
                    {coDemandeursList.map((co) => (
                      <div key={co.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-white border border-slate-200 rounded-xl text-xs">
                        <div className="space-y-0.5">
                          <span className="text-[10px] bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded-full font-bold uppercase">Co-bénéficiaire / Réclamant additionnel</span>
                          <div className="font-bold text-slate-950">{co.nom} {co.prenoms}</div>
                          <div className="text-slate-500 font-mono text-[10px]">CIN: {co.cin} | Qualité: {co.lienParente.replace(/_/g, ' ')}</div>
                        </div>

                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-slate-500 font-medium">Part (%) :</span>
                            <input
                              type="number"
                              min="0"
                              max="100"
                              value={co.partPourcentage}
                              onChange={(e) => {
                                const val = Math.max(0, Math.min(100, Number(e.target.value) || 0));
                                handleChangeCoPercentage(co.id, val);
                              }}
                              className="w-16 px-1.5 py-1 text-center border border-slate-300 rounded font-mono font-bold text-slate-800 bg-slate-50"
                            />
                          </div>

                          <div className="text-right min-w-28">
                            <span className="block text-xs font-mono font-extrabold text-slate-900">{co.partPourcentage}%</span>
                            <span className="block text-[10px] font-semibold text-indigo-700 font-mono">
                              {co.partMontant.toLocaleString()} Ar
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleDetachCoDemandeurAsDossier(co)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-[10px] font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors cursor-pointer"
                              title="Détacher ce co-bénéficiaire absent en dossier indépendant pour un envoi ultérieur au CF"
                            >
                              <span>📂 Détacher en Dossier Séparé</span>
                            </button>

                            <button
                              onClick={() => handleDeleteCoDemandeur(co.id)}
                              className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                              title="Supprimer ce co-bénéficiaire"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Split Balance Bar Indicator */}
                  <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-[11px] font-bold text-slate-700">Somme des parts vérifiée :</span>
                    <div>
                      {primaryPercentage < 0 ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-200 animate-pulse">
                          <XCircle className="w-3.5 h-3.5 text-rose-600" />
                          <span>Dépassement de 100% (Actuel : {100 - primaryPercentage}%) — Veuillez ajuster !</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Total conforme : 100% ({totalEntitlement.toLocaleString()} Ariary)</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Add Co-bénéficiaire inline Form */}
                {canEditCoDemandeurs && (
                  showAddCoForm ? (
                    <div className="p-4 border border-indigo-200 rounded-xl bg-indigo-50/30 space-y-3 animate-in slide-in-from-top-2 duration-200">
                      <h6 className="text-xs font-bold text-indigo-900">Ajouter un nouveau Co-bénéficiaire réclamant</h6>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-600 mb-1">Nom :</label>
                          <input
                            type="text"
                            value={coNom}
                            onChange={(e) => setCoNom(e.target.value.toUpperCase())}
                            placeholder="Ex: RAKOTO"
                            className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs bg-white text-slate-800"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-600 mb-1">Prénoms :</label>
                          <input
                            type="text"
                            value={coPrenoms}
                            onChange={(e) => setCoPrenoms(e.target.value)}
                            placeholder="Ex: Jean Luc"
                            className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs bg-white text-slate-800"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-600 mb-1">N° CIN :</label>
                          <input
                            type="text"
                            value={coCin}
                            onChange={(e) => setCoCin(e.target.value)}
                            placeholder="Ex: 101202304918"
                            className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs font-mono bg-white text-slate-800"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-600 mb-1">Qualité / Lien de parenté :</label>
                          <select
                            value={coLien}
                            onChange={(e: any) => setCoLien(e.target.value)}
                            className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs bg-white text-slate-800"
                          >
                            <option value="CONJOINT_DIVORCE">💔 Conjoint Divorcé (Précédente union)</option>
                            <option value="CONJOINT_ACTUEL">💍 Conjoint Actuel (Veuve/Veuf)</option>
                            <option value="ENFANT_MAJEUR">👶 Enfant Majeur</option>
                            <option value="TUTEUR_ENFANT_MINEUR">🛡️ Tuteur d'Enfant Mineur</option>
                            <option value="AUTRE_AYANT_DROIT">👥 Autre Ayant Droit</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-slate-600 mb-1">Part attribuée au co-bénéficiaire (%) :</label>
                          <div className="flex items-center gap-3">
                            <input
                              type="range"
                              min="0"
                              max={Math.max(0, primaryPercentage)}
                              value={coPart}
                              onChange={(e) => setCoPart(Number(e.target.value))}
                              className="w-full"
                            />
                            <span className="text-xs font-mono font-bold bg-white px-2 py-1 border border-slate-300 rounded min-w-12 text-center text-slate-800">
                              {coPart}%
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                        <button
                          onClick={() => setShowAddCoForm(false)}
                          className="px-3 py-1.5 text-[11px] font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                        >
                          Annuler
                        </button>
                        <button
                          onClick={handleAddCoDemandeur}
                          disabled={!coNom || !coPrenoms || !coCin || Number(coPart) < 0}
                          className="px-3.5 py-1.5 text-[11px] font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 rounded-lg shadow-xs transition-all cursor-pointer"
                        >
                          Confirmer l'ajout
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-start">
                      <button
                        onClick={() => setShowAddCoForm(true)}
                        className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 hover:bg-indigo-100 hover:border-indigo-200 rounded-xl shadow-2xs transition-all cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Ajouter un Co-bénéficiaire réclamant</span>
                      </button>
                    </div>
                  )
                )}
              </div>
            </div>
          )}

          {/* TAB 3: AUDIT ET TRAÇABILITÉ */}
          {activeTab === 'audit' && (
            <div className="space-y-3">
              <div className="text-xs text-slate-500">
                Journal immuable des actions exécutées sur le dossier {currentDossier.numeroDossier}.
              </div>

              {auditLogs.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-400 bg-slate-50 rounded-xl">
                  Aucune entrée d'audit enregistrée pour ce dossier.
                </div>
              ) : (
                <div className="space-y-2">
                  {auditLogs.map((log) => (
                    <div key={log.id} className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900">{log.action}</span>
                        <span className="text-[11px] text-slate-600 font-mono">
                          {new Date(log.timestamp).toLocaleString('fr-FR')}
                        </span>
                      </div>
                      <p className="text-slate-700">{log.details}</p>
                      <div className="flex items-center gap-2 text-[10px] text-slate-600 pt-0.5">
                        <span className="font-semibold">{log.userNom}</span>
                        <span>•</span>
                        <span className="px-1.5 py-0.2 bg-slate-200 rounded font-bold">{log.userRole}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: DOCUMENTS OFFICIELS ET IMPRESSION */}
          {activeTab === 'docs' && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 border border-slate-200 p-4 rounded-xl shadow-2xs">
                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-slate-900">
                    Sélectionner le document officiel à imprimer :
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Les actes sont pré-remplis en temps réel à partir de la fiche d'état civil.
                  </p>
                </div>
                
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setSelectedDoc('fiche')}
                    className={`px-3 py-1.5 text-[11px] font-bold rounded-xl border transition-all ${
                      selectedDoc === 'fiche'
                        ? 'bg-blue-600 border-blue-600 text-white shadow-xs'
                        : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    📄 Fiche de Liquidation
                  </button>
                  <button
                    onClick={() => setSelectedDoc('bordereau')}
                    className={`px-3 py-1.5 text-[11px] font-bold rounded-xl border transition-all ${
                      selectedDoc === 'bordereau'
                        ? 'bg-blue-600 border-blue-600 text-white shadow-xs'
                        : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    📂 Bordereau d'Envoi CF
                  </button>
                </div>
              </div>

              {/* Print Action Bar */}
              <div className="flex items-center justify-between pt-1">
                <p className="text-xs text-slate-500">
                  Aperçu officiel (Format réglementaire de la DPS) :
                </p>
                <button
                  onClick={handlePrint}
                  className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-sm transition-all animate-bounce"
                >
                  <span>🖨️ Lancer l'impression officielle</span>
                </button>
              </div>

              {/* Document Preview Area */}
              <div className="bg-white border border-slate-300 rounded-2xl shadow-md p-8 overflow-hidden max-w-3xl mx-auto font-mono text-slate-900 space-y-6 select-none relative">
                {/* Diagonal watermark */}
                <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] rotate-45 pointer-events-none select-none text-[60px] font-bold font-sans text-slate-900">
                  MINISTERE ECONOMIE MEF
                </div>

                <div className="text-center space-y-1 pb-4 border-b border-dashed border-slate-200">
                  <h5 className="text-xs font-extrabold uppercase tracking-widest text-slate-950">REPOBLIKAN'I MADAGASIKARA</h5>
                  <p className="text-[9px] italic text-slate-600">Fitiavana - Tanindrazana - Fandrosoana</p>
                  <div className="w-12 h-0.5 bg-slate-900 mx-auto my-1.5"></div>
                  <p className="text-[10px] font-bold uppercase text-slate-800">MINISTÈRE DE L'ÉCONOMIE ET DES FINANCES</p>
                  <p className="text-[9px] uppercase text-slate-700">DIRECTION GÉNÉRALE DES OPÉRATIONS FINANCIÈRES</p>
                  <p className="text-[9px] font-bold uppercase underline text-slate-950">DIRECTION DES PENSIONS ET DE LA SOLDE</p>
                  <p className="text-[8px] text-slate-600">Service des Secours et Allocations Décès</p>
                </div>

                {selectedDoc === 'fiche' ? (
                  /* Preview: Fiche de Liquidation */
                  <div className="space-y-4">
                    <div className="text-center border-2 border-slate-900 p-2.5 bg-slate-50/50 rounded-xl">
                      <h4 className="text-xs font-extrabold uppercase text-slate-950">
                        FICHE DE LIQUIDATION DE SECOURS DECES
                      </h4>
                      <p className="text-[10px] font-bold text-slate-700 font-mono mt-0.5">
                        N° : REG-{currentDossier.numeroDossier} / DPS / DPS.4
                      </p>
                    </div>

                    <div className="space-y-2">
                      <h6 className="text-[10px] font-extrabold uppercase tracking-wider text-slate-950 border-b border-slate-300 pb-0.5">
                        I. RENSEIGNEMENTS SUR L'AGENT DÉFUNT
                      </h6>
                      <div className="grid grid-cols-3 gap-y-1.5 text-[10px]">
                        <span className="text-slate-500">Nom et Prénoms :</span>
                        <strong className="col-span-2 text-slate-950 uppercase">{currentDossier.defunt.nom} {currentDossier.defunt.prenoms}</strong>
                        
                        <span className="text-slate-500">Indice Matricule (IM) :</span>
                        <strong className="col-span-2 text-blue-700 underline font-mono">{currentDossier.defunt.im}</strong>
                        
                        <span className="text-slate-500">Statut d'Activité :</span>
                        <strong className="col-span-2 text-slate-950">{currentDossier.defunt.statutActivite === 'ACTIVITE' ? 'EN ACTIVITÉ' : 'RETRAITÉ / PENSIONNÉ'}</strong>
                        
                        <span className="text-slate-500">Date de décès :</span>
                        <strong className="col-span-2 text-slate-950">{currentDossier.defunt.dateDeces}</strong>

                        <span className="text-slate-500">Ministère :</span>
                        <strong className="col-span-2 text-slate-950 truncate">{currentDossier.defunt.ministereInstitution || 'Non spécifié'}</strong>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <h6 className="text-[10px] font-extrabold uppercase tracking-wider text-slate-950 border-b border-slate-300 pb-0.5">
                        II. RENSEIGNEMENTS SUR LE BÉNÉFICIAIRE
                      </h6>
                      <div className="grid grid-cols-3 gap-y-1.5 text-[10px]">
                        <span className="text-slate-500">Nom et Prénoms :</span>
                        <strong className="col-span-2 text-slate-950 uppercase">{currentDossier.demandeur.nom} {currentDossier.demandeur.prenoms}</strong>
                        
                        <span className="text-slate-500">Lien de Parenté :</span>
                        <strong className="col-span-2 text-slate-950">{currentDossier.demandeur.lienParente.replace(/_/g, ' ')}</strong>
                        
                        <span className="text-slate-500">N° CIN :</span>
                        <strong className="col-span-2 text-slate-950 font-mono">{currentDossier.demandeur.cin}</strong>

                        <span className="text-slate-500">Adresse :</span>
                        <strong className="col-span-2 text-slate-950 truncate">{currentDossier.demandeur.adresse || '—'}</strong>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <h6 className="text-[10px] font-extrabold uppercase tracking-wider text-slate-950 border-b border-slate-300 pb-0.5">
                        III. LIQUIDATION FINANCIÈRE DE L'ALLOCATION
                      </h6>
                      <div className="border border-slate-300 p-2.5 rounded-xl bg-slate-50/30 text-[10px] space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500">Libellé :</span>
                          <strong className="text-slate-950">SECOURS AUX DÉCÈS (MANDATEMENT DIRECT)</strong>
                        </div>
                        <div className="flex items-center justify-between border-t border-dashed border-slate-200 pt-1.5">
                          <span className="text-slate-700 font-bold">MONTANT CALCULÉ :</span>
                          <strong className="text-xs font-bold text-emerald-800 font-mono">
                            {(Number(currentDossier.montantSecours) || 500000).toLocaleString()} Ar
                          </strong>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Preview: Bordereau Envoi */
                  <div className="space-y-4">
                    <div className="text-center border-2 border-slate-900 p-2.5 bg-slate-50/50 rounded-xl">
                      <h4 className="text-xs font-extrabold uppercase text-slate-950">
                        BORDEREAU D'ENVOI DES PIÈCES CF
                      </h4>
                      <p className="text-[10px] font-bold text-slate-700 font-mono mt-0.5">
                        Dossier : REG-{currentDossier.numeroDossier} / DPS
                      </p>
                    </div>

                    <p className="text-[10px] text-slate-700 leading-relaxed">
                      Bordereau d'accompagnement des pièces justificatives réglementaires remis au <strong>Contrôle Financier</strong> pour validation et visa.
                    </p>

                    <div className="space-y-2">
                      <h6 className="text-[10px] font-extrabold uppercase tracking-wider text-slate-950 border-b border-slate-300 pb-0.5">
                        PIÈCES CONTRÔLÉES ET CONFORMES ({currentDossier.pieces.filter(p => p.statut === 'CONFORME').length})
                      </h6>
                      
                      <div className="border border-slate-200 rounded-xl overflow-hidden text-[9px]">
                        <div className="grid grid-cols-12 bg-slate-100 font-bold py-1 px-2 border-b border-slate-200">
                          <span className="col-span-1 text-center">N°</span>
                          <span className="col-span-9">Intitulé</span>
                          <span className="col-span-2 text-center">Obligatoire</span>
                        </div>
                        <div className="divide-y divide-slate-100">
                          {currentDossier.pieces.map((p, idx) => (
                            <div key={p.id} className="grid grid-cols-12 py-1 px-2 hover:bg-slate-50">
                              <span className="col-span-1 text-center text-slate-500">{idx + 1}</span>
                              <span className="col-span-9 font-medium text-slate-800 truncate" title={p.intitule}>{p.intitule}</span>
                              <span className="col-span-2 text-center text-slate-600">{p.estObligatoire ? 'Oui' : 'Non'}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="text-right text-[9px] text-slate-600 pt-3 border-t border-dashed border-slate-200">
                  Fait à Antananarivo, le {new Date().toLocaleDateString('fr-FR')}
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: AUDIT ET AUTO-INSTRUCTION AUTOMATIQUE */}
          {activeTab === 'auto' && (
            <div className="space-y-4 animate-in fade-in duration-200">
              {/* Introduction Box */}
              <div className="bg-indigo-50 border border-indigo-100 p-5 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <h4 className="text-xs font-extrabold text-indigo-900 flex items-center gap-2">
                    <span>Moteur d'Audit et Diagnostic Autonome 🤖</span>
                    <span className="text-[9px] bg-indigo-200 text-indigo-800 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">Robot d'Instruction</span>
                  </h4>
                  <p className="text-[11px] text-indigo-700 leading-relaxed">
                    Ce module réglementaire autonome effectue un contrôle instantané d'intégrité (cohérence état civil, statut d'activité, calculs du montant et complétude des pièces obligatoires) de manière locale et déterministe.
                  </p>
                </div>

                <button
                  onClick={handleRunAutoInstruction}
                  className="w-full md:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md transition-all whitespace-nowrap cursor-pointer active:scale-98"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>Lancer l'Auto-Instruction</span>
                </button>
              </div>

              {/* Success Notification */}
              {autoSuccessMessage && (
                <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl text-xs text-emerald-800 font-medium flex items-start gap-2.5 animate-in slide-in-from-top-2 duration-200">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">Succès de l'Auto-Instruction :</span> {autoSuccessMessage}
                  </div>
                </div>
              )}

              {/* Core Audit Metrics et Integrity Checks */}
              {(() => {
                const diags = getAutonomousDiagnostics();
                return (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Metric 1: Compliance */}
                    <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3 shadow-xs">
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wide">Complétude Obligatoire</span>
                      <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-extrabold text-slate-800 font-mono">{diags.complianceRate}%</span>
                        <span className="text-[10px] text-slate-500 font-medium">({diags.validCount} / {diags.totalCount} conformes)</span>
                      </div>
                      
                      {/* Custom Progress Bar */}
                      <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                        <div 
                          className={`h-full transition-all duration-500 ${
                            diags.complianceRate === 100 
                              ? 'bg-emerald-500' 
                              : diags.complianceRate >= 50 
                              ? 'bg-amber-500' 
                              : 'bg-rose-500'
                          }`}
                          style={{ width: `${diags.complianceRate}%` }}
                        ></div>
                      </div>
                    </div>

                    {/* Metric 2: Document stats */}
                    <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-2 shadow-xs md:col-span-2">
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wide block">Statut des pièces exigibles</span>
                      <div className="flex flex-wrap items-center gap-3 pt-1">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>{diags.validCount} Conformes</span>
                        </span>
                        {diags.incorrectCount > 0 && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-rose-50 text-rose-700 border border-rose-100 animate-pulse">
                            <XCircle className="w-3 h-3 text-rose-600" />
                            <span>{diags.incorrectCount} Non Conformes</span>
                          </span>
                        )}
                        {diags.missingCount > 0 && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-100">
                            <AlertTriangle className="w-3 h-3 text-amber-600" />
                            <span>{diags.missingCount} Manquantes</span>
                          </span>
                        )}
                        {diags.missingCount === 0 && diags.incorrectCount === 0 && (
                          <span className="text-[10px] text-slate-500 font-medium italic">Toutes les pièces de base requises sont fournies et valides.</span>
                        )}
                      </div>
                    </div>

                    {/* Left Diagnostic Analysis List */}
                    <div className="bg-white border border-slate-200 rounded-2xl shadow-xs p-5 md:col-span-3 space-y-4">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                        <span className="text-xs font-bold text-slate-800">Contrôles de cohérence réglementaire</span>
                        <span className="text-[10px] font-mono text-slate-400">Total anomalies : {diags.anomalies.length}</span>
                      </div>

                      {diags.anomalies.length > 0 ? (
                        <div className="space-y-2.5">
                          {diags.anomalies.map((anom, index) => (
                            <div key={index} className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-50/50 border border-amber-100 text-[11px] text-amber-900 leading-relaxed">
                              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                              <div>
                                <span className="font-semibold text-amber-950">Alerte #{index + 1} :</span> {anom}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="py-4 text-center space-y-1 bg-slate-50 border border-dashed border-slate-200 rounded-xl">
                          <CheckCircle2 className="w-6 h-6 text-emerald-500 mx-auto" />
                          <p className="text-[11px] font-bold text-slate-700">Aucun défaut d'intégrité détecté</p>
                          <p className="text-[10px] text-slate-500">L'état civil, le montant financier et les justificatifs obligatoires sont parfaits !</p>
                        </div>
                      )}

                      {/* Manual / Auto Checklist report details */}
                      <div className="pt-2">
                        <h5 className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">Synthèse détaillée d'Instruction</h5>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-[11px] leading-relaxed">
                          <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                            <span className="font-bold text-slate-800 block mb-1">Résumé civil du défunt :</span>
                            <ul className="space-y-1 text-slate-600">
                              <li>• Agent : {currentDossier.defunt.nom.toUpperCase()} {currentDossier.defunt.prenoms}</li>
                              <li>• IM : {currentDossier.defunt.im}</li>
                              <li>• Statut DPS : {currentDossier.defunt.statutActivite === 'ACTIVITE' ? 'En Activité (Solde)' : 'Pensionné (Retraite)'}</li>
                              <li>• Décès constaté le : {currentDossier.defunt.dateDeces}</li>
                            </ul>
                          </div>

                          <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                            <span className="font-bold text-slate-800 block mb-1">Détails de liquidation financière :</span>
                            <ul className="space-y-1 text-slate-600">
                              <li>• Taux d'octroi réglementaire : <strong className="text-slate-800 font-mono">{totalEntitlement.toLocaleString()} Ar</strong></li>
                              <li>• Montant saisi dans ce dossier : <strong className="text-slate-800 font-mono">{currentDossier.montantSecours.toLocaleString()} Ar</strong></li>
                              <li>• Statut financier : {currentDossier.montantSecours === totalEntitlement ? (
                                <span className="text-emerald-700 font-semibold">✓ Conforme aux normes</span>
                              ) : (
                                <span className="text-rose-700 font-semibold">✗ Déviation tarifaire détectée</span>
                              )}</li>
                            </ul>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
        </div>

        {/* Footer Actions according to role */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-slate-500">
            Compte actif : <strong className="text-slate-800 font-semibold">{activeRole}</strong>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* --- COMPTE AGENT --- */}
            {activeRole === 'AGENT' && (
              <>
                {/* 1. Dossier en réception ou incomplet (non encore visé par le CF) : Envoyer au CF ou Notifier Visa CF */}
                {(!currentDossier.dateEnvoiCf || currentDossier.statut === 'RECEPTION_EN_COURS' || currentDossier.statut === 'ENQUETE_CONFORME' || currentDossier.statut === 'DOSSIER_INCOMPLET') && currentDossier.statut !== 'MANDATE' && (
                  <>
                    <button
                      onClick={() => onOpenWorkflowAction('ENVOI_CF')}
                      className="px-3.5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
                      title="Envoyer le dossier au Contrôle Financier (enregistre date et heure)"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Envoyer au CF</span>
                    </button>

                    <button
                      onClick={() => onOpenWorkflowAction('VISA_CF')}
                      className="px-3 py-2 text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-xl shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
                      title="Notifier le Visa du Contrôle Financier"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Notifier Visa CF</span>
                    </button>
                  </>
                )}

                {/* 2. Dossier retourné : L'agent le reçoit et a le choix : Renvoyer au CF (visa et décision inchangés) OU Renvoyer directement au mandatement */}
                {(currentDossier.statut === 'RETOUR_CF' || currentDossier.statut === 'REJETE_CF') && (
                  <>
                    <button
                      onClick={() => onOpenWorkflowAction('ENVOI_CF')}
                      className="px-3.5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
                      title="Renvoyer le dossier au Contrôle Financier (le visa et la décision ne changent pas)"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Renvoyer au CF (Visa et Décision inchangés)</span>
                    </button>

                    {(currentDossier.refEngagement || currentDossier.numVisaCf) && (
                      <button
                        onClick={() => {
                          const res = DossierStorageService.renvoyerAuMandatement(currentDossier.id);
                          if (res.success) {
                            const updated = DossierStorageService.getDossierById(currentDossier.id);
                            if (updated) setCurrentDossier(updated);
                            onOpenWorkflowAction('MANDATEMENT');
                          }
                        }}
                        className="px-3.5 py-2 text-xs font-bold text-purple-900 bg-purple-100 hover:bg-purple-200 border border-purple-300 rounded-xl shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
                        title="Renvoyer directement au mandatement sans passer par le CF"
                      >
                        <CreditCard className="w-3.5 h-3.5 text-purple-700" />
                        <span>Renvoyer directement au Mandatement</span>
                      </button>
                    )}

                    {!currentDossier.numVisaCf && (
                      <button
                        onClick={() => onOpenWorkflowAction('VISA_CF')}
                        className="px-3 py-2 text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-xl shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
                        title="Notifier le Visa du CF accordé"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Notifier Visa CF</span>
                      </button>
                    )}
                  </>
                )}

                {/* 3. Dossier actuellement chez le CF */}
                {currentDossier.statut === 'TRANSMIS_CF' && (
                  <>
                    <button
                      onClick={() => onOpenWorkflowAction('RETOUR_CF')}
                      className="px-3.5 py-2 text-xs font-bold text-rose-950 bg-rose-100 hover:bg-rose-200 border border-rose-300 rounded-xl shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
                      title="Marquer le rejet du dossier par le CF (date et heure automatique + motif rejet)"
                    >
                      <XCircle className="w-3.5 h-3.5 text-rose-700" />
                      <span>Rejet CF</span>
                    </button>

                    <button
                      onClick={() => onOpenWorkflowAction('VISA_CF')}
                      className="px-3.5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
                      title="Notifier que le dossier est visé par le CF"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Notifier Visa du CF</span>
                    </button>
                  </>
                )}

                {/* 4. Dossier visé par le CF : Engager ou Mandater */}
                {currentDossier.statut === 'VALIDE_CF' && (
                  <>
                    <button
                      onClick={() => onOpenWorkflowAction('ENGAGEMENT')}
                      className={`px-3.5 py-2 text-xs font-bold text-white rounded-xl shadow-xs flex items-center gap-1.5 transition-all cursor-pointer ${
                        (currentDossier.pieces || []).some((p) => p.estObligatoire && p.statut !== 'CONFORME')
                          ? 'bg-amber-600 hover:bg-amber-700'
                          : 'bg-indigo-600 hover:bg-indigo-700'
                      }`}
                      title="Engager la dépense (référence et date)"
                    >
                      <FileCheck className="w-3.5 h-3.5" />
                      <span>Engager le Dossier</span>
                    </button>

                    <button
                      onClick={() => onOpenWorkflowAction('MANDATEMENT')}
                      className="px-3.5 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 border border-slate-300 rounded-xl shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
                      title="Mandater le secours"
                    >
                      <CreditCard className="w-3.5 h-3.5 text-slate-500" />
                      <span>Mandater le Secours</span>
                    </button>
                  </>
                )}

                {/* 5. Dossier engagé : Mandater ou Signaler Retour */}
                {currentDossier.statut === 'ENGAGE' && (
                  <>
                    <button
                      onClick={() => onOpenWorkflowAction('MANDATEMENT')}
                      className="px-3.5 py-2 text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 rounded-xl shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
                      title="Mandater le secours"
                    >
                      <CreditCard className="w-3.5 h-3.5" />
                      <span>Mandater le Secours</span>
                    </button>

                    <button
                      onClick={() => onOpenWorkflowAction('RETOUR_CF')}
                      className="px-3 py-2 text-xs font-bold text-amber-900 bg-amber-50 hover:bg-amber-100 border border-amber-300 rounded-xl shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
                      title="Enregistrer un retour ou motif après engagement"
                    >
                      <RotateCcw className="w-3.5 h-3.5 text-amber-700" />
                      <span>Retour de dossier</span>
                    </button>
                  </>
                )}

                {/* 6. Déjà mandaté */}
                {currentDossier.statut === 'MANDATE' && (
                  <span className="px-3 py-1.5 rounded-xl text-xs font-bold bg-purple-100 text-purple-800 border border-purple-200">
                    ✓ Dossier Mandaté et Payé
                  </span>
                )}
              </>
            )}

            {onEdit && activeRole === 'AGENT' && (
              <button
                onClick={() => onEdit(currentDossier)}
                className="btn-3d-secondary px-3.5 py-2 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 rounded-xl border border-slate-300 flex items-center gap-1.5"
                title="Modifier les données de ce dossier"
              >
                <Edit3 className="w-3.5 h-3.5 text-blue-600" />
                <span>Modifier</span>
              </button>
            )}

            {onDelete && activeRole === 'AGENT' && (
              <button
                onClick={() => onDelete(currentDossier)}
                className="px-3.5 py-2 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-xl border border-rose-200 flex items-center gap-1.5"
                title="Supprimer ce dossier"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                <span>Supprimer</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-700 bg-white hover:bg-slate-100 rounded-xl border border-slate-300"
            >
              Fermer
            </button>
          </div>
        </div>
      </div>

      {/* Rejection Motif Modal (N.B. / Cause du Rejet) */}
      {showRejectModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <XCircle className="w-5 h-5 text-rose-600" />
                <span>N.B. / Cause du Rejet du Dossier</span>
              </h3>
              <button
                onClick={() => setShowRejectModal(false)}
                className="text-slate-400 hover:text-slate-600 text-xs font-bold"
              >
                ✕
              </button>
            </div>
            <p className="text-xs text-slate-500">
              Précisez ci-dessous la note de bas de page (N.B.) ou la cause détaillée du rejet pour rectification ou notification à la demanderesse.
            </p>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Motif / N.B. du Rejet <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={4}
                value={rejectMotifInput}
                onChange={(e) => setRejectMotifInput(e.target.value)}
                placeholder="Ex: N.B. : Pièce justificative non conforme ou délai dépassé..."
                className="w-full text-xs bg-slate-50 border border-slate-300 rounded-xl p-3 text-slate-900 focus:ring-2 focus:ring-rose-500 focus:bg-white"
              />
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setShowRejectModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl"
              >
                Annuler
              </button>
              <button
                onClick={handleConfirmReject}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-sm flex items-center gap-1.5"
              >
                <XCircle className="w-4 h-4" />
                <span>Confirmer le Rejet</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
