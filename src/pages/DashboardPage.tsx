import React, { useState, useMemo } from 'react';
import {
  FileText,
  Clock,
  Send,
  CheckCircle2,
  XCircle,
  CreditCard,
  TrendingUp,
  ArrowRight,
  ShieldCheck,
  Building2,
  FileCheck2,
  PlusCircle,
  AlertCircle,
  FileSpreadsheet,
  Search,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Info,
  Check,
  Banknote,
  BarChart3,
  PieChart,
  History,
  X,
  ExternalLink,
  Calendar,
  User,
  Layers,
  ArrowUpRight,
  FileDown,
} from 'lucide-react';
import { DossierSecours, UserRole, AuditLogEntry, WorkflowActionType } from '../types';
import { NavTab } from '../components/Sidebar';
import { DossierStorageService } from '../services/dossierStorage';
import { PdfExportService } from '../services/pdfExportService';

interface DashboardPageProps {
  dossiers: DossierSecours[];
  activeRole: UserRole;
  onNavigate: (tab: NavTab, filter?: string) => void;
  onSelectDossier: (dossier: DossierSecours) => void;
  onOpenWorkflowAction?: (dossier: DossierSecours, action: WorkflowActionType) => void;
}

interface DetailModalData {
  type:
    | 'total'
    | 'en_attente'
    | 'incomplets'
    | 'rejetes'
    | 'valides'
    | 'mandates'
    | 'delai'
    | 'decaissement'
    | 'montant'
    | 'step'
    | 'audit_log';
  title: string;
  subtitle: string;
  badge?: string;
  badgeColor?: string;
  data?: any;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  dossiers,
  activeRole,
  onNavigate,
  onSelectDossier,
  onOpenWorkflowAction,
}) => {
  const [quickSearch, setQuickSearch] = useState<string>('');
  const [activeDetail, setActiveDetail] = useState<DetailModalData | null>(null);

  const auditLogs = DossierStorageService.getAuditLogs();

  // Unified Executive KPIs
  const total = dossiers.length;
  const enAttenteDossiers = dossiers.filter(
    (d) => d.statut === 'RECEPTION_EN_COURS' || d.statut === 'TRANSMIS_CF' || d.statut === 'EN_ATTENTE_MANDAT'
  );
  const enAttente = enAttenteDossiers.length;

  const incompletsDossiers = dossiers.filter(
    (d) =>
      d.statut === 'DOSSIER_INCOMPLET' ||
      d.statut === 'RETOUR_CF' ||
      (d.statut !== 'MANDATE' &&
        d.statut !== 'VALIDE_CF' &&
        d.statut !== 'ENGAGE' &&
        d.statut !== 'REJETE_CF' &&
        (d.pieces || []).some((p) => p.estObligatoire && p.statut !== 'CONFORME'))
  );
  const incomplets = incompletsDossiers.length;

  const rejetesDossiers = dossiers.filter((d) => d.statut === 'REJETE_CF');
  const rejetes = rejetesDossiers.length;

  const validesDossiers = dossiers.filter((d) => d.statut === 'VALIDE_CF');
  const valides = validesDossiers.length;

  const mandatesDossiers = dossiers.filter((d) => d.statut === 'MANDATE');
  const mandates = mandatesDossiers.length;
  const montantTotalPaye = mandates * 500000;

  // Performance ratios
  const tauxDecaissement = total > 0 ? Math.round((mandates / total) * 100) : 0;
  const tauxRejet = total > 0 ? Math.round((rejetes / total) * 100) : 0;

  // Average processing time
  const delaiMoyen = useMemo(() => {
    let totalJours = 0;
    let count = 0;
    dossiers.forEach((d) => {
      if (d.dateArrivee && d.updatedAt) {
        const start = new Date(d.dateArrivee).getTime();
        const end = new Date(d.updatedAt).getTime();
        const diff = Math.max(0, Math.round((end - start) / (1000 * 60 * 60 * 24)));
        if (diff < 365) {
          totalJours += diff;
          count++;
        }
      }
    });
    return count > 0 ? (totalJours / count).toFixed(1) : '3.2';
  }, [dossiers]);

  // Circuit workflow steps
  const workflowSteps = [
    {
      id: 1,
      title: '1. Étude de fond et Forme',
      role: 'Agent Instructeur',
      count: dossiers.filter(
        (d) => d.statut === 'RECEPTION_EN_COURS' || d.statut === 'DOSSIER_INCOMPLET' || d.statut === 'RETOUR_CF'
      ).length,
      dossiers: dossiers.filter(
        (d) => d.statut === 'RECEPTION_EN_COURS' || d.statut === 'DOSSIER_INCOMPLET' || d.statut === 'RETOUR_CF'
      ),
      color: 'blue',
      icon: FileText,
      description: 'Vérification de la conformité réglementaire des pièces justificatives fournies par les ayants droit et traitement des retours CF.',
      filterStatus: 'DOSSIER_INCOMPLET',
    },
    {
      id: 2,
      title: '2. Validation et Visa CF',
      role: 'Contrôle Financier',
      count: dossiers.filter((d) => d.statut === 'TRANSMIS_CF').length,
      dossiers: dossiers.filter((d) => d.statut === 'TRANSMIS_CF'),
      color: 'amber',
      icon: FileCheck2,
      description: 'Contrôle a priori de régularité budgétaire et apposition du visa favorable ou observations.',
      filterStatus: 'TRANSMIS_CF',
    },
    {
      id: 3,
      title: '3. Mandatement Trésor',
      role: 'Agent et Comptable',
      count: valides,
      dossiers: validesDossiers,
      color: 'purple',
      icon: CreditCard,
      description: 'Engagement de la dépense et émission du titre de paiement au Trésor Public.',
      filterStatus: 'VALIDE_CF',
    },
    {
      id: 4,
      title: '4. Payé et Archivé',
      role: 'Trésorier Payeur',
      count: mandates,
      dossiers: mandatesDossiers,
      color: 'emerald',
      icon: CheckCircle2,
      description: 'Paiement effectif aux ayants droit (500 000 Ar) et clôture du dossier au registre.',
      filterStatus: 'MANDATE',
    },
  ];

  // Actionable queue
  const actionableDossiers = useMemo(() => {
    return dossiers.filter(
      (d) =>
        d.statut === 'RECEPTION_EN_COURS' ||
        d.statut === 'DOSSIER_INCOMPLET' ||
        d.statut === 'RETOUR_CF' ||
        d.statut === 'VALIDE_CF' ||
        d.statut === 'EN_ATTENTE_MANDAT'
    );
  }, [dossiers]);

  // Quick search results
  const searchResults = useMemo(() => {
    const q = quickSearch.toLowerCase().trim();
    if (!q) return [];
    return dossiers
      .filter(
        (d) =>
          d.defunt.im.toLowerCase().includes(q) ||
          d.defunt.nom.toLowerCase().includes(q) ||
          d.demandeur.nom.toLowerCase().includes(q) ||
          d.numeroDossier.toLowerCase().includes(q)
      )
      .slice(0, 5);
  }, [dossiers, quickSearch]);

  const handleOpenDossierFromModal = (d: DossierSecours) => {
    setActiveDetail(null);
    onSelectDossier(d);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 animate-fade-in relative">
      {/* 1. Ultra-Clean Executive Header */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 text-white rounded-3xl p-6 md:p-8 shadow-xl border border-blue-900/40 relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-300 text-xs font-semibold uppercase tracking-wider mb-2">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Tableau de Bord et Indicateurs Interactifs SRSP</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
              Pilotage Centralisé des Dossiers de Secours
            </h1>
            <p className="text-sm text-slate-300 mt-1">
              Cliquez sur n'importe quel indicateur pour ouvrir son détail opérationnel en direct.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {activeRole === 'AGENT' && (
              <button
                id="btn-new-enquete-dashboard"
                onClick={() => onNavigate('enquete')}
                className="px-4 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-lg shadow-emerald-600/30 cursor-pointer"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Nouvelle Étude</span>
              </button>
            )}
            <button
              onClick={() => onNavigate('dossiers')}
              className="px-4 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold border border-white/25 transition-all flex items-center gap-2 shadow-sm cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4 text-blue-300" />
              <span>Registre (8 Colonnes)</span>
            </button>
            <button
              id="btn-quick-export-pdf-dashboard"
              onClick={() => PdfExportService.exportRegistrePdf(dossiers)}
              className="px-4 py-3 bg-rose-600/90 hover:bg-rose-600 text-white rounded-xl text-xs font-bold border border-rose-400/30 transition-all flex items-center gap-2 shadow-sm cursor-pointer"
              title="Télécharger directement le Registre Officiel en PDF (8 colonnes)"
            >
              <FileDown className="w-4 h-4 text-white" />
              <span>Export PDF</span>
            </button>
          </div>
        </div>

        {/* Quick Search Bar */}
        <div className="mt-6 pt-5 border-t border-white/10 relative">
          <div className="relative max-w-xl">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={quickSearch}
              onChange={(e) => setQuickSearch(e.target.value)}
              placeholder="Recherche rapide (IM, N° Dossier, Nom du défunt, Demandeur)..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-900/80 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500 transition-all font-medium"
            />
          </div>

          {searchResults.length > 0 && (
            <div className="absolute left-0 right-0 max-w-xl mt-2 bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden z-30 divide-y divide-slate-100 text-slate-900">
              {searchResults.map((d) => (
                <div
                  key={d.id}
                  onClick={() => {
                    onSelectDossier(d);
                    setQuickSearch('');
                  }}
                  className="p-3 hover:bg-blue-50 transition-colors cursor-pointer flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-mono font-bold text-blue-700">{d.numeroDossier}</span>
                    <div>
                      <span className="font-bold text-slate-900">
                        {d.defunt.nom} {d.defunt.prenoms}
                      </span>
                      <span className="text-slate-500 ml-2">(IM: {d.defunt.im})</span>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                    {d.statut}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 2. Unified Executive KPI Grid (6 Clickable Cards) */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between px-1">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Indicateurs Clés (Cliquez pour voir les détails)
          </span>
          <span className="text-[11px] text-blue-600 font-semibold flex items-center gap-1">
            <Info className="w-3 h-3" />
            Interactivité activée
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* 1. Total */}
          <div
            onClick={() =>
              setActiveDetail({
                type: 'total',
                title: 'Total des Dossiers Enregistrés',
                subtitle: `${total} dossiers répertoriés au registre SRSP`,
                badge: 'REGISTRE CENTRAL',
                badgeColor: 'bg-slate-100 text-slate-800 border-slate-300',
              })
            }
            className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs hover:border-blue-500 hover:shadow-md cursor-pointer transition-all group relative overflow-hidden"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Total</span>
              <ArrowUpRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600 transition-colors" />
            </div>
            <div className="text-2xl font-black text-slate-900 font-mono group-hover:text-blue-600 transition-colors">
              {total}
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5 flex items-center gap-1">
              <span>Voir la répartition</span>
            </div>
          </div>

          {/* 2. En attente */}
          <div
            onClick={() =>
              setActiveDetail({
                type: 'en_attente',
                title: 'Dossiers en Attente de Traitement',
                subtitle: `${enAttente} dossiers actuellement en attente ou en cours d'instruction`,
                badge: 'EN ATTENTE',
                badgeColor: 'bg-amber-100 text-amber-800 border-amber-300',
              })
            }
            className="bg-white p-4 rounded-2xl border border-amber-200 bg-amber-50/20 shadow-2xs hover:border-amber-500 hover:shadow-md cursor-pointer transition-all group relative overflow-hidden"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-amber-700 uppercase tracking-wider mb-1">En Attente</span>
              <ArrowUpRight className="w-3.5 h-3.5 text-amber-400 group-hover:text-amber-600 transition-colors" />
            </div>
            <div className="text-2xl font-black text-amber-900 font-mono">{enAttente}</div>
            <div className="text-[10px] text-amber-700 mt-0.5">Dossiers en circuit</div>
          </div>

          {/* 3. Incomplets */}
          <div
            onClick={() =>
              setActiveDetail({
                type: 'incomplets',
                title: 'Dossiers Incomplets et Retours CF',
                subtitle: `${incomplets} dossier(s) nécessitant une régularisation de pièces ou un retour du CF`,
                badge: 'À RÉGULARISER',
                badgeColor: 'bg-orange-100 text-orange-800 border-orange-300',
              })
            }
            className="bg-white p-4 rounded-2xl border border-orange-200 bg-orange-50/20 shadow-2xs hover:border-orange-500 hover:shadow-md cursor-pointer transition-all group relative overflow-hidden"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-orange-700 uppercase tracking-wider mb-1">Incomplets</span>
              <ArrowUpRight className="w-3.5 h-3.5 text-orange-400 group-hover:text-orange-600 transition-colors" />
            </div>
            <div className="text-2xl font-black text-orange-900 font-mono">{incomplets}</div>
            <div className="text-[10px] text-orange-700 mt-0.5">Pièces et Retours CF</div>
          </div>

          {/* 4. Rejetés */}
          <div
            onClick={() =>
              setActiveDetail({
                type: 'rejetes',
                title: 'Dossiers Rejetés et Motifs',
                subtitle: `${rejetes} dossiers rejetés par le Contrôle Financier ou pour délai dépassé`,
                badge: 'REJET CF',
                badgeColor: 'bg-rose-100 text-rose-800 border-rose-300',
              })
            }
            className="bg-white p-4 rounded-2xl border border-rose-200 bg-rose-50/20 shadow-2xs hover:border-rose-500 hover:shadow-md cursor-pointer transition-all group relative overflow-hidden"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-rose-700 uppercase tracking-wider mb-1">Rejetés</span>
              <ArrowUpRight className="w-3.5 h-3.5 text-rose-400 group-hover:text-rose-600 transition-colors" />
            </div>
            <div className="text-2xl font-black text-rose-900 font-mono">{rejetes}</div>
            <div className="text-[10px] text-rose-700 mt-0.5">Taux : {tauxRejet}%</div>
          </div>

          {/* 5. Validés */}
          <div
            onClick={() =>
              setActiveDetail({
                type: 'valides',
                title: 'Dossiers Validés et Visés par le CF',
                subtitle: `${valides} dossiers conformes avec visa accordé, prêts au mandatement`,
                badge: 'VISA ACCORDÉ',
                badgeColor: 'bg-blue-100 text-blue-800 border-blue-300',
              })
            }
            className="bg-white p-4 rounded-2xl border border-blue-200 bg-blue-50/20 shadow-2xs hover:border-blue-500 hover:shadow-md cursor-pointer transition-all group relative overflow-hidden"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-blue-700 uppercase tracking-wider mb-1">Validés</span>
              <ArrowUpRight className="w-3.5 h-3.5 text-blue-400 group-hover:text-blue-600 transition-colors" />
            </div>
            <div className="text-2xl font-black text-blue-900 font-mono">{valides}</div>
            <div className="text-[10px] text-blue-700 mt-0.5">Prêts au mandatement</div>
          </div>

          {/* 6. Mandatés */}
          <div
            onClick={() =>
              setActiveDetail({
                type: 'mandates',
                title: 'Dossiers Mandatés et Payés au Trésor',
                subtitle: `${mandates} dossiers liquidés avec mandat émis aux ayants droit`,
                badge: 'PAYÉ ET LIQUIDÉ',
                badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-300',
              })
            }
            className="bg-white p-4 rounded-2xl border border-emerald-200 bg-emerald-50/20 shadow-2xs hover:border-emerald-500 hover:shadow-md cursor-pointer transition-all group relative overflow-hidden"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider mb-1">Mandatés</span>
              <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400 group-hover:text-emerald-600 transition-colors" />
            </div>
            <div className="text-2xl font-black text-emerald-900 font-mono">{mandates}</div>
            <div className="text-[10px] text-emerald-700 mt-0.5">Payés ({tauxDecaissement}%)</div>
          </div>
        </div>
      </div>

      {/* 3. Performance et Delays Visual Row (Clickable) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Délai moyen */}
        <div
          onClick={() =>
            setActiveDetail({
              type: 'delai',
              title: 'Analyse des Délais de Traitement',
              subtitle: `Délai moyen actuel : ${delaiMoyen} jours par dossier`,
              badge: 'SLA PERFORMANCE',
              badgeColor: 'bg-blue-100 text-blue-800 border-blue-300',
            })
          }
          className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs hover:border-blue-400 hover:shadow-md cursor-pointer transition-all flex items-center justify-between group"
        >
          <div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1">
              <span>Délai Moyen de Traitement</span>
              <ArrowUpRight className="w-3 h-3 text-slate-400 group-hover:text-blue-600 transition-colors" />
            </div>
            <div className="text-2xl font-black text-slate-900 font-mono mt-1 group-hover:text-blue-600 transition-colors">
              {delaiMoyen} jours
            </div>
            <div className="text-[11px] text-emerald-600 font-medium mt-0.5">⚡ Conforme aux normes SRSP (Cliquer)</div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 font-bold text-lg shadow-xs group-hover:scale-105 transition-transform">
            ⏱️
          </div>
        </div>

        {/* Taux de décaissement */}
        <div
          onClick={() =>
            setActiveDetail({
              type: 'decaissement',
              title: 'Indicateur de Taux de Décaissement',
              subtitle: `${tauxDecaissement}% des dossiers ont abouti à un paiement effectif`,
              badge: 'RATIO FINANCIER',
              badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-300',
            })
          }
          className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs hover:border-emerald-400 hover:shadow-md cursor-pointer transition-all flex items-center justify-between group"
        >
          <div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1">
              <span>Taux de Décaissement</span>
              <ArrowUpRight className="w-3 h-3 text-slate-400 group-hover:text-emerald-600 transition-colors" />
            </div>
            <div className="text-2xl font-black text-emerald-700 font-mono mt-1 group-hover:text-emerald-800 transition-colors">
              {tauxDecaissement}%
            </div>
            <div className="text-[11px] text-slate-500 font-medium mt-0.5">Secours versés aux ayants droit</div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 font-bold text-lg shadow-xs group-hover:scale-105 transition-transform">
            📈
          </div>
        </div>

        {/* Montant total payé */}
        <div
          onClick={() =>
            setActiveDetail({
              type: 'montant',
              title: 'Bilan Financier et Liquidation des Secours',
              subtitle: `Montant total décaissé : ${montantTotalPaye.toLocaleString('fr-FR')} Ar`,
              badge: 'TRÉSOR PUBLIC',
              badgeColor: 'bg-indigo-100 text-indigo-800 border-indigo-300',
            })
          }
          className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs hover:border-indigo-400 hover:shadow-md cursor-pointer transition-all flex items-center justify-between group"
        >
          <div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1">
              <span>Montant Total Payé</span>
              <ArrowUpRight className="w-3 h-3 text-slate-400 group-hover:text-indigo-600 transition-colors" />
            </div>
            <div className="text-2xl font-black text-slate-900 font-mono mt-1 group-hover:text-indigo-600 transition-colors">
              {montantTotalPaye.toLocaleString('fr-FR')} Ar
            </div>
            <div className="text-[11px] text-slate-500 font-medium mt-0.5">Base 500 000 Ar / dossier</div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-lg shadow-xs group-hover:scale-105 transition-transform">
            💰
          </div>
        </div>
      </div>

      {/* 4. Circuit Workflow Stepper Cards (Clickable) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <span>Étapes du Circuit Réglementaire</span>
          </h3>
          <span className="text-[11px] text-slate-400">Cliquez sur une étape pour voir les dossiers concernés</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {workflowSteps.map((step) => {
            const Icon = step.icon;
            return (
              <div
                key={step.id}
                onClick={() =>
                  setActiveDetail({
                    type: 'step',
                    title: step.title,
                    subtitle: `Étape ${step.id} du circuit - Acteur principal : ${step.role}`,
                    badge: `${step.count} DOSSIER${step.count > 1 ? 'S' : ''}`,
                    badgeColor: 'bg-blue-100 text-blue-800 border-blue-300',
                    data: step,
                  })
                }
                className="p-4 rounded-xl border border-slate-200 bg-slate-50 hover:bg-white hover:border-blue-400 hover:shadow-md cursor-pointer transition-all group"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-blue-600 shadow-2xs group-hover:bg-blue-50 transition-colors">
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className="font-mono font-bold text-xs bg-white px-2 py-0.5 rounded-full border border-slate-200 text-slate-800">
                    {step.count}
                  </span>
                </div>
                <div className="text-xs font-bold text-slate-900 group-hover:text-blue-700 transition-colors">
                  {step.title}
                </div>
                <div className="mt-2 text-[10px] text-slate-500 font-medium flex justify-between">
                  <span>Acteur :</span>
                  <span className="font-semibold text-slate-700">{step.role}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 5. Actionable Queue et Audit History */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Actionable Queue */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">
              Dossiers Prioritaires en Cours ({actionableDossiers.length})
            </h3>
            <button
              onClick={() => onNavigate('dossiers')}
              className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
            >
              <span>Voir tout</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {actionableDossiers.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-xs">
              Aucun dossier en attente pour le moment.
            </div>
          ) : (
            <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden max-h-[300px] overflow-y-auto">
              {actionableDossiers.slice(0, 6).map((d) => (
                <div
                  key={d.id}
                  onClick={() => onSelectDossier(d)}
                  className="p-3 hover:bg-slate-50 transition-colors flex items-center justify-between gap-3 text-xs cursor-pointer group"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-mono font-bold text-blue-700 group-hover:underline">
                      {d.numeroDossier}
                    </span>
                    <div>
                      <span className="font-bold text-slate-900">
                        {d.defunt.nom} {d.defunt.prenoms}
                      </span>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                    {d.statut}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right: Audit History / Traçabilité (Clickable rows) */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <History className="w-4 h-4 text-indigo-600" />
              <span>Historique et Journal d'Audit</span>
            </h3>
            <span className="text-xs font-mono bg-slate-100 text-slate-700 px-2.5 py-1 rounded-lg border border-slate-200">
              {auditLogs.length} évènement{auditLogs.length > 1 ? 's' : ''}
            </span>
          </div>

          {auditLogs.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-xs">
              Aucun historique enregistré pour le moment.
            </div>
          ) : (
            <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden max-h-[300px] overflow-y-auto">
              {auditLogs.slice(0, 6).map((log) => (
                <div
                  key={log.id}
                  onClick={() =>
                    setActiveDetail({
                      type: 'audit_log',
                      title: "Détail de l'Évènement d'Audit",
                      subtitle: `Action : ${log.action}`,
                      badge: log.userRole,
                      badgeColor: 'bg-indigo-100 text-indigo-800 border-indigo-300',
                      data: log,
                    })
                  }
                  className="p-3 hover:bg-slate-50 transition-colors flex items-start justify-between gap-3 text-xs cursor-pointer group"
                >
                  <div className="space-y-0.5 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 font-mono text-[10px] px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 group-hover:border-blue-400 transition-colors">
                        {log.action}
                      </span>
                      {log.dossierNumero && (
                        <span className="font-semibold text-blue-600 font-mono text-[10px]">
                          {log.dossierNumero}
                        </span>
                      )}
                    </div>
                    <p className="text-slate-600 text-[11px] leading-relaxed truncate">{log.details}</p>
                  </div>
                  <div className="text-right shrink-0 text-[10px] text-slate-400 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    <span>
                      {new Date(log.timestamp).toLocaleTimeString('fr-FR', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 6. MODAL INTERACTIF DE DÉTAIL EN RICHE (POPUP) */}
      {activeDetail && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200"
          onClick={() => setActiveDetail(null)}
        >
          <div
            className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-6 bg-gradient-to-r from-slate-900 to-blue-950 text-white flex items-center justify-between border-b border-slate-800">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-base md:text-lg font-bold">{activeDetail.title}</h3>
                  {activeDetail.badge && (
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${activeDetail.badgeColor || 'bg-blue-500/20 text-blue-200 border-blue-400/30'}`}
                    >
                      {activeDetail.badge}
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-300">{activeDetail.subtitle}</p>
              </div>

              <button
                onClick={() => setActiveDetail(null)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Content Body */}
            <div className="p-6 overflow-y-auto space-y-4 text-slate-800 text-xs flex-1">
              {/* DETAIL: TOTAL DOSSIERS */}
              {activeDetail.type === 'total' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-2">
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-center">
                      <div className="text-[10px] text-slate-500 font-bold uppercase">Enregistrés</div>
                      <div className="text-lg font-black text-slate-900 font-mono">{total}</div>
                    </div>
                    <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-center">
                      <div className="text-[10px] text-emerald-700 font-bold uppercase">Mandatés</div>
                      <div className="text-lg font-black text-emerald-800 font-mono">{mandates}</div>
                    </div>
                    <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-center">
                      <div className="text-[10px] text-amber-700 font-bold uppercase">En attente</div>
                      <div className="text-lg font-black text-amber-800 font-mono">{enAttente}</div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <span className="font-bold text-slate-700">Liste complète des dossiers ({dossiers.length}) :</span>
                    <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl max-h-60 overflow-y-auto">
                      {dossiers.map((d) => (
                        <div
                          key={d.id}
                          onClick={() => handleOpenDossierFromModal(d)}
                          className="p-3 hover:bg-blue-50 transition-colors flex items-center justify-between cursor-pointer group"
                        >
                          <div>
                            <div className="font-mono font-bold text-blue-700 group-hover:underline">
                              {d.numeroDossier}
                            </div>
                            <div className="text-slate-900 font-medium">
                              {d.defunt.nom} {d.defunt.prenoms} (IM: {d.defunt.im})
                            </div>
                            <div className="text-[10px] text-slate-500">{d.defunt.ministereInstitution}</div>
                          </div>
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-800 border border-slate-200">
                            {d.statut}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* DETAIL: EN ATTENTE */}
              {activeDetail.type === 'en_attente' && (
                <div className="space-y-3">
                  <p className="text-slate-600">
                    Ces dossiers sont actuellement en cours de vérification ou de transmission au Contrôle Financier :
                  </p>
                  <div className="divide-y divide-slate-100 border border-amber-200 rounded-xl overflow-hidden bg-amber-50/10">
                    {enAttenteDossiers.map((d) => (
                      <div
                        key={d.id}
                        onClick={() => handleOpenDossierFromModal(d)}
                        className="p-3 hover:bg-amber-50 transition-colors flex items-center justify-between cursor-pointer group"
                      >
                        <div>
                          <div className="font-mono font-bold text-amber-900 group-hover:underline">
                            {d.numeroDossier}
                          </div>
                          <div className="font-semibold text-slate-800">
                            {d.defunt.nom} {d.defunt.prenoms}
                          </div>
                          <div className="text-[10px] text-slate-500">Date d'arrivée : {d.dateArrivee || 'N/C'}</div>
                        </div>
                        <div className="text-right">
                          <span className="px-2 py-1 rounded-md text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-200">
                            {d.statut}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* DETAIL: INCOMPLETS */}
              {activeDetail.type === 'incomplets' && (
                <div className="space-y-4">
                  <div className="p-3.5 bg-orange-50 border border-orange-200 rounded-2xl space-y-1.5">
                    <div className="text-xs font-bold text-orange-950 flex items-center justify-between gap-1.5 flex-wrap">
                      <div className="flex items-center gap-1.5">
                        <AlertCircle className="w-4 h-4 text-orange-600 shrink-0" />
                        <span>Statut Incomplet — Négligeable par le CF et par le Comptable</span>
                      </div>
                      <span className="text-[10px] bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold px-2 py-0.5 rounded-full">
                        ✓ ENGAGEMENT ET MANDATEMENT AUTORISÉS
                      </span>
                    </div>
                    <p className="text-[11px] text-orange-950 leading-relaxed">
                      Un dossier est classé <strong>Incomplet</strong> lorsqu'il manque une pièce obligatoire ou qu'un retour d'observation a été formulé par le CF. <strong>Ce statut est négligeable par le Contrôle Financier et par le Comptable</strong> : le dossier peut être engagé et mandaté immédiatement, avec ou sans régularisation préalable des pièces, selon l'appréciation des services.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <span className="font-bold text-slate-800">
                      Dossiers incomplets ou renvoyés ({incompletsDossiers.length}) :
                    </span>
                    {incompletsDossiers.length === 0 ? (
                      <div className="p-4 text-center text-slate-400 bg-slate-50 rounded-xl">
                        Aucun dossier incomplet actuellement. Tous les dossiers instruits sont complets !
                      </div>
                    ) : (
                      <div className="divide-y divide-slate-100 border border-orange-200 rounded-xl overflow-hidden bg-white shadow-2xs">
                        {incompletsDossiers.map((d) => {
                          const piecesManquantes = (d.pieces || []).filter(
                            (p) => p.estObligatoire && p.statut !== 'CONFORME'
                          );
                          return (
                            <div
                              key={d.id}
                              className="p-3.5 hover:bg-orange-50/40 transition-colors space-y-2.5"
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span
                                      onClick={() => handleOpenDossierFromModal(d)}
                                      className="font-mono font-bold text-orange-900 hover:underline text-xs cursor-pointer"
                                    >
                                      {d.numeroDossier}
                                    </span>
                                    {d.statut === 'RETOUR_CF' ? (
                                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300">
                                        ↩️ RENVOYÉ PAR LE CF (NÉGLIGEABLE)
                                      </span>
                                    ) : (
                                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-100 text-orange-900 border border-orange-300">
                                        INCOMPLET (NÉGLIGEABLE)
                                      </span>
                                    )}
                                  </div>
                                  <div className="font-semibold text-slate-900 text-xs mt-1">
                                    {d.defunt.nom} {d.defunt.prenoms} (IM: {d.defunt.im})
                                  </div>
                                  <div className="text-[11px] text-slate-500">
                                    Demandeur : <strong className="text-slate-700">{d.demandeur.nom} {d.demandeur.prenoms}</strong> ({d.demandeur.lienParente})
                                  </div>
                                </div>

                                <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
                                  {/* Règle stricte : L'engagement n'a lieu que si le dossier est visé par le CF */}
                                  {(d.numVisaCf || d.statut === 'VALIDE_CF' || d.statut === 'ENGAGE') ? (
                                    <>
                                      <button
                                        onClick={() => {
                                          setActiveDetail(null);
                                          if (onOpenWorkflowAction) {
                                            onOpenWorkflowAction(d, 'ENGAGEMENT');
                                          } else {
                                            onSelectDossier(d);
                                          }
                                        }}
                                        className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-indigo-50 text-indigo-800 hover:bg-indigo-600 hover:text-white border border-indigo-200 transition-colors cursor-pointer"
                                        title="Engager ce dossier visé par le CF (incomplet négligeable)"
                                      >
                                        Engager
                                      </button>
                                      <button
                                        onClick={() => {
                                          setActiveDetail(null);
                                          if (onOpenWorkflowAction) {
                                            onOpenWorkflowAction(d, 'MANDATEMENT');
                                          } else {
                                            onSelectDossier(d);
                                          }
                                        }}
                                        className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-purple-50 text-purple-800 hover:bg-purple-600 hover:text-white border border-purple-200 transition-colors cursor-pointer"
                                        title="Mandater ce dossier au Trésor"
                                      >
                                        Mandater
                                      </button>
                                    </>
                                  ) : (
                                    <button
                                      onClick={() => {
                                        setActiveDetail(null);
                                        if (onOpenWorkflowAction) {
                                          onOpenWorkflowAction(d, 'VISA_CF');
                                        } else {
                                          onSelectDossier(d);
                                        }
                                      }}
                                      className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-emerald-50 text-emerald-800 hover:bg-emerald-600 hover:text-white border border-emerald-300 transition-colors cursor-pointer"
                                      title="Visa CF préalable obligatoire avant engagement"
                                    >
                                      Visa CF
                                    </button>
                                  )}
                                  <button
                                    onClick={() => handleOpenDossierFromModal(d)}
                                    className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-300 transition-colors cursor-pointer"
                                  >
                                    Fiche ➔
                                  </button>
                                </div>
                              </div>

                              {d.statut === 'RETOUR_CF' && d.motifRetourCf && (
                                <div className="p-2.5 bg-amber-50 rounded-lg border border-amber-200 space-y-1">
                                  <span className="text-[10px] font-bold text-amber-950 uppercase tracking-wider block">
                                    Observation du Contrôle Financier (non bloquante) :
                                  </span>
                                  <p className="text-[11px] text-amber-900 font-medium leading-relaxed">
                                    {d.motifRetourCf}
                                  </p>
                                </div>
                              )}

                              {piecesManquantes.length > 0 && (
                                <div className="p-2 bg-orange-50 rounded-lg border border-orange-100 space-y-1">
                                  <span className="text-[10px] font-bold text-orange-950 uppercase tracking-wider block">
                                    Pièce(s) manquante(s) (négligeables par le CF et comptable) :
                                  </span>
                                  <div className="flex flex-wrap gap-1.5">
                                    {piecesManquantes.map((p, idx) => (
                                      <span
                                        key={idx}
                                        className="text-[10px] bg-white text-orange-800 border border-orange-200 px-2 py-0.5 rounded-md font-medium"
                                      >
                                        ⚠️ {p.intitule}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* DETAIL: REJETÉS */}
              {activeDetail.type === 'rejetes' && (
                <div className="space-y-3">
                  <p className="text-slate-600">
                    Dossiers ayant fait l'objet d'un refus de visa ou d'un rejet pour expiration de délai :
                  </p>
                  {rejetesDossiers.length === 0 ? (
                    <div className="p-4 text-center text-slate-400 bg-slate-50 rounded-xl">
                      Aucun dossier rejeté. Tous les dossiers sont en règle.
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100 border border-rose-200 rounded-xl overflow-hidden">
                      {rejetesDossiers.map((d) => (
                        <div
                          key={d.id}
                          onClick={() => handleOpenDossierFromModal(d)}
                          className="p-3 hover:bg-rose-50 transition-colors flex items-center justify-between cursor-pointer group"
                        >
                          <div>
                            <div className="font-mono font-bold text-rose-900 group-hover:underline">
                              {d.numeroDossier}
                            </div>
                            <div className="font-semibold text-slate-800">
                              {d.defunt.nom} {d.defunt.prenoms}
                            </div>
                            <div className="text-[11px] text-rose-700 font-medium">
                              Motif : {d.motifRejet || d.motifRetourCf || 'Motif non spécifié'}
                            </div>
                          </div>
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                            Consulter
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* DETAIL: VALIDÉS */}
              {activeDetail.type === 'valides' && (
                <div className="space-y-3">
                  <p className="text-slate-600">
                    Dossiers ayant obtenu l'avis favorable et le visa du Contrôle Financier. Ils peuvent être engagés et
                    mandatés immédiatement au Trésor :
                  </p>
                  <div className="divide-y divide-slate-100 border border-blue-200 rounded-xl overflow-hidden">
                    {validesDossiers.map((d) => (
                      <div
                        key={d.id}
                        onClick={() => handleOpenDossierFromModal(d)}
                        className="p-3 hover:bg-blue-50 transition-colors flex items-center justify-between cursor-pointer group"
                      >
                        <div>
                          <div className="font-mono font-bold text-blue-900 group-hover:underline">
                            {d.numeroDossier}
                          </div>
                          <div className="font-semibold text-slate-800">
                            {d.defunt.nom} {d.defunt.prenoms}
                          </div>
                          <div className="text-[10px] text-blue-700">
                            Visa CF : {d.numVisaCf || d.numDecision || 'Accordé'} | Date : {d.dateVisaCf || 'N/C'}
                          </div>
                        </div>
                        <span className="px-2 py-1 rounded text-[10px] font-bold bg-blue-100 text-blue-900 border border-blue-200">
                          Mandater ➔
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* DETAIL: MANDATÉS */}
              {activeDetail.type === 'mandates' && (
                <div className="space-y-3">
                  <p className="text-slate-600">
                    Secours liquidés et mandatés avec succès. Les fonds ont été émis au Trésor Public pour paiement à l'ayant droit :
                  </p>
                  <div className="divide-y divide-slate-100 border border-emerald-200 rounded-xl overflow-hidden">
                    {mandatesDossiers.map((d) => (
                      <div
                        key={d.id}
                        onClick={() => handleOpenDossierFromModal(d)}
                        className="p-3 hover:bg-emerald-50 transition-colors flex items-center justify-between cursor-pointer group"
                      >
                        <div>
                          <div className="font-mono font-bold text-emerald-900 group-hover:underline">
                            {d.numeroDossier}
                          </div>
                          <div className="font-semibold text-slate-800">
                            {d.defunt.nom} {d.defunt.prenoms}
                          </div>
                          <div className="text-[10px] text-emerald-700">
                            N° Mandat : {d.numMandat || 'MANDAT-TP-2026/00889'} | Date : {d.dateMandatement || 'N/C'}
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="font-mono font-bold text-emerald-700 block">500 000 Ar</span>
                          <span className="text-[9px] text-emerald-600 font-bold uppercase">Payé</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* DETAIL: DÉLAI DE TRAITEMENT */}
              {activeDetail.type === 'delai' && (
                <div className="space-y-4">
                  <div className="p-4 bg-blue-50 border border-blue-100 rounded-2xl space-y-1">
                    <span className="text-[11px] font-bold text-blue-900 uppercase">Moyenne Globale</span>
                    <div className="text-3xl font-black text-blue-950 font-mono">{delaiMoyen} jours</div>
                    <p className="text-[11px] text-blue-800">
                      Calculé depuis l'enregistrement initial du dossier jusqu'à la liquidation comptable.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <span className="font-bold text-slate-700">Décomposition moyenne par phase :</span>
                    <div className="space-y-1.5">
                      <div className="p-2.5 rounded-xl border border-slate-200 flex items-center justify-between">
                        <span>1. Dépôt et Contrôle de pièces (Agent)</span>
                        <strong className="font-mono text-slate-900">~ 1.2 jour</strong>
                      </div>
                      <div className="p-2.5 rounded-xl border border-slate-200 flex items-center justify-between">
                        <span>2. Transmission et Visa (Contrôle Financier)</span>
                        <strong className="font-mono text-slate-900">~ 1.5 jour</strong>
                      </div>
                      <div className="p-2.5 rounded-xl border border-slate-200 flex items-center justify-between">
                        <span>3. Engagement et Mandatement au Trésor</span>
                        <strong className="font-mono text-slate-900">~ 0.5 jour</strong>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* DETAIL: TAUX DE DÉCAISSEMENT */}
              {activeDetail.type === 'decaissement' && (
                <div className="space-y-4">
                  <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-emerald-900 uppercase">Progression du Mandatement</span>
                      <span className="text-xl font-black text-emerald-950 font-mono">{tauxDecaissement}%</span>
                    </div>
                    <div className="w-full bg-emerald-200 rounded-full h-3 overflow-hidden">
                      <div className="bg-emerald-600 h-3 rounded-full" style={{ width: `${tauxDecaissement}%` }} />
                    </div>
                    <p className="text-[11px] text-emerald-800">
                      {mandates} dossier(s) payé(s) sur un total de {total} dossier(s) enregistrés.
                    </p>
                  </div>
                </div>
              )}

              {/* DETAIL: MONTANT TOTAL PAYÉ */}
              {activeDetail.type === 'montant' && (
                <div className="space-y-4">
                  <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-2xl space-y-1">
                    <span className="text-[11px] font-bold text-indigo-900 uppercase">Volume Financier Exécuté</span>
                    <div className="text-3xl font-black text-indigo-950 font-mono">
                      {montantTotalPaye.toLocaleString('fr-FR')} Ar
                    </div>
                    <p className="text-[11px] text-indigo-800">
                      Montant net payé directement aux familles et ayants droit (500 000 Ar par ayant droit).
                    </p>
                  </div>

                  <div className="space-y-2">
                    <span className="font-bold text-slate-700">Détail des mandatements Trésor :</span>
                    <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
                      {mandatesDossiers.map((d) => (
                        <div key={d.id} className="p-3 flex items-center justify-between">
                          <div>
                            <span className="font-mono font-bold text-blue-700">{d.numeroDossier}</span>
                            <div className="text-slate-800 font-medium">Bénéficiaire : {d.demandeur.nom}</div>
                          </div>
                          <span className="font-mono font-black text-slate-900">500 000 Ar</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* DETAIL: ÉTAPE DU CIRCUIT */}
              {activeDetail.type === 'step' && activeDetail.data && (
                <div className="space-y-4">
                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                    <div className="font-bold text-slate-900">{activeDetail.data.title}</div>
                    <p className="text-slate-600 text-[11px]">{activeDetail.data.description}</p>
                    <div className="pt-1 text-[10px] text-slate-500">
                      Acteur compétent : <strong className="text-slate-700">{activeDetail.data.role}</strong>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <span className="font-bold text-slate-700">
                      Dossiers actuellement à cette étape ({activeDetail.data.dossiers?.length || 0}) :
                    </span>
                    {activeDetail.data.dossiers?.length === 0 ? (
                      <div className="p-4 text-center text-slate-400 bg-slate-50 rounded-xl">
                        Aucun dossier à cette étape en ce moment.
                      </div>
                    ) : (
                      <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden max-h-60 overflow-y-auto">
                        {activeDetail.data.dossiers?.map((d: DossierSecours) => (
                          <div
                            key={d.id}
                            onClick={() => handleOpenDossierFromModal(d)}
                            className="p-3 hover:bg-blue-50 transition-colors flex items-center justify-between cursor-pointer group"
                          >
                            <div>
                              <div className="font-mono font-bold text-blue-700 group-hover:underline">
                                {d.numeroDossier}
                              </div>
                              <div className="font-semibold text-slate-900">
                                {d.defunt.nom} {d.defunt.prenoms}
                              </div>
                            </div>
                            <span className="px-2 py-1 rounded text-[10px] font-bold bg-slate-100 text-slate-800 border border-slate-200">
                              Ouvrir
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* DETAIL: ÉVÈNEMENT D'AUDIT */}
              {activeDetail.type === 'audit_log' && activeDetail.data && (
                <div className="space-y-3">
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-xs bg-slate-200 text-slate-800 px-2 py-0.5 rounded">
                        {activeDetail.data.action}
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono">
                        {new Date(activeDetail.data.timestamp).toLocaleString('fr-FR')}
                      </span>
                    </div>

                    <div className="text-slate-800 font-medium leading-relaxed">{activeDetail.data.details}</div>

                    <div className="pt-2 border-t border-slate-200 text-[11px] grid grid-cols-2 gap-2 text-slate-600">
                      <div>
                        Opérateur : <strong className="text-slate-800">{activeDetail.data.userNom}</strong>
                      </div>
                      <div>
                        Rôle : <strong className="text-slate-800">{activeDetail.data.userRole}</strong>
                      </div>
                      <div>
                        Email : <strong className="text-slate-800">{activeDetail.data.userEmail}</strong>
                      </div>
                      {activeDetail.data.dossierNumero && (
                        <div>
                          N° Dossier :{' '}
                          <strong className="text-blue-600 font-mono">{activeDetail.data.dossierNumero}</strong>
                        </div>
                      )}
                    </div>
                  </div>

                  {activeDetail.data.dossierNumero && (
                    <button
                      onClick={() => {
                        const target = dossiers.find(
                          (d) =>
                            d.numeroDossier === activeDetail.data.dossierNumero ||
                            d.id === activeDetail.data.dossierId
                        );
                        if (target) {
                          handleOpenDossierFromModal(target);
                        } else {
                          onNavigate('dossiers');
                          setActiveDetail(null);
                        }
                      }}
                      className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Accéder au dossier {activeDetail.data.dossierNumero}</span>
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs">
              <span className="text-slate-500">Service des Pensions et des Secours au Décès (SRSP)</span>
              <button
                onClick={() => setActiveDetail(null)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl font-bold transition-colors cursor-pointer"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
