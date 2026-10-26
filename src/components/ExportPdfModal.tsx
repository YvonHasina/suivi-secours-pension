import React, { useState } from 'react';
import {
  X,
  FileDown,
  Printer,
  FileText,
  Calendar,
  CheckCircle2,
  Table,
  Filter,
  Building2,
  Sparkles,
  Download,
} from 'lucide-react';
import { DossierSecours } from '../types';
import { PdfExportService } from '../services/pdfExportService';

interface ExportPdfModalProps {
  dossiers: DossierSecours[];
  allDossiersCount: number;
  activeFilterLabel: string;
  onClose: () => void;
}

export const ExportPdfModal: React.FC<ExportPdfModalProps> = ({
  dossiers,
  allDossiersCount,
  activeFilterLabel,
  onClose,
}) => {
  const currentYear = new Date().getFullYear();
  const defaultTitre = `REGISTRE OFFICIEL NORMALISÉ DES DOSSIERS DE SECOURS AUX DÉCÈS — EXERCICE ${currentYear}`;
  const defaultSousTitre = `Suivi réglementaire en 8 colonnes normalisées (Décret n° 2003-1158) — Ministère de l'Économie et des Finances`;

  const [titre, setTitre] = useState(defaultTitre);
  const [sousTitre, setSousTitre] = useState(defaultSousTitre);
  const [includeFiltreNote, setIncludeFiltreNote] = useState(true);
  const [isExporting, setIsExporting] = useState(false);

  const totalDossiers = dossiers.length;
  const totalMontant = dossiers.reduce(
    (sum, d) => sum + (d.montantMandat || d.montantSecours || 500000),
    0
  );
  const totalVisas = dossiers.filter(
    (d) => d.statut === 'VALIDE_CF' || d.statut === 'ENGAGE' || d.statut === 'MANDATE' || !!d.numVisaCf
  ).length;
  const totalMandates = dossiers.filter((d) => d.statut === 'MANDATE').length;

  const handleDownloadPdf = () => {
    setIsExporting(true);
    try {
      PdfExportService.exportRegistrePdf(dossiers, {
        titrePersonnalise: titre.trim() || defaultTitre,
        sousTitrePersonnalise: sousTitre.trim() || defaultSousTitre,
        filtreActif: includeFiltreNote ? activeFilterLabel : undefined,
      });
      setTimeout(() => {
        setIsExporting(false);
        onClose();
      }, 500);
    } catch (err) {
      console.error('Erreur export PDF:', err);
      setIsExporting(false);
    }
  };

  const handlePrint = () => {
    PdfExportService.printRegistreHtml(
      dossiers,
      includeFiltreNote ? activeFilterLabel : undefined
    );
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header solennel */}
        <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 text-white p-6 relative">
          <button
            onClick={onClose}
            className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            title="Fermer"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3">
            <div className="p-3 bg-rose-500/20 rounded-2xl border border-rose-400/30 text-rose-300">
              <FileDown className="w-6 h-6" />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-500/20 text-blue-300 border border-blue-400/30 mb-1">
                <Building2 className="w-3 h-3" />
                <span>MEF — Direction des Pensions et de la Solde (DPS.4)</span>
              </div>
              <h2 className="text-xl font-bold tracking-tight text-white">
                Exportation du Registre Officiel en .PDF
              </h2>
              <p className="text-xs text-slate-300 mt-0.5">
                Génération du document administratif conforme en 8 colonnes normalisées (format A4 Paysage).
              </p>
            </div>
          </div>
        </div>

        {/* Corps du formulaire de formalisation */}
        <div className="p-6 space-y-5 overflow-y-auto flex-1">
          {/* Aperçu du Titre Formalisé */}
          <div className="p-4 rounded-2xl bg-slate-50 border-2 border-dashed border-blue-200 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-blue-900 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                Aperçu de l'en-tête officiel du document
              </span>
              <span className="text-[10px] text-slate-500 font-mono">
                A4 Paysage (Landscape)
              </span>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 text-center space-y-1 shadow-2xs">
              <div className="text-[10px] font-bold text-slate-700 tracking-wider">
                REPOBLIKAN'I MADAGASIKARA
              </div>
              <div className="text-[9px] italic text-slate-500">
                Fitiavana - Tanindrazana - Fandrosoana
              </div>
              <div className="w-16 h-0.5 bg-blue-900 mx-auto my-1" />
              <div className="text-[9px] font-semibold text-slate-800">
                MINISTÈRE DE L'ÉCONOMIE ET DES FINANCES — DIRECTION DES PENSIONS ET DE LA SOLDE
              </div>
              <div className="mt-2 py-2 px-3 bg-blue-50/70 border border-blue-200 rounded-lg">
                <div className="text-xs font-extrabold text-blue-950 uppercase tracking-tight">
                  {titre || defaultTitre}
                </div>
                <div className="text-[10px] text-slate-600 mt-0.5">
                  {sousTitre || defaultSousTitre}
                  {includeFiltreNote && activeFilterLabel && (
                    <span className="block text-blue-800 font-semibold mt-0.5">
                      Filtre : {activeFilterLabel}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Configuration du Titre */}
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-blue-600" />
                Titre officiel formalisé du document
              </label>
              <input
                type="text"
                value={titre}
                onChange={(e) => setTitre(e.target.value)}
                placeholder="Ex: REGISTRE OFFICIEL NORMALISÉ DES DOSSIERS DE SECOURS AUX DÉCÈS"
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-2xs"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Le titre formalisé apparaîtra en tête du PDF et dans les métadonnées officielles du fichier.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-blue-600" />
                Sous-titre et Référence administrative
              </label>
              <input
                type="text"
                value={sousTitre}
                onChange={(e) => setSousTitre(e.target.value)}
                placeholder="Ex: Suivi réglementaire en 8 colonnes..."
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-xs text-slate-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-2xs"
              />
            </div>

            <label className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer hover:bg-slate-100 transition-colors">
              <input
                type="checkbox"
                checked={includeFiltreNote}
                onChange={(e) => setIncludeFiltreNote(e.target.checked)}
                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300"
              />
              <div className="text-xs">
                <span className="font-semibold text-slate-800">
                  Consigner le filtre actif sous le titre
                </span>
                <span className="text-slate-500 block text-[11px]">
                  Filtre actuel : <strong className="text-blue-700">{activeFilterLabel}</strong>
                </span>
              </div>
            </label>
          </div>

          {/* Statistiques du Registre à exporter */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
            <div className="p-3 bg-blue-50 rounded-xl border border-blue-200 text-center">
              <div className="text-xs text-blue-700 font-medium">Dossiers inclus</div>
              <div className="text-lg font-bold text-blue-900 mt-0.5">
                {totalDossiers}{' '}
                <span className="text-[10px] font-normal text-slate-500">/ {allDossiersCount}</span>
              </div>
            </div>

            <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-center">
              <div className="text-xs text-emerald-700 font-medium">Visés par le CF</div>
              <div className="text-lg font-bold text-emerald-900 mt-0.5">{totalVisas}</div>
            </div>

            <div className="p-3 bg-purple-50 rounded-xl border border-purple-200 text-center">
              <div className="text-xs text-purple-700 font-medium">Mandatés Trésor</div>
              <div className="text-lg font-bold text-purple-900 mt-0.5">{totalMandates}</div>
            </div>

            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-center">
              <div className="text-xs text-amber-700 font-medium">Montant Total</div>
              <div className="text-xs font-bold text-amber-950 mt-1 truncate" title={`${totalMontant.toLocaleString('fr-FR')} Ar`}>
                {totalMontant.toLocaleString('fr-FR')} Ar
              </div>
            </div>
          </div>

          {/* Rappel des 8 colonnes normalisées */}
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5 text-xs text-slate-700">
            <div className="font-bold text-slate-900 flex items-center gap-1.5">
              <Table className="w-3.5 h-3.5 text-slate-600" />
              <span>Conformité réglementaire des 8 colonnes incluses :</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1 text-[10px] text-slate-600">
              <div className="flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                <span>1. N° Dossier et Arrivée</span>
              </div>
              <div className="flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                <span>2. Ayant Droit Demandeur</span>
              </div>
              <div className="flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                <span>3. Agent Défunt et Min.</span>
              </div>
              <div className="flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                <span>4. Indice Matricule (IM)</span>
              </div>
              <div className="flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                <span>5. Date Envoi / Retour CF</span>
              </div>
              <div className="flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                <span>6. Visa CF et Décision</span>
              </div>
              <div className="flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                <span>7. Mandatement et Prix</span>
              </div>
              <div className="flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                <span>8. Statut et Observations</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer avec boutons d'actions */}
        <div className="bg-slate-50 border-t border-slate-200 p-4 px-6 flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-200/60 rounded-xl transition-all"
          >
            Annuler
          </button>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 rounded-xl border border-slate-300 shadow-2xs transition-all cursor-pointer"
              title="Ouvrir la page d'impression avec mise en page solennelle"
            >
              <Printer className="w-3.5 h-3.5 text-slate-600" />
              <span>Aperçu et Impression</span>
            </button>

            <button
              type="button"
              disabled={isExporting || totalDossiers === 0}
              onClick={handleDownloadPdf}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 active:bg-rose-800 rounded-xl shadow-md transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download className="w-4 h-4 text-white" />
              <span>
                {isExporting ? 'Génération en cours...' : 'Télécharger le Registre (.PDF)'}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
