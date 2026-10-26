import React, { useState } from 'react';
import { Trash2, AlertTriangle, X, ShieldAlert, FileText, Check } from 'lucide-react';
import { DossierSecours, UserRole } from '../types';

interface DossierDeleteModalProps {
  isOpen: boolean;
  dossier: DossierSecours | null;
  activeRole: UserRole;
  onClose: () => void;
  onConfirmDelete: (dossierId: string, motif: string) => void;
}

export const DossierDeleteModal: React.FC<DossierDeleteModalProps> = ({
  isOpen,
  dossier,
  activeRole,
  onClose,
  onConfirmDelete,
}) => {
  const [motifSelection, setMotifSelection] = useState<string>('Erreur matérielle de saisie ou doublon');
  const [customMotif, setCustomMotif] = useState<string>('');
  const [confirmedCheckbox, setConfirmedCheckbox] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  if (!isOpen || !dossier) return null;

  const finalMotif =
    motifSelection === 'Autre motif administratif'
      ? customMotif.trim() || 'Motif non spécifié'
      : motifSelection;

  const handleDelete = () => {
    if (!confirmedCheckbox) return;
    setIsSubmitting(true);
    try {
      onConfirmDelete(dossier.id, finalMotif);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      id="delete-dossier-modal-backdrop"
      className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-150"
    >
      <div
        id="delete-dossier-modal-box"
        className="card-3d bg-white rounded-2xl shadow-2xl border border-rose-200/80 w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-150"
      >
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-rose-950 via-rose-900 to-slate-900 text-white flex items-center justify-between border-b border-rose-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-600/90 text-white flex items-center justify-center shadow-[0_2px_8px_rgba(225,29,72,0.4),inset_0_1px_0_rgba(255,255,255,0.3)]">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white tracking-tight">
                  Supprimer le Dossier
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                  Action Irréversible
                </span>
              </div>
              <p className="text-xs text-rose-200/80 font-mono">
                Réf : {dossier.numeroDossier}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-rose-300 hover:text-white hover:bg-rose-800/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Dossier Summary Card */}
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/90 text-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-900">Dossier sélectionné :</span>
              <span className="font-mono font-bold text-blue-600 px-2 py-0.5 bg-blue-50 rounded border border-blue-200">
                {dossier.numeroDossier}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-200/70 text-[11px]">
              <div>
                <span className="text-slate-400 block font-medium">Agent Défunt :</span>
                <span className="font-bold text-slate-800">
                  IM {dossier.defunt.im} — {dossier.defunt.nom} {dossier.defunt.prenoms}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">Bénéficiaire (Ayant droit) :</span>
                <span className="font-bold text-slate-800">
                  {dossier.demandeur.nom} {dossier.demandeur.prenoms} ({dossier.demandeur.lienParente.replace(/_/g, ' ')})
                </span>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">Statut Actuel :</span>
                <span className="font-semibold text-slate-700">
                  {dossier.statut.replace(/_/g, ' ')}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">Montant :</span>
                <span className="font-bold text-emerald-700">
                  {dossier.montantSecours.toLocaleString()} Ar
                </span>
              </div>
            </div>
          </div>

          {/* Warning Banner */}
          <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div className="text-xs text-rose-900 space-y-1">
              <strong className="block font-bold">Avertissement Réglementaire :</strong>
              <p className="text-[11px] text-rose-800 leading-relaxed">
                Ce dossier sera définitivement retiré du Registre officiel des secours aux décès. L'historique des pièces et des éventuelles vérifications sera purgé. Une notification de suppression sera inscrite au <strong>Journal d'audit de sécurité</strong> sous votre nom ({activeRole}).
              </p>
            </div>
          </div>

          {/* Reason / Motif Selection */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700">
              Motif officiel de la suppression <span className="text-rose-500">*</span>
            </label>
            <select
              value={motifSelection}
              onChange={(e) => setMotifSelection(e.target.value)}
              className="w-full text-xs bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-rose-500 shadow-2xs"
            >
              <option value="Erreur matérielle de saisie ou doublon">
                Erreur matérielle de saisie ou doublon
              </option>
              <option value="Annulation formelle de la demande par l'ayant droit">
                Annulation formelle de la demande par l'ayant droit
              </option>
              <option value="Dossier irrecevable (défaut rédhibitoire de qualité)">
                Dossier irrecevable (défaut rédhibitoire de qualité)
              </option>
              <option value="Dossier transféré vers une autre direction">
                Dossier transféré vers une autre direction
              </option>
              <option value="Autre motif administratif">
                Autre motif administratif (préciser ci-dessous)
              </option>
            </select>

            {motifSelection === 'Autre motif administratif' && (
              <textarea
                value={customMotif}
                onChange={(e) => setCustomMotif(e.target.value)}
                placeholder="Indiquez les circonstances justificatives de la suppression..."
                rows={2}
                className="w-full text-xs bg-white border border-slate-300 rounded-xl p-2.5 text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-rose-500 shadow-2xs mt-1.5"
              />
            )}
          </div>

          {/* Explicit Confirmation Checkbox */}
          <label className="flex items-start gap-2.5 p-3 rounded-xl border border-slate-200 bg-slate-50/70 cursor-pointer hover:bg-slate-100 transition-colors">
            <input
              type="checkbox"
              checked={confirmedCheckbox}
              onChange={(e) => setConfirmedCheckbox(e.target.checked)}
              className="mt-0.5 w-4 h-4 rounded text-rose-600 focus:ring-rose-500 border-slate-300"
            />
            <span className="text-xs text-slate-700 font-medium leading-tight">
              Je confirme vouloir supprimer définitivement le dossier <strong className="font-mono text-rose-700">{dossier.numeroDossier}</strong> et j'atteste de l'exactitude du motif renseigné.
            </span>
          </label>
        </div>

        {/* Footer Buttons */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="btn-3d-secondary px-4 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 rounded-xl border border-slate-300"
          >
            Annuler
          </button>
          <button
            type="button"
            disabled={!confirmedCheckbox || isSubmitting}
            onClick={handleDelete}
            className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl shadow-[0_3px_0_rgb(190,18,60),0_4px_10px_rgba(225,29,72,0.3)] active:translate-y-0.5 transition-all flex items-center gap-1.5"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Supprimer définitivement</span>
          </button>
        </div>
      </div>
    </div>
  );
};
