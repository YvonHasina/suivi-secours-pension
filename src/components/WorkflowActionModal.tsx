import React, { useState, useMemo } from 'react';
import {
  X,
  Send,
  CheckCircle2,
  XCircle,
  CreditCard,
  AlertTriangle,
  FileCheck2,
  Calendar,
  Hash,
  FileText,
  Clock,
  RotateCcw,
  Banknote,
  Stamp,
  BadgeCheck,
} from 'lucide-react';
import { DossierSecours, UserRole } from '../types';
import { DossierStorageService, formatCurrentDateTime } from '../services/dossierStorage';
import { WorkflowValidationService, WorkflowActionType } from '../services/workflowValidation';

interface WorkflowActionModalProps {
  dossier: DossierSecours;
  actionType: WorkflowActionType;
  activeRole: UserRole;
  onClose: () => void;
  onSuccess: () => void;
}

export const WorkflowActionModal: React.FC<WorkflowActionModalProps> = ({
  dossier: initialDossier,
  actionType,
  activeRole,
  onClose,
  onSuccess,
}) => {
  const [currentDossier] = useState<DossierSecours>(initialDossier);
  const nowDateTime = formatCurrentDateTime();
  const todayDate = new Date().toISOString().slice(0, 10);

  // States: Envoi / Renvoi CF
  const [dateHeureEnvoi, setDateHeureEnvoi] = useState(
    currentDossier.dateEnvoiCf || nowDateTime
  );
  const [noteEnvoi, setNoteEnvoi] = useState('');

  // States: Retour CF
  const [dateHeureRetour, setDateHeureRetour] = useState(nowDateTime);
  const [motifRetour, setMotifRetour] = useState(currentDossier.motifRetourCf || '');

  // States: Visa CF Notifié (Contrôle Financier)
  const [dateHeureVisa, setDateHeureVisa] = useState(
    currentDossier.dateVisaCf || nowDateTime
  );
  const [numVisaCf, setNumVisaCf] = useState(
    currentDossier.numVisaCf ||
      `VISA-CF-${new Date().getFullYear()}/${Math.floor(1000 + Math.random() * 9000)}`
  );
  const [noteVisa, setNoteVisa] = useState('');

  // States: Saisie de la Décision (Agent - après Visa CF)
  const [numDecision, setNumDecision] = useState(
    currentDossier.numDecision ||
      `DEC-${new Date().getFullYear()}/${Math.floor(1000 + Math.random() * 9000)}`
  );
  const [dateDecision, setDateDecision] = useState(
    currentDossier.dateDecision || todayDate
  );
  const [noteDecision, setNoteDecision] = useState('');

  // States: Engagement Comptable
  const [dateHeureEngagement, setDateHeureEngagement] = useState(nowDateTime);
  const [refEngagement, setRefEngagement] = useState(
    currentDossier.refEngagement ||
      `ENG-${new Date().getFullYear()}/${Math.floor(1000 + Math.random() * 9000)}`
  );
  const [noteEngagement, setNoteEngagement] = useState('');

  // States: Mandatement Comptable
  const [dateMandatement, setDateMandatement] = useState(
    currentDossier.dateMandatement || todayDate
  );
  const [numMandat, setNumMandat] = useState(
    currentDossier.numMandat ||
      `MANDAT-TP-${new Date().getFullYear()}/${Math.floor(10000 + Math.random() * 90000)}`
  );
  const [montantMandat, setMontantMandat] = useState<string>(
    String(currentDossier.montantMandat || currentDossier.montantSecours || 500000)
  );
  const [comptaNote, setComptaNote] = useState('');

  const [error, setError] = useState<string | null>(null);

  // Evaluate prerequisite validation
  const validation = useMemo(() => {
    return WorkflowValidationService.canExecuteWorkflowAction(currentDossier, actionType, activeRole);
  }, [currentDossier, actionType, activeRole]);

  // Action 1: Envoi / Renvoi au CF (Agent)
  const handleSubmitEnvoiCf = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!dateHeureEnvoi.trim()) {
      setError("Veuillez renseigner la date et l'heure d'envoi.");
      return;
    }

    const res = DossierStorageService.marquerTransmisCf(
      currentDossier.id,
      dateHeureEnvoi.trim(),
      noteEnvoi.trim() || undefined
    );
    if (!res.success) {
      setError(res.error || "Erreur lors de l'envoi au CF.");
      return;
    }
    onSuccess();
  };

  // Action 2: Marquer le retour du CF (Agent)
  const handleSubmitRetourCf = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!motifRetour.trim()) {
      setError('Veuillez préciser le motif du retour ou les remarques formulées par le CF.');
      return;
    }

    const res = DossierStorageService.marquerRetourCf(currentDossier.id, {
      motif: motifRetour.trim(),
      dateRetour: dateHeureRetour.trim(),
    });
    if (!res.success) {
      setError(res.error || 'Erreur lors de la prise en compte du retour.');
      return;
    }
    onSuccess();
  };

  // Action 3: Notifier le Visa du CF (Agent)
  const handleSubmitVisaCf = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!numVisaCf.trim()) {
      setError('Le N° de Visa du Contrôle Financier est obligatoire.');
      return;
    }

    const res = DossierStorageService.marquerVisaCf(currentDossier.id, {
      numVisaCf: numVisaCf.trim(),
      dateVisa: dateHeureVisa.trim(),
      note: noteVisa.trim() || undefined,
    });
    if (!res.success) {
      setError(res.error || 'Erreur lors de la notification du visa.');
      return;
    }
    onSuccess();
  };

  // Action 3 bis: Enregistrer la Décision après le Visa CF (Agent)
  const handleSubmitDecision = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!numDecision.trim()) {
      setError('Le N° de Décision administrative est obligatoire.');
      return;
    }

    const res = DossierStorageService.enregistrerDecision(currentDossier.id, {
      numDecision: numDecision.trim(),
      dateDecision: dateDecision.trim() || undefined,
      note: noteDecision.trim() || undefined,
    });
    if (!res.success) {
      setError(res.error || "Erreur lors de l'enregistrement de la décision.");
      return;
    }
    onSuccess();
  };

  // Action 4: Engagement comptable (Comptable)
  const handleSubmitEngagement = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Règle stricte demandée par l'utilisateur : L'engagement n'aura pas lieu si le dossier n'est pas visé par le CF
    const aEteVise =
      !!currentDossier.numVisaCf ||
      !!currentDossier.numDecision ||
      !!currentDossier.dateVisaCf ||
      currentDossier.statut === 'VALIDE_CF' ||
      currentDossier.statut === 'ENGAGE';
    if (!aEteVise) {
      setError("L'engagement n'aura pas lieu si le dossier n'est pas préalablement visé par le Contrôle Financier.");
      return;
    }

    if (!refEngagement.trim()) {
      setError("Veuillez renseigner la référence d'engagement comptable.");
      return;
    }

    const res = DossierStorageService.marquerEngagement(currentDossier.id, {
      refEngagement: refEngagement.trim(),
      dateEngagement: dateHeureEngagement.trim(),
      note: noteEngagement.trim() || undefined,
    });
    if (!res.success) {
      setError(res.error || "Erreur lors de l'engagement comptable.");
      return;
    }
    onSuccess();
  };

  // Action 5: Mandatement (Comptable)
  const handleSubmitMandatement = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!dateMandatement) {
      setError('La date de mandatement est obligatoire.');
      return;
    }
    if (!numMandat.trim()) {
      setError('Le numéro de mandat du Trésor est obligatoire.');
      return;
    }
    const montantNum = Number(montantMandat);
    if (isNaN(montantNum) || montantNum <= 0) {
      setError('Veuillez saisir un prix / montant de mandatement supérieur à 0 Ar.');
      return;
    }

    const res = DossierStorageService.marquerMandatement(currentDossier.id, {
      dateMandatement,
      numMandat: numMandat.trim(),
      montantMandat: montantNum,
      observation: comptaNote.trim() || undefined,
    });
    if (!res.success) {
      setError(res.error || 'Erreur lors du mandatement.');
      return;
    }
    onSuccess();
  };

  return (
    <div
      id="workflow-action-modal-backdrop"
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-150"
    >
      <div
        id="workflow-action-modal-box"
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden"
      >
        {/* Header */}
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {actionType === 'ENVOI_CF' && (
              <div className="p-2 rounded-xl bg-blue-100 text-blue-700">
                <Send className="w-5 h-5" />
              </div>
            )}
            {actionType === 'RETOUR_CF' && (
              <div className="p-2 rounded-xl bg-rose-100 text-rose-700">
                <XCircle className="w-5 h-5" />
              </div>
            )}
            {(actionType === 'VISA_CF' || actionType === 'DECISION_CF') && (
              <div className="p-2 rounded-xl bg-emerald-100 text-emerald-700">
                <Stamp className="w-5 h-5" />
              </div>
            )}
            {actionType === 'SAISIE_DECISION' && (
              <div className="p-2 rounded-xl bg-blue-100 text-blue-700">
                <FileText className="w-5 h-5" />
              </div>
            )}
            {actionType === 'ENGAGEMENT' && (
              <div className="p-2 rounded-xl bg-indigo-100 text-indigo-700">
                <BadgeCheck className="w-5 h-5" />
              </div>
            )}
            {actionType === 'MANDATEMENT' && (
              <div className="p-2 rounded-xl bg-purple-100 text-purple-700">
                <CreditCard className="w-5 h-5" />
              </div>
            )}
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                {actionType === 'ENVOI_CF' &&
                  (currentDossier.statut === 'RETOUR_CF' || currentDossier.statut === 'REJETE_CF'
                    ? 'Renvoi du Dossier au Contrôle Financier (CF)'
                    : 'Envoi du Dossier au Contrôle Financier (CF)')}
                {actionType === 'RETOUR_CF' && 'Enregistrer le Rejet du Dossier par le CF'}
                {(actionType === 'VISA_CF' || actionType === 'DECISION_CF') && 'Notifier le Visa accordé par le CF'}
                {actionType === 'SAISIE_DECISION' && 'Enregistrement de la Décision (après Visa CF)'}
                {actionType === 'ENGAGEMENT' && 'Engagement Comptable du Dossier Visé'}
                {actionType === 'MANDATEMENT' && 'Liquidation et Mandatement du Secours'}
              </h3>
              <p className="text-xs text-slate-500">
                Dossier <span className="font-semibold text-slate-800">{currentDossier.numeroDossier}</span> • IM:{' '}
                {currentDossier.defunt.im} ({currentDossier.defunt.nom})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Global Error Banner */}
        {error && (
          <div className="mx-6 mt-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Informative Banner for Incomplete dossier (Negligible by CF et Accountant) */}
        {validation.piecesManquantes && validation.piecesManquantes.length > 0 && (actionType === 'ENGAGEMENT' || actionType === 'MANDATEMENT') && (
          <div className="mx-6 mt-4 p-3.5 bg-amber-50 border border-amber-300 rounded-xl text-xs text-amber-950 flex items-start gap-3 shadow-2xs">
            <span className="text-base shrink-0 mt-0.5">ℹ️</span>
            <div className="space-y-1 flex-1">
              <div className="font-bold text-amber-900 text-xs flex items-center gap-1.5 flex-wrap">
                <span>Dossier incomplet — Faculté de dérogation accordée au CF et au Comptable</span>
                <span className="text-[10px] bg-amber-200 text-amber-900 px-1.5 py-0.2 rounded font-bold">NÉGLIGEABLE</span>
              </div>
              <p className="text-amber-800 text-[11px] leading-relaxed">
                Ce dossier comporte {validation.piecesManquantes.length} pièce(s) manquante(s) ou non conforme(s). Ce statut est <strong>négligeable</strong> : le dossier peut être engagé et mandaté immédiatement au Trésor.
              </p>
              <div className="flex flex-wrap gap-1 pt-1">
                {validation.piecesManquantes.map((p, idx) => (
                  <span key={idx} className="px-1.5 py-0.5 rounded bg-amber-100 border border-amber-200 text-[10px] text-amber-800 font-medium">
                    ⚠️ {p.intitule}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Action Type 1: ENVOI CF (Agent) */}
        {actionType === 'ENVOI_CF' && (
          <form onSubmit={handleSubmitEnvoiCf} className="p-6 space-y-4">
            <div className="p-3.5 bg-blue-50/70 border border-blue-200/70 rounded-xl text-xs text-blue-900 leading-relaxed space-y-1">
              <div className="font-bold flex items-center gap-1.5 text-blue-800">
                <Clock className="w-3.5 h-3.5 text-blue-600" />
                <span>Horodatage officiel d'envoi</span>
              </div>
              <p>
                La date et l'heure d'envoi ci-dessous sont générées automatiquement. Elles s'afficheront sur le suivi
                et dans le registre pour attester de la transmission au Contrôle Financier.
              </p>
            </div>

            {/* Notification de préservation du Visa et Décision en cas de renvoi */}
            {currentDossier.numVisaCf && (
              <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl text-xs text-emerald-950 space-y-1">
                <div className="font-bold flex items-center gap-1.5 text-emerald-900">
                  <BadgeCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Préservation du Visa et de la Décision (Inchangés)</span>
                </div>
                <p className="text-[11px] text-emerald-800 leading-relaxed">
                  Le N° de Visa CF (<strong>{currentDossier.numVisaCf}</strong>){currentDossier.numDecision ? ` et le N° de Décision (<strong>${currentDossier.numDecision}</strong>)` : ''} restent <strong>strictement inchangés</strong> lors de ce renvoi au Contrôle Financier.
                </p>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-500" />
                Date et heure d'envoi au CF (Automatique ou personnalisable)
              </label>
              <input
                type="text"
                required
                value={dateHeureEnvoi}
                onChange={(e) => setDateHeureEnvoi(e.target.value)}
                placeholder="Ex: 2026-09-21 à 15:45"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-slate-500" />
                Observations / Note de transmission (facultatif)
              </label>
              <textarea
                rows={2}
                value={noteEnvoi}
                onChange={(e) => setNoteEnvoi(e.target.value)}
                placeholder="Ex: Dossier transmis complet avec toutes pièces conformes..."
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="pt-2 flex flex-wrap items-center justify-between gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg border border-slate-200"
              >
                Annuler
              </button>

              <div className="flex items-center gap-2">
                {(currentDossier.refEngagement || currentDossier.numVisaCf) && (
                  <button
                    type="button"
                    onClick={() => {
                      const res = DossierStorageService.renvoyerAuMandatement(currentDossier.id, noteEnvoi.trim() || undefined);
                      if (res.success) {
                        onSuccess();
                      } else {
                        setError(res.error || 'Erreur lors du renvoi au mandatement.');
                      }
                    }}
                    className="px-3.5 py-2 text-xs font-semibold text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-300 rounded-lg shadow-2xs flex items-center gap-1.5 transition-all cursor-pointer"
                    title="Renvoyer directement au mandatement sans passer par le CF"
                  >
                    <CreditCard className="w-3.5 h-3.5 text-purple-600" />
                    <span>Renvoyer directement au Mandatement</span>
                  </button>
                )}

                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Enregistrer l'envoi au CF</span>
                </button>
              </div>
            </div>
          </form>
        )}

        {/* Action Type 2: RETOUR CF / REJET CF (Agent) */}
        {actionType === 'RETOUR_CF' && (
          <form onSubmit={handleSubmitRetourCf} className="p-6 space-y-4">
            <div className="p-3.5 bg-rose-50/70 border border-rose-200 rounded-xl text-xs text-rose-950 leading-relaxed space-y-1">
              <div className="font-bold flex items-center gap-1.5 text-rose-800">
                <XCircle className="w-3.5 h-3.5 text-rose-600" />
                <span>Rejet / Retour du dossier {currentDossier.refEngagement ? 'après engagement' : 'par le CF'}</span>
              </div>
              <p>
                L'agent consigne ici le rejet ou le retour du dossier. La date et l'heure sont enregistrées
                automatiquement. L'agent reçoit le dossier et peut soit le renvoyer au CF si nécessaire (sans modifier le visa ni la décision), soit le renvoyer directement au mandatement.
              </p>
            </div>

            {currentDossier.refEngagement && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-950 space-y-1">
                <div className="font-bold flex items-center gap-1.5 text-amber-800">
                  <RotateCcw className="w-3.5 h-3.5 text-amber-600" />
                  <span>Dossier déjà engagé (Réf : {currentDossier.refEngagement})</span>
                </div>
                <p className="text-[11px] text-amber-900 leading-relaxed">
                  Suite à ce retour, l'agent recevra ce dossier et aura le choix : <strong>le renvoyer au CF si nécessaire</strong> (avec N° de Visa CF et N° de Décision conservés et inchangés), ou <strong>le renvoyer directement au mandatement</strong>.
                </p>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-500" />
                Date et heure automatique de rejet par le CF
              </label>
              <input
                type="text"
                required
                value={dateHeureRetour}
                onChange={(e) => setDateHeureRetour(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 font-mono font-medium bg-slate-50"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                Motif du rejet / Remarques du CF (Obligatoire)
              </label>
              <textarea
                rows={3}
                required
                value={motifRetour}
                onChange={(e) => setMotifRetour(e.target.value)}
                placeholder="Ex: Demande de certificat de non-séparation de corps actualisé, discordance de nom..."
                className="w-full px-3 py-2 border border-rose-300 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-rose-500"
              />
            </div>

            <div className="pt-2 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg border border-slate-200"
              >
                Annuler
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-sm flex items-center gap-1.5 transition-all"
              >
                <XCircle className="w-3.5 h-3.5" />
                <span>Enregistrer le rejet du CF</span>
              </button>
            </div>
          </form>
        )}

        {/* Action Type 3: NOTIFIER VISA CF (Agent) */}
        {(actionType === 'VISA_CF' || actionType === 'DECISION_CF') && (
          <form onSubmit={handleSubmitVisaCf} className="p-6 space-y-4">
            <div className="p-3.5 bg-emerald-50/70 border border-emerald-200 rounded-xl text-xs text-emerald-950 leading-relaxed space-y-1">
              <div className="font-bold flex items-center gap-1.5 text-emerald-800">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Dossier visé par le Contrôle Financier</span>
              </div>
              <p>
                L'agent consigne ici le <strong>N° de Visa délivré par le Contrôleur Financier</strong>. Dès notification,
                le dossier est transmis au compte du <strong>Comptable</strong> pour engagement. L'agent pourra ensuite
                établir et enregistrer le <strong>N° de Décision</strong> administrative distinct.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                <Hash className="w-3.5 h-3.5 text-emerald-700" />
                N° de Visa CF (délivré par le Contrôle Financier - Obligatoire)
              </label>
              <input
                type="text"
                required
                value={numVisaCf}
                onChange={(e) => setNumVisaCf(e.target.value)}
                placeholder="Ex: VISA-CF-2026/0540"
                className="w-full px-3 py-2 border border-emerald-300 rounded-lg text-sm font-mono font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Le N° de Décision d'octroi du secours sera rédigé et saisi séparément par l'agent après l'obtention de ce visa.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-500" />
                Date et heure du visa CF
              </label>
              <input
                type="text"
                required
                value={dateHeureVisa}
                onChange={(e) => setDateHeureVisa(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 font-mono bg-slate-50"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Observations sur le visa CF (facultatif)
              </label>
              <input
                type="text"
                value={noteVisa}
                onChange={(e) => setNoteVisa(e.target.value)}
                placeholder="Ex: Visa accordé sans réserve"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="pt-2 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg border border-slate-200"
              >
                Annuler
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm flex items-center gap-1.5 transition-all"
              >
                <Stamp className="w-3.5 h-3.5" />
                <span>Enregistrer le Visa CF (Transmettre au Comptable)</span>
              </button>
            </div>
          </form>
        )}

        {/* Action Type 3 bis: SAISIE DÉCISION (Agent, après visa CF) */}
        {actionType === 'SAISIE_DECISION' && (
          <form onSubmit={handleSubmitDecision} className="p-6 space-y-4">
            <div className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-xl text-xs text-blue-950 leading-relaxed space-y-1">
              <div className="font-bold flex items-center gap-1.5 text-blue-800">
                <FileText className="w-3.5 h-3.5 text-blue-600" />
                <span>Établissement et Saisie de la Décision Administrative</span>
              </div>
              <p>
                Le <strong>Numéro de Décision</strong> et le <strong>Numéro de Visa CF</strong> sont distincts.
                L'agent instructeur rédige et consigne la décision d'attribution du secours suite à l'obtention du visa préalable du Contrôleur Financier.
              </p>
            </div>

            {/* Rappel du visa CF */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between text-xs">
              <div>
                <span className="text-slate-500 block text-[11px]">Visa CF rattaché :</span>
                <span className="font-bold font-mono text-emerald-700">
                  {currentDossier.numVisaCf || currentDossier.numDecision || 'Visa accordé'}
                </span>
              </div>
              <div className="text-right">
                <span className="text-slate-500 block text-[11px]">Date du visa CF :</span>
                <span className="font-mono text-slate-700">
                  {currentDossier.dateVisaCf || '—'}
                </span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                <Hash className="w-3.5 h-3.5 text-blue-700" />
                Numéro de la Décision (Obligatoire)
              </label>
              <input
                type="text"
                required
                value={numDecision}
                onChange={(e) => setNumDecision(e.target.value)}
                placeholder="Ex: DEC-2026/0540 ou N° 0145/MEF/SG/..."
                className="w-full px-3 py-2 border border-blue-300 rounded-lg text-sm font-mono font-bold text-slate-900 focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Numéro officiel de la décision administrative d'octroi du secours.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-500" />
                Date de la Décision
              </label>
              <input
                type="date"
                required
                value={dateDecision}
                onChange={(e) => setDateDecision(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Observations sur la décision (facultatif)
              </label>
              <input
                type="text"
                value={noteDecision}
                onChange={(e) => setNoteDecision(e.target.value)}
                placeholder="Ex: Décision signée par la Direction"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="pt-2 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg border border-slate-200"
              >
                Annuler
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm flex items-center gap-1.5 transition-all"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Enregistrer la Décision</span>
              </button>
            </div>
          </form>
        )}

        {/* Action Type 4: ENGAGEMENT (Comptable) */}
        {actionType === 'ENGAGEMENT' && (
          <form onSubmit={handleSubmitEngagement} className="p-6 space-y-4">
            <div className="p-3.5 bg-indigo-50/70 border border-indigo-200 rounded-xl text-xs text-indigo-950 leading-relaxed space-y-1">
              <div className="font-bold flex items-center gap-1.5 text-indigo-800">
                <BadgeCheck className="w-3.5 h-3.5 text-indigo-600" />
                <span>Engagement comptable par l'Agent Comptable</span>
              </div>
              <p>
                Le dossier est visé par le CF (Visa CF N° <strong>{currentDossier.numVisaCf || currentDossier.numDecision || 'Accordé'}</strong>
                {currentDossier.numDecision ? `, Décision N° ${currentDossier.numDecision}` : ''}).
                Enregistrez la référence d'engagement avant de procéder au mandatement.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                <Hash className="w-3.5 h-3.5 text-indigo-700" />
                Référence d'engagement comptable (Obligatoire)
              </label>
              <input
                type="text"
                required
                value={refEngagement}
                onChange={(e) => setRefEngagement(e.target.value)}
                placeholder="Ex: ENG-2026/0084"
                className="w-full px-3 py-2 border border-indigo-300 rounded-lg text-sm font-mono font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-500" />
                Date et heure d'engagement
              </label>
              <input
                type="text"
                required
                value={dateHeureEngagement}
                onChange={(e) => setDateHeureEngagement(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 font-mono bg-slate-50"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Note d'engagement (facultatif)
              </label>
              <input
                type="text"
                value={noteEngagement}
                onChange={(e) => setNoteEngagement(e.target.value)}
                placeholder="Ex: Imputation sur crédits secours décès 2026..."
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="pt-2 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg border border-slate-200"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={!validation.allowed}
                className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg shadow-sm flex items-center gap-1.5 transition-all"
                title={!validation.allowed ? validation.reason : "Engager le Dossier"}
              >
                <BadgeCheck className="w-3.5 h-3.5" />
                <span>Engager le Dossier</span>
              </button>
            </div>
          </form>
        )}

        {/* Action Type 5: MANDATEMENT (Comptable) */}
        {actionType === 'MANDATEMENT' && (
          <form onSubmit={handleSubmitMandatement} className="p-6 space-y-4">
            <div className="p-3.5 bg-purple-50/70 border border-purple-200 rounded-xl text-xs text-purple-950 space-y-1">
              <div className="font-semibold flex items-center justify-between">
                <span>Visa Contrôle Financier :</span>
                <span className="font-mono text-emerald-700 font-bold">
                  {currentDossier.numVisaCf || 'VISA OBTENU'}
                </span>
              </div>
              {currentDossier.numDecision && (
                <div className="font-semibold flex items-center justify-between">
                  <span>N° Décision Administrative :</span>
                  <span className="font-mono text-blue-700 font-bold">
                    {currentDossier.numDecision}
                  </span>
                </div>
              )}
              {currentDossier.refEngagement && (
                <div className="font-semibold flex items-center justify-between text-slate-600">
                  <span>Réf. Engagement :</span>
                  <span className="font-mono font-bold text-slate-800">{currentDossier.refEngagement}</span>
                </div>
              )}
              <p className="text-[11px] text-purple-800 pt-1">
                Saisissez librement le <strong>prix de mandatement</strong> et le numéro de titre de mandat. Aucun calcul automatique n'est imposé.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                <Banknote className="w-3.5 h-3.5 text-purple-600" />
                Prix / Montant de mandatement (Saisi manuellement sans calcul)
              </label>
              <div className="relative">
                <input
                  type="text"
                  inputMode="numeric"
                  required
                  value={montantMandat}
                  onChange={(e) => {
                    const raw = e.target.value.replace(/\D/g, '');
                    setMontantMandat(raw);
                  }}
                  placeholder="Ex: 500000"
                  className="w-full pl-3 pr-14 py-2.5 border border-purple-300 rounded-lg text-base font-bold text-purple-950 focus:ring-2 focus:ring-purple-500 font-mono"
                />
                <span className="absolute right-3.5 top-3 text-xs font-bold text-purple-600 pointer-events-none">
                  Ariary
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Montant affiché :{' '}
                <strong>{Number(montantMandat || 0).toLocaleString('fr-FR')} Ar</strong>
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-500" />
                  Date de mandatement
                </label>
                <input
                  type="date"
                  required
                  value={dateMandatement}
                  onChange={(e) => setDateMandatement(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                  <Hash className="w-3.5 h-3.5 text-slate-500" />
                  N° Mandat du Trésor
                </label>
                <input
                  type="text"
                  required
                  value={numMandat}
                  onChange={(e) => setNumMandat(e.target.value)}
                  placeholder="Ex: MANDAT-TP-2026/00889"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 font-mono focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Observations de règlement / Caisse (facultatif)
              </label>
              <input
                type="text"
                value={comptaNote}
                onChange={(e) => setComptaNote(e.target.value)}
                placeholder="Ex: Virement compte Trésor / Paiement caisse centrale..."
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <div className="pt-2 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg border border-slate-200"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={!validation.allowed}
                className="px-4 py-2 text-xs font-semibold text-white bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg shadow-sm flex items-center gap-1.5 transition-all"
                title={!validation.allowed ? validation.reason : "Valider le Mandatement"}
              >
                <CreditCard className="w-3.5 h-3.5" />
                <span>Valider le Mandatement</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
