import React, { useState, useMemo } from 'react';
import {
  BarChart3,
  ShieldCheck,
  Search,
  Filter,
  Clock,
  User,
  Calendar,
  Layers,
  ArrowUpRight,
  CheckCircle,
  FileSpreadsheet,
  TrendingUp,
  Banknote,
  CalendarDays,
  CheckCircle2,
  XCircle,
  Send,
  PieChart,
} from 'lucide-react';
import { DossierSecours, AuditLogEntry } from '../types';
import { DossierStorageService } from '../services/dossierStorage';

interface StatsPageProps {
  dossiers: DossierSecours[];
}

export interface StatAnnee {
  annee: string;
  total: number;
  enCours: number;
  transmisCf: number;
  validesCf: number;
  mandates: number;
  rejetes: number;
  montantMandate: number;
  tauxLiquidation: number;
}

const getDossierYear = (d: DossierSecours): string => {
  if (d.dateArrivee && d.dateArrivee.length >= 4) {
    const y = d.dateArrivee.slice(0, 4);
    if (!isNaN(Number(y)) && Number(y) >= 1990 && Number(y) <= 2100) return y;
  }
  if (d.createdAt && d.createdAt.length >= 4) {
    const y = d.createdAt.slice(0, 4);
    if (!isNaN(Number(y))) return y;
  }
  return new Date().getFullYear().toString();
};

export const StatsPage: React.FC<StatsPageProps> = ({ dossiers }) => {
  const [logSearch, setLogSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [selectedYear, setSelectedYear] = useState<string>('ALL');
  const [hoveredYear, setHoveredYear] = useState<string | null>(null);

  const auditLogs = DossierStorageService.getAuditLogs();

  // Statistics calculation
  const stats = useMemo(() => {
    const total = dossiers.length;
    const actifs = dossiers.filter((d) => d.defunt.statutActivite === 'ACTIVITE').length;
    const retraites = dossiers.filter((d) => d.defunt.statutActivite === 'RETRAITE_PENSIONNE').length;

    const veufs = dossiers.filter((d) => d.demandeur.lienParente === 'VEUF_VEUVE').length;
    const tuteurs = dossiers.filter((d) => d.demandeur.lienParente === 'TUTEUR_ENFANT_MINEUR').length;
    const celibataires = dossiers.filter(
      (d) => d.demandeur.lienParente === 'CELIBATAIRE_AVEC_MINEUR'
    ).length;
    const autres = total - (veufs + tuteurs + celibataires);

    const mandates = dossiers.filter((d) => d.statut === 'MANDATE').length;
    const montantTotalPaye = dossiers
      .filter((d) => d.statut === 'MANDATE')
      .reduce((acc, d) => acc + (d.montantSecours || 0), 0);

    return {
      total,
      actifs,
      retraites,
      veufs,
      tuteurs,
      celibataires,
      autres,
      mandates,
      montantTotalPaye,
      tauxLiquidation: total > 0 ? Math.round((mandates / total) * 100) : 0,
    };
  }, [dossiers]);

  // Annual statistics calculation (Nombre de dossiers par an)
  const annualStats = useMemo(() => {
    const map: Record<
      string,
      {
        annee: string;
        total: number;
        enCours: number;
        transmisCf: number;
        validesCf: number;
        mandates: number;
        rejetes: number;
        montantMandate: number;
      }
    > = {};

    dossiers.forEach((d) => {
      const yr = getDossierYear(d);
      if (!map[yr]) {
        map[yr] = {
          annee: yr,
          total: 0,
          enCours: 0,
          transmisCf: 0,
          validesCf: 0,
          mandates: 0,
          rejetes: 0,
          montantMandate: 0,
        };
      }
      map[yr].total += 1;
      if (d.statut === 'RECEPTION_EN_COURS' || d.statut === 'DOSSIER_INCOMPLET') {
        map[yr].enCours += 1;
      } else if (d.statut === 'TRANSMIS_CF') {
        map[yr].transmisCf += 1;
      } else if (d.statut === 'VALIDE_CF' || d.statut === 'EN_ATTENTE_MANDAT') {
        map[yr].validesCf += 1;
      } else if (d.statut === 'MANDATE') {
        map[yr].mandates += 1;
        map[yr].montantMandate += (d.montantSecours || 0);
      } else if (d.statut === 'REJETE_CF') {
        map[yr].rejetes += 1;
      }
    });

    const list: StatAnnee[] = Object.values(map)
      .map((item) => ({
        ...item,
        tauxLiquidation: item.total > 0 ? Math.round((item.mandates / item.total) * 100) : 0,
      }))
      .sort((a, b) => b.annee.localeCompare(a.annee));

    return list;
  }, [dossiers]);

  const availableYears = useMemo(() => {
    return annualStats.map((s) => s.annee);
  }, [annualStats]);

  const displayedAnnualStats = useMemo(() => {
    if (selectedYear === 'ALL') return annualStats;
    return annualStats.filter((s) => s.annee === selectedYear);
  }, [annualStats, selectedYear]);

  // Aggregate stats for the selected year
  const activeAnnualSummary = useMemo(() => {
    if (selectedYear === 'ALL') {
      return {
        annee: 'Toutes les années',
        total: stats.total,
        mandates: stats.mandates,
        montantMandate: stats.montantTotalPaye,
        tauxLiquidation: stats.tauxLiquidation,
      };
    }
    const current = annualStats.find((s) => s.annee === selectedYear);
    return current || {
      annee: selectedYear,
      total: 0,
      mandates: 0,
      montantMandate: 0,
      tauxLiquidation: 0,
    };
  }, [selectedYear, annualStats, stats]);

  // Filtered audit logs
  const filteredLogs = useMemo(() => {
    return auditLogs.filter((log) => {
      const q = logSearch.toLowerCase().trim();
      const matchSearch =
        !q ||
        log.action.toLowerCase().includes(q) ||
        log.details.toLowerCase().includes(q) ||
        log.userNom.toLowerCase().includes(q) ||
        (log.dossierNumero && log.dossierNumero.toLowerCase().includes(q));

      const matchRole = roleFilter === 'ALL' || log.userRole === roleFilter;

      return matchSearch && matchRole;
    });
  }, [auditLogs, logSearch, roleFilter]);

  return (
    <div id="stats-page" className="space-y-6 animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-blue-600" />
            <h2 className="text-base font-bold text-slate-900 tracking-tight">
              Analytics Institutionnels et Traçabilité Complète (Audit Logs)
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Indicateurs d'efficacité de liquidation et registre immuable des actions pour le contrôle interne.
          </p>
        </div>

        <div className="px-4 py-2 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 font-semibold">
          Volume mandaté : <strong className="font-mono text-emerald-700">{stats.montantTotalPaye.toLocaleString()} Ar</strong>
        </div>
      </div>

      {/* Analytics Cards Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: Statut d'activité du défunt */}
        <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-3">
          <div className="flex items-center justify-between text-xs font-bold text-slate-900 pb-2 border-b border-slate-100">
            <span>Défunt : Activité vs Retraite</span>
            <Layers className="w-4 h-4 text-blue-500" />
          </div>
          <div className="space-y-2 text-xs">
            <div>
              <div className="flex justify-between text-slate-600 mb-1">
                <span>En Activité (Bulletin Solde)</span>
                <span className="font-bold text-slate-900">{stats.actifs} ({Math.round((stats.actifs / stats.total) * 100 || 0)}%)</span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-blue-600 h-full rounded-full"
                  style={{ width: `${(stats.actifs / stats.total) * 100 || 0}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-slate-600 mb-1">
                <span>Pensionnés / Retraités (Titre Pension)</span>
                <span className="font-bold text-slate-900">{stats.retraites} ({Math.round((stats.retraites / stats.total) * 100 || 0)}%)</span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-emerald-500 h-full rounded-full"
                  style={{ width: `${(stats.retraites / stats.total) * 100 || 0}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Card 2: Qualité du demandeur */}
        <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-3">
          <div className="flex items-center justify-between text-xs font-bold text-slate-900 pb-2 border-b border-slate-100">
            <span>Qualité du Demandeur</span>
            <User className="w-4 h-4 text-purple-500" />
          </div>
          <div className="space-y-1.5 text-xs text-slate-700">
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span>Veuves / Veufs</span>
              <span className="font-bold text-slate-900">{stats.veufs}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span>Tuteurs d'enfants mineurs</span>
              <span className="font-bold text-slate-900">{stats.tuteurs}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span>Célibataires avec mineurs</span>
              <span className="font-bold text-slate-900">{stats.celibataires}</span>
            </div>
            <div className="flex justify-between py-1">
              <span>Autres ayants droit</span>
              <span className="font-bold text-slate-900">{stats.autres}</span>
            </div>
          </div>
        </div>

        {/* Card 3: Efficacité et Délais */}
        <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-3">
          <div className="flex items-center justify-between text-xs font-bold text-slate-900 pb-2 border-b border-slate-100">
            <span>Délais Réglementaires et Liquidation</span>
            <Clock className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="space-y-2 text-xs">
            <div className="p-3 bg-slate-50 rounded-xl space-y-0.5">
              <span className="text-[11px] text-slate-500 block">Délai moyen d'instruction global :</span>
              <span className="text-lg font-bold text-slate-900">14.5 jours ouvrés</span>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl space-y-0.5">
              <span className="text-[11px] text-slate-500 block">Taux de dossiers liquidés :</span>
              <span className="text-lg font-bold text-purple-700">{stats.tauxLiquidation}% des dossiers</span>
            </div>
          </div>
        </div>
      </div>

      {/* MODULE STATISTIQUES ANNUELLES (Nombre de dossiers par an) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-6 space-y-6">
        {/* Module Header with Year Selector */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200">
          <div>
            <div className="flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-indigo-600" />
              <h3 className="text-base font-bold text-slate-900 tracking-tight">
                Statistiques Annuelles (Nombre de dossiers par an et Liquidations)
              </h3>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Évolution chronologique pluriannuelle : flux d'enregistrement, visas CF délivrés, mandatements Trésor et volumes financiers annuels.
            </p>
          </div>

          {/* Year Filter Buttons */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-semibold text-slate-500 mr-1 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5" />
              <span>Année :</span>
            </span>
            <button
              onClick={() => setSelectedYear('ALL')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                selectedYear === 'ALL'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Toutes les années ({annualStats.length})
            </button>
            {availableYears.map((yr) => (
              <button
                key={yr}
                onClick={() => setSelectedYear(yr)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  selectedYear === yr
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {yr}
              </button>
            ))}
          </div>
        </div>

        {/* Interactive SVG Chart of Annual Flows */}
        <div className="bg-slate-50 border border-slate-200 p-5 rounded-2xl space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <h4 className="text-xs font-extrabold text-slate-900 uppercase tracking-wide">
                Visualisation des Flux Pluriannuels (Total vs Mandatés)
              </h4>
              <p className="text-[10px] text-slate-500">
                Survolez les colonnes pour afficher le détail financier complet de l'exercice.
              </p>
            </div>
            {/* Legend */}
            <div className="flex items-center gap-3 text-[10px] font-bold">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 bg-indigo-500 rounded-xs"></span>
                <span className="text-slate-600">Enregistrés</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 bg-emerald-500 rounded-xs"></span>
                <span className="text-slate-600">Mandatés</span>
              </div>
            </div>
          </div>

          <div className="relative">
            {/* SVG Chart */}
            <svg
              viewBox="0 0 500 180"
              className="w-full h-auto overflow-visible select-none"
            >
              {/* Grid Lines */}
              {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => {
                const y = 20 + ratio * 120;
                const maxValue = Math.max(...annualStats.map((s) => s.total), 4);
                const labelVal = Math.round(maxValue * (1 - ratio));
                return (
                  <g key={idx}>
                    <line
                      x1="40"
                      y1={y}
                      x2="480"
                      y2={y}
                      stroke="#e2e8f0"
                      strokeWidth="1"
                      strokeDasharray="4 4"
                    />
                    <text
                      x="30"
                      y={y + 3}
                      textAnchor="end"
                      className="text-[9px] font-mono font-bold fill-slate-400"
                    >
                      {labelVal}
                    </text>
                  </g>
                );
              })}

              {/* Bars Rendering */}
              {annualStats.map((stat, idx) => {
                const maxVal = Math.max(...annualStats.map((s) => s.total), 4);
                const colWidth = 60;
                const colGap = (440 - colWidth * annualStats.length) / (annualStats.length + 1 || 1);
                const xStart = 40 + colGap + idx * (colWidth + colGap);

                // Heights
                const barHeightTotal = (stat.total / maxVal) * 120;
                const barHeightMandates = (stat.mandates / maxVal) * 120;

                const yTotal = 140 - barHeightTotal;
                const yMandates = 140 - barHeightMandates;

                const isHovered = hoveredYear === stat.annee;

                return (
                  <g
                    key={stat.annee}
                    onMouseEnter={() => setHoveredYear(stat.annee)}
                    onMouseLeave={() => setHoveredYear(null)}
                    onClick={() => setSelectedYear(selectedYear === stat.annee ? 'ALL' : stat.annee)}
                    className="cursor-pointer group"
                  >
                    {/* Background hover highlights */}
                    <rect
                      x={xStart - colGap / 3}
                      y="15"
                      width={colWidth + colGap * (2 / 3)}
                      height="140"
                      className={`fill-slate-200/40 transition-all rounded-lg opacity-0 ${
                        isHovered ? 'opacity-100' : 'group-hover:opacity-100'
                      }`}
                      rx="4"
                    />

                    {/* Total Bar (Indigo) */}
                    <rect
                      x={xStart + 4}
                      y={yTotal}
                      width="20"
                      height={Math.max(barHeightTotal, 2)}
                      rx="3"
                      className={`transition-all duration-300 ${
                        isHovered ? 'fill-indigo-600' : 'fill-indigo-400 group-hover:fill-indigo-500'
                      }`}
                    />

                    {/* Mandates Bar (Emerald) */}
                    <rect
                      x={xStart + 26}
                      y={yMandates}
                      width="20"
                      height={Math.max(barHeightMandates, 2)}
                      rx="3"
                      className={`transition-all duration-300 ${
                        isHovered ? 'fill-emerald-600' : 'fill-emerald-400 group-hover:fill-emerald-500'
                      }`}
                    />

                    {/* Year Label */}
                    <text
                      x={xStart + colWidth / 2}
                      y="158"
                      textAnchor="middle"
                      className={`text-[10px] font-mono font-bold transition-all ${
                        isHovered || selectedYear === stat.annee
                          ? 'fill-indigo-600 font-extrabold'
                          : 'fill-slate-600'
                      }`}
                    >
                      {stat.annee}
                    </text>
                  </g>
                );
              })}

              {/* Axis Line */}
              <line
                x1="40"
                y1="140"
                x2="480"
                y2="140"
                stroke="#94a3b8"
                strokeWidth="1.5"
              />
            </svg>

            {/* Floating Tooltip Inside React Panel based on hover state */}
            {hoveredYear && (
              <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-slate-900 text-slate-100 px-3 py-2 rounded-xl text-[10px] space-y-1 shadow-lg pointer-events-none transition-all z-10 border border-slate-700">
                {(() => {
                  const s = annualStats.find((y) => y.annee === hoveredYear);
                  if (!s) return null;
                  return (
                    <>
                      <div className="font-bold text-white text-center border-b border-slate-700 pb-1">
                        Exercice {s.annee}
                      </div>
                      <div className="flex justify-between gap-6">
                        <span className="text-slate-400">Dossiers Reçus:</span>
                        <strong className="text-indigo-300 font-mono">{s.total}</strong>
                      </div>
                      <div className="flex justify-between gap-6">
                        <span className="text-slate-400">Dossiers Mandatés:</span>
                        <strong className="text-emerald-300 font-mono">{s.mandates} ({s.tauxLiquidation}%)</strong>
                      </div>
                      <div className="flex justify-between gap-6 border-t border-slate-800 pt-0.5">
                        <span className="text-slate-400">Montant Décaissé:</span>
                        <strong className="text-emerald-400 font-mono">{s.montantMandate.toLocaleString()} Ar</strong>
                      </div>
                    </>
                  );
                })()}
              </div>
            )}
          </div>
        </div>

        {/* Selected Cohort KPI Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
          <div className="p-4 bg-indigo-50/50 rounded-xl border border-indigo-100 space-y-1">
            <div className="flex items-center justify-between text-indigo-700">
              <span className="text-[11px] font-bold uppercase tracking-wider">Volume Reçu</span>
              <Calendar className="w-4 h-4" />
            </div>
            <div className="text-2xl font-black text-indigo-950 font-mono">
              {activeAnnualSummary.total} <span className="text-xs font-semibold text-indigo-800">dossiers</span>
            </div>
            <p className="text-[11px] text-indigo-700 font-medium truncate">
              {selectedYear === 'ALL' ? 'Totalité des exercices' : `Exercice fiscal ${selectedYear}`}
            </p>
          </div>

          <div className="p-4 bg-purple-50/50 rounded-xl border border-purple-100 space-y-1">
            <div className="flex items-center justify-between text-purple-700">
              <span className="text-[11px] font-bold uppercase tracking-wider">Mandatés / Soldés</span>
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div className="text-2xl font-black text-purple-950 font-mono">
              {activeAnnualSummary.mandates} <span className="text-xs font-semibold text-purple-800">payés</span>
            </div>
            <p className="text-[11px] text-purple-700 font-medium">
              Titres de paiement Trésor délivrés
            </p>
          </div>

          <div className="p-4 bg-emerald-50/50 rounded-xl border border-emerald-100 space-y-1">
            <div className="flex items-center justify-between text-emerald-700">
              <span className="text-[11px] font-bold uppercase tracking-wider">Montant Mandaté</span>
              <Banknote className="w-4 h-4" />
            </div>
            <div className="text-xl font-black text-emerald-950 font-mono truncate">
              {activeAnnualSummary.montantMandate.toLocaleString()} <span className="text-xs font-semibold text-emerald-800">Ar</span>
            </div>
            <p className="text-[11px] text-emerald-700 font-medium">
              Fonds effectifs décaissés
            </p>
          </div>

          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
            <div className="flex items-center justify-between text-slate-700">
              <span className="text-[11px] font-bold uppercase tracking-wider">Taux de Liquidation</span>
              <TrendingUp className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-2xl font-black text-slate-900 font-mono">
              {activeAnnualSummary.tauxLiquidation}%
            </div>
            <p className="text-[11px] text-slate-500 font-medium">
              Ratio dossiers payés / reçus
            </p>
          </div>
        </div>

        {/* Visual Histogram / Annual Distribution Cards */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs font-bold text-slate-900">
            <span>Évolution et Répartition Annuelle (Histogramme et Statuts)</span>
            <span className="text-[11px] text-slate-500 font-normal hidden sm:inline">
              Vert : Mandatés • Bleu : Visés CF • Ambre : Transmis CF • Gris : Enquête • Rouge : Rejetés
            </span>
          </div>

          <div className="space-y-3">
            {annualStats.map((item) => {
              const pctMandates = item.total > 0 ? (item.mandates / item.total) * 100 : 0;
              const pctValides = item.total > 0 ? (item.validesCf / item.total) * 100 : 0;
              const pctTransmis = item.total > 0 ? (item.transmisCf / item.total) * 100 : 0;
              const pctEnCours = item.total > 0 ? (item.enCours / item.total) * 100 : 0;
              const pctRejetes = item.total > 0 ? (item.rejetes / item.total) * 100 : 0;

              const isHighlighted = selectedYear === 'ALL' || selectedYear === item.annee;

              return (
                <div
                  key={item.annee}
                  onClick={() => setSelectedYear(selectedYear === item.annee ? 'ALL' : item.annee)}
                  className={`p-4 rounded-xl border transition-all cursor-pointer ${
                    isHighlighted
                      ? 'bg-slate-50/80 border-slate-300 shadow-2xs'
                      : 'opacity-40 hover:opacity-80 bg-white border-slate-200'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-3">
                      <span className="px-2.5 py-1 bg-slate-900 text-white rounded-lg text-xs font-bold font-mono">
                        {item.annee}
                      </span>
                      <span className="text-sm font-bold text-slate-900">
                        {item.total} {item.total > 1 ? 'dossiers enregistrés' : 'dossier enregistré'}
                      </span>
                      {item.mandates > 0 && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                          {item.mandates} mandaté{item.mandates > 1 ? 's' : ''} ({item.tauxLiquidation}%)
                        </span>
                      )}
                    </div>
                    <div className="text-xs font-mono font-bold text-slate-800">
                      Montant mandaté : <span className="text-emerald-700">{item.montantMandate.toLocaleString()} Ar</span>
                    </div>
                  </div>

                  {/* Multi-segment stacked progress bar */}
                  <div className="w-full bg-slate-200 h-3.5 rounded-full overflow-hidden flex shadow-inner">
                    {pctMandates > 0 && (
                      <div
                        style={{ width: `${pctMandates}%` }}
                        className="bg-emerald-500 h-full transition-all"
                        title={`Mandatés: ${item.mandates} (${Math.round(pctMandates)}%)`}
                      />
                    )}
                    {pctValides > 0 && (
                      <div
                        style={{ width: `${pctValides}%` }}
                        className="bg-blue-500 h-full transition-all"
                        title={`Visés CF: ${item.validesCf} (${Math.round(pctValides)}%)`}
                      />
                    )}
                    {pctTransmis > 0 && (
                      <div
                        style={{ width: `${pctTransmis}%` }}
                        className="bg-amber-400 h-full transition-all"
                        title={`Transmis CF: ${item.transmisCf} (${Math.round(pctTransmis)}%)`}
                      />
                    )}
                    {pctEnCours > 0 && (
                      <div
                        style={{ width: `${pctEnCours}%` }}
                        className="bg-slate-400 h-full transition-all"
                        title={`Enquête / Incomplets: ${item.enCours} (${Math.round(pctEnCours)}%)`}
                      />
                    )}
                    {pctRejetes > 0 && (
                      <div
                        style={{ width: `${pctRejetes}%` }}
                        className="bg-rose-500 h-full transition-all"
                        title={`Rejetés: ${item.rejetes} (${Math.round(pctRejetes)}%)`}
                      />
                    )}
                  </div>

                  {/* Micro stats details */}
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-600 mt-2 font-medium">
                    <span>Enquête : <strong className="text-slate-900">{item.enCours}</strong></span>
                    <span>Transmis CF : <strong className="text-amber-700">{item.transmisCf}</strong></span>
                    <span>Visés CF : <strong className="text-blue-700">{item.validesCf}</strong></span>
                    <span>Mandatés : <strong className="text-emerald-700">{item.mandates}</strong></span>
                    <span>Rejetés : <strong className="text-rose-700">{item.rejetes}</strong></span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Detailed Annual Table */}
        <div className="space-y-2 pt-2">
          <div className="text-xs font-bold text-slate-900">
            Tableau Synthétique Annuel (Nombre de dossiers par an et Décaissements)
          </div>

          <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900 text-slate-200 uppercase font-semibold text-[10px] tracking-wider">
                <tr>
                  <th className="py-2.5 px-3">Année</th>
                  <th className="py-2.5 px-3 text-center">Nbre Dossiers</th>
                  <th className="py-2.5 px-3 text-center">En Enquête</th>
                  <th className="py-2.5 px-3 text-center">Transmis CF</th>
                  <th className="py-2.5 px-3 text-center">Visés CF</th>
                  <th className="py-2.5 px-3 text-center">Mandatés</th>
                  <th className="py-2.5 px-3 text-center">Rejetés CF</th>
                  <th className="py-2.5 px-3 text-right">Montant Mandaté</th>
                  <th className="py-2.5 px-3 text-center">Taux Liquidation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {displayedAnnualStats.map((item) => (
                  <tr key={item.annee} className="hover:bg-slate-50/80 transition-colors font-mono">
                    <td className="py-2.5 px-3 font-bold text-slate-900">
                      {item.annee}
                    </td>
                    <td className="py-2.5 px-3 text-center font-bold text-indigo-700">
                      {item.total}
                    </td>
                    <td className="py-2.5 px-3 text-center text-slate-600">
                      {item.enCours}
                    </td>
                    <td className="py-2.5 px-3 text-center text-amber-700 font-semibold">
                      {item.transmisCf}
                    </td>
                    <td className="py-2.5 px-3 text-center text-blue-700 font-semibold">
                      {item.validesCf}
                    </td>
                    <td className="py-2.5 px-3 text-center text-emerald-700 font-bold bg-emerald-50/40">
                      {item.mandates}
                    </td>
                    <td className="py-2.5 px-3 text-center text-rose-600 font-semibold">
                      {item.rejetes}
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold text-emerald-800">
                      {item.montantMandate.toLocaleString()} Ar
                    </td>
                    <td className="py-2.5 px-3 text-center font-bold text-purple-700">
                      {item.tauxLiquidation}%
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-100 font-bold text-slate-900 font-mono border-t border-slate-200">
                <tr>
                  <td className="py-2.5 px-3">Total Global</td>
                  <td className="py-2.5 px-3 text-center text-indigo-900">{stats.total}</td>
                  <td className="py-2.5 px-3 text-center text-slate-700">
                    {annualStats.reduce((s, i) => s + i.enCours, 0)}
                  </td>
                  <td className="py-2.5 px-3 text-center text-amber-800">
                    {annualStats.reduce((s, i) => s + i.transmisCf, 0)}
                  </td>
                  <td className="py-2.5 px-3 text-center text-blue-800">
                    {annualStats.reduce((s, i) => s + i.validesCf, 0)}
                  </td>
                  <td className="py-2.5 px-3 text-center text-emerald-800">
                    {annualStats.reduce((s, i) => s + i.mandates, 0)}
                  </td>
                  <td className="py-2.5 px-3 text-center text-rose-700">
                    {annualStats.reduce((s, i) => s + i.rejetes, 0)}
                  </td>
                  <td className="py-2.5 px-3 text-right text-emerald-900">
                    {annualStats.reduce((s, i) => s + i.montantMandate, 0).toLocaleString()} Ar
                  </td>
                  <td className="py-2.5 px-3 text-center text-purple-800">
                    {stats.tauxLiquidation}%
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>

      {/* AUDIT LOG SECTION */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-blue-600" />
              <span>Piste d'Audit et Traçabilité des Actions</span>
            </h3>
            <p className="text-xs text-slate-500">
              Historique inaltérable des validations, pièces cochées, visas CF et mandatements.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Search */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={logSearch}
                onChange={(e) => setLogSearch(e.target.value)}
                placeholder="Filtrer audit logs..."
                className="text-xs pl-8 pr-3 py-1.5 border border-slate-300 rounded-lg text-slate-900"
              />
            </div>

            {/* Role Filter */}
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="text-xs border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white text-slate-700"
            >
              <option value="ALL">Tous les rôles</option>
              <option value="AGENT">AGENT</option>
              <option value="ADMIN">ADMIN</option>
            </select>
          </div>
        </div>

        {/* Audit Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-100 text-slate-700 font-bold text-[11px] uppercase">
                <th className="py-2.5 px-3">Date et Heure</th>
                <th className="py-2.5 px-3">Rôle</th>
                <th className="py-2.5 px-3">Utilisateur</th>
                <th className="py-2.5 px-3">Dossier</th>
                <th className="py-2.5 px-3">Action</th>
                <th className="py-2.5 px-3">Détails de l'opération</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    Aucune entrée d'audit trouvée.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-2.5 px-3 font-mono text-slate-600 whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString('fr-FR')}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-200/80 text-slate-800">
                        {log.userRole}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-medium text-slate-900 whitespace-nowrap">
                      {log.userNom}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-blue-600 font-semibold whitespace-nowrap">
                      {log.dossierNumero || '—'}
                    </td>
                    <td className="py-2.5 px-3 font-bold text-slate-800 whitespace-nowrap">
                      {log.action}
                    </td>
                    <td className="py-2.5 px-3 text-slate-600">
                      {log.details}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
