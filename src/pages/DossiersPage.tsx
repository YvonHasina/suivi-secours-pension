import React, { useState, useMemo } from 'react';
import {
  Table,
  Search,
  Download,
  FileDown,
  Filter,
  Eye,
  Send,
  CheckCircle2,
  XCircle,
  CreditCard,
  FileSpreadsheet,
  Plus,
  RefreshCw,
  Edit3,
  Trash2,
  Lock,
  RotateCcw,
  FileCheck,
  FileText,
  AlertTriangle,
} from 'lucide-react';
import { DossierSecours, StatutWorkflow, UserRole } from '../types';
import { DossierStorageService } from '../services/dossierStorage';
import { WorkflowValidationService, WorkflowActionType } from '../services/workflowValidation';
import { ExportPdfModal } from '../components/ExportPdfModal';

interface DossiersPageProps {
  dossiers: DossierSecours[];
  activeRole: UserRole;
  initialStatusFilter?: string;
  onSelectDossier: (dossier: DossierSecours) => void;
  onOpenWorkflowAction: (dossier: DossierSecours, action: WorkflowActionType) => void;
  onNewEnquete: () => void;
  onEditDossier?: (dossier: DossierSecours) => void;
  onDeleteDossier?: (dossier: DossierSecours) => void;
}

export const DossiersPage: React.FC<DossiersPageProps> = ({
  dossiers,
  activeRole,
  initialStatusFilter = 'ALL',
  onSelectDossier,
  onOpenWorkflowAction,
  onNewEnquete,
  onEditDossier,
  onDeleteDossier,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>(initialStatusFilter);
  const [activiteFilter, setActiviteFilter] = useState<string>('ALL');
  const [ministereFilter, setMinistereFilter] = useState<string>('ALL');
  const [dateDecesFilter, setDateDecesFilter] = useState<string>('ALL');
  const [isExportPdfModalOpen, setIsExportPdfModalOpen] = useState<boolean>(false);

  const getActiveFilterLabel = () => {
    switch (statusFilter) {
      case 'ALL':
        return 'Tous les dossiers du registre';
      case 'ENQUETE':
      case 'DOSSIER_INCOMPLET':
        return 'Dossiers en cours d’étude / incomplets (négligeables)';
      case 'TRANSMIS_CF':
        return 'Dossiers transmis au Contrôle Financier';
      case 'RETOUR_CF':
        return 'Dossiers revenus du Contrôle Financier';
      case 'VALIDE_CF':
        return 'Dossiers visés par le Contrôle Financier';
      case 'ENGAGE':
        return 'Dossiers engagés par le comptable';
      case 'MANDATE':
        return 'Dossiers mandatés et payés au Trésor';
      case 'REJETE_CF':
        return 'Dossiers rejetés par le Contrôle Financier';
      default:
        return `Filtre : ${statusFilter}`;
    }
  };

  // Filtrage temps réel
  const filteredDossiers = useMemo(() => {
    return dossiers.filter((d) => {
      // Search
      const query = searchQuery.toLowerCase().trim();
      const matchSearch =
        !query ||
        d.defunt.im.toLowerCase().includes(query) ||
        d.defunt.nom.toLowerCase().includes(query) ||
        d.defunt.prenoms.toLowerCase().includes(query) ||
        d.demandeur.nom.toLowerCase().includes(query) ||
        d.demandeur.prenoms.toLowerCase().includes(query) ||
        d.numeroDossier.toLowerCase().includes(query) ||
        (d.numDecision && d.numDecision.toLowerCase().includes(query)) ||
        (d.numVisaCf && d.numVisaCf.toLowerCase().includes(query)) ||
        (d.numMandat && d.numMandat.toLowerCase().includes(query));

      // Statut
      let matchStatus = statusFilter === 'ALL' || d.statut === statusFilter;
      if (statusFilter === 'ENQUETE' || statusFilter === 'DOSSIER_INCOMPLET') {
        matchStatus = d.statut === 'RECEPTION_EN_COURS' || d.statut === 'DOSSIER_INCOMPLET' || d.statut === 'ENQUETE_CONFORME' || d.statut === 'RETOUR_CF';
      } else if (statusFilter === 'VALIDE_CF') {
        matchStatus = d.statut === 'VALIDE_CF' || d.statut === 'EN_ATTENTE_MANDAT';
      }

      // Activité
      const matchActivite =
        activiteFilter === 'ALL' || d.defunt.statutActivite === activiteFilter;

      // Ministère
      const matchMinistere =
        ministereFilter === 'ALL' ||
        (d.defunt.ministereInstitution &&
          d.defunt.ministereInstitution.toLowerCase().includes(ministereFilter.toLowerCase()));

      // Date de décès
      let matchDate = true;
      if (dateDecesFilter !== 'ALL') {
        const yearStr = d.defunt.dateDeces;
        if (dateDecesFilter === '2026') {
          matchDate = yearStr.includes('2026') || yearStr.includes('/26');
        } else if (dateDecesFilter === '2025') {
          matchDate = yearStr.includes('2025') || yearStr.includes('/25');
        } else if (dateDecesFilter === 'OLDER') {
          matchDate = !yearStr.includes('2026') && !yearStr.includes('/26') && !yearStr.includes('2025') && !yearStr.includes('/25');
        }
      }

      return matchSearch && matchStatus && matchActivite && matchMinistere && matchDate;
    });
  }, [dossiers, searchQuery, statusFilter, activiteFilter, ministereFilter, dateDecesFilter]);

  const handleExportCsv = () => {
    DossierStorageService.exportExcelCsv(filteredDossiers);
  };

  const getStatusBadge = (statut: StatutWorkflow) => {
    switch (statut) {
      case 'MANDATE':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'VALIDE_CF':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'TRANSMIS_CF':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'REJETE_CF':
        return 'bg-rose-100 text-rose-800 border-rose-200 font-bold';
      case 'ENQUETE_CONFORME':
        return 'bg-teal-100 text-teal-800 border-teal-200';
      case 'DOSSIER_INCOMPLET':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const countAll = dossiers.length;
  const countEnquete = dossiers.filter(
    (d) => d.statut === 'RECEPTION_EN_COURS' || d.statut === 'DOSSIER_INCOMPLET' || d.statut === 'ENQUETE_CONFORME'
  ).length;
  const countTransmisCf = dossiers.filter((d) => d.statut === 'TRANSMIS_CF').length;
  const countRetourCf = dossiers.filter((d) => d.statut === 'RETOUR_CF').length;
  const countValidesCf = dossiers.filter((d) => d.statut === 'VALIDE_CF' || d.statut === 'EN_ATTENTE_MANDAT').length;
  const countEngages = dossiers.filter((d) => d.statut === 'ENGAGE').length;
  const countMandates = dossiers.filter((d) => d.statut === 'MANDATE').length;
  const countRejetes = dossiers.filter((d) => d.statut === 'REJETE_CF').length;

  return (
    <div id="dossiers-page" className="space-y-4 animate-in fade-in duration-200">
      {/* Large Page Title et Context with Action Buttons */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="p-3 bg-emerald-50 rounded-2xl text-emerald-600 border border-emerald-200 shadow-2xs">
            <FileSpreadsheet className="w-8 h-8" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                Registre Officiel Normalisé
              </span>
              <span className="text-xs text-slate-500 font-mono">
                {filteredDossiers.length} dossier{filteredDossiers.length > 1 ? 's' : ''} affiché{filteredDossiers.length > 1 ? 's' : ''} sur {countAll}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-1">
              Registre des Secours aux Décès (8 Colonnes)
            </h1>
            <p className="text-sm text-slate-600 mt-1 font-medium">
              Suivi exhaustif avec les colonnes normalisées de la Direction de la Solde et du Contrôle Financier.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0 flex-wrap justify-end">
          {/* Bouton Export Registre .PDF avec formalisation du titre */}
          <button
            id="btn-export-pdf-dossiers-page"
            onClick={() => setIsExportPdfModalOpen(true)}
            className="btn-3d-primary inline-flex items-center gap-2 px-4 py-2.5 text-sm font-bold text-white bg-rose-600 hover:bg-rose-700 active:bg-rose-800 rounded-xl shadow-xs transition-all cursor-pointer"
            title="Exporter le registre officiel en PDF avec titre formalisé (8 colonnes normalisées)"
          >
            <FileDown className="w-4 h-4 text-white" />
            <span>Export Registre (.PDF)</span>
          </button>

          <button
            id="btn-export-csv-dossiers-page"
            onClick={() => DossierStorageService.exportExcelCsv(filteredDossiers)}
            className="btn-3d-secondary inline-flex items-center gap-2 px-4 py-2.5 text-sm font-bold text-slate-700 bg-white hover:bg-slate-50 rounded-xl border border-slate-300 shadow-xs transition-all cursor-pointer"
            title="Exporter la sélection en CSV conforme Excel"
          >
            <Download className="w-4 h-4 text-emerald-600" />
            <span>Export Excel (8 col.)</span>
          </button>

          {activeRole === 'AGENT' && (
            <button
              id="btn-new-enquete-dossiers-page"
              onClick={onNewEnquete}
              className="btn-3d-primary inline-flex items-center gap-2 px-4 py-2.5 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4 text-white" />
              <span>Nouvelle Étude de fond et de forme</span>
            </button>
          )}
        </div>
      </div>

      {/* Quick Status Filter Pills for Fast 1-Click Navigation */}
      <div className="flex flex-wrap items-center gap-2 p-1.5 bg-slate-100/90 rounded-2xl border border-slate-200">
        <button
          onClick={() => setStatusFilter('ALL')}
          className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer ${
            statusFilter === 'ALL'
              ? 'bg-white text-slate-900 shadow-xs border border-slate-200'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
          }`}
        >
          <span>Tous</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-200 text-slate-700 font-mono">
            {countAll}
          </span>
        </button>

        <button
          onClick={() => setStatusFilter('ENQUETE')}
          className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer ${
            statusFilter === 'ENQUETE' || statusFilter === 'DOSSIER_INCOMPLET'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-blue-700 hover:bg-white/60'
          }`}
        >
          <span>1. En cours (Agent)</span>
          <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
            statusFilter === 'ENQUETE' || statusFilter === 'DOSSIER_INCOMPLET' ? 'bg-blue-800 text-white' : 'bg-blue-100 text-blue-800'
          }`}>
            {countEnquete}
          </span>
        </button>

        <button
          onClick={() => setStatusFilter('TRANSMIS_CF')}
          className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer ${
            statusFilter === 'TRANSMIS_CF'
              ? 'bg-amber-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-amber-700 hover:bg-white/60'
          }`}
        >
          <span>2. Chez le CF</span>
          <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
            statusFilter === 'TRANSMIS_CF' ? 'bg-amber-800 text-white' : 'bg-amber-100 text-amber-800'
          }`}>
            {countTransmisCf}
          </span>
        </button>

        <button
          onClick={() => setStatusFilter('RETOUR_CF')}
          className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer ${
            statusFilter === 'RETOUR_CF'
              ? 'bg-orange-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-orange-700 hover:bg-white/60'
          }`}
        >
          <span>3. Revenus du CF</span>
          <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
            statusFilter === 'RETOUR_CF' ? 'bg-orange-800 text-white' : 'bg-orange-100 text-orange-800'
          }`}>
            {countRetourCf}
          </span>
        </button>

        <button
          onClick={() => setStatusFilter('VALIDE_CF')}
          className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer ${
            statusFilter === 'VALIDE_CF'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-emerald-700 hover:bg-white/60'
          }`}
        >
          <span>4. Visés CF</span>
          <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
            statusFilter === 'VALIDE_CF' ? 'bg-emerald-800 text-white' : 'bg-emerald-100 text-emerald-800'
          }`}>
            {countValidesCf}
          </span>
        </button>

        <button
          onClick={() => setStatusFilter('ENGAGE')}
          className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer ${
            statusFilter === 'ENGAGE'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-indigo-700 hover:bg-white/60'
          }`}
        >
          <span>5. Engagés (Comptable)</span>
          <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
            statusFilter === 'ENGAGE' ? 'bg-indigo-800 text-white' : 'bg-indigo-100 text-indigo-800'
          }`}>
            {countEngages}
          </span>
        </button>

        <button
          onClick={() => setStatusFilter('MANDATE')}
          className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer ${
            statusFilter === 'MANDATE'
              ? 'bg-purple-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-purple-700 hover:bg-white/60'
          }`}
        >
          <span>6. Mandatés (Terminés)</span>
          <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
            statusFilter === 'MANDATE' ? 'bg-purple-800 text-white' : 'bg-purple-100 text-purple-800'
          }`}>
            {countMandates}
          </span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            id="input-search-dossiers"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher par IM, Nom défunt, Bénéficiaire, N° Décision..."
            className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-slate-900"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              Effacer
            </button>
          )}
        </div>

        {/* Secondary Dropdown Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Activité Filter */}
          <select
            id="filter-activite-select"
            value={activiteFilter}
            onChange={(e) => setActiviteFilter(e.target.value)}
            className="text-xs border border-slate-300 rounded-xl px-3 py-2 bg-white text-slate-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="ALL">Activité et Retraite</option>
            <option value="ACTIVITE">Défunt en Activité</option>
            <option value="RETRAITE_PENSIONNE">Défunt Pensionné / Retraité</option>
          </select>

          {/* Ministère Filter */}
          <select
            id="filter-ministere-select"
            value={ministereFilter}
            onChange={(e) => setMinistereFilter(e.target.value)}
            className="text-xs border border-slate-300 rounded-xl px-3 py-2 bg-white text-slate-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="ALL">Tous les ministères</option>
            <option value="Économie">M. Économie et Finances</option>
            <option value="Éducation">M. Éducation Nationale</option>
            <option value="Santé">M. Santé Publique</option>
            <option value="Justice">M. Justice</option>
            <option value="Travaux">M. Travaux Publics</option>
            <option value="Agriculture">M. Agriculture / Élevage</option>
          </select>

          {/* Date de Décès Filter */}
          <select
            id="filter-date-select"
            value={dateDecesFilter}
            onChange={(e) => setDateDecesFilter(e.target.value)}
            className="text-xs border border-slate-300 rounded-xl px-3 py-2 bg-white text-slate-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="ALL">Toutes les dates de décès</option>
            <option value="2026">Décès en 2026</option>
            <option value="2025">Décès en 2025</option>
            <option value="OLDER">Décès &lt; 2025</option>
          </select>
        </div>
      </div>

      {/* DATAGRID 8 COLONNES EXCEL */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table id="dossiers-datagrid" className="w-full text-left text-xs border-collapse">
            {/* Headers: Strictement les 8 colonnes Excel */}
            <thead>
              <tr className="bg-slate-900 text-white font-bold text-[11px] tracking-wider uppercase">
                <th className="py-3.5 px-3 border-r border-slate-800 whitespace-nowrap">
                  1. DATE ARRIVÉE
                </th>
                <th className="py-3.5 px-3 border-r border-slate-800 whitespace-nowrap">
                  2. NOM BÉNÉFICIAIRE
                </th>
                <th className="py-3.5 px-3 border-r border-slate-800 whitespace-nowrap">
                  3. NOMS DÉFUNT
                </th>
                <th className="py-3.5 px-3 border-r border-slate-800 whitespace-nowrap">
                  4. IM
                </th>
                <th className="py-3.5 px-3 border-r border-slate-800 whitespace-nowrap">
                  5. DATE ENVOI CF
                </th>
                <th className="py-3.5 px-3 border-r border-slate-800 whitespace-nowrap">
                  6. N° VISA CF ET DÉCISION
                </th>
                <th className="py-3.5 px-3 border-r border-slate-800 whitespace-nowrap">
                  7. DATE, N° ET PRIX MANDAT
                </th>
                <th className="py-3.5 px-3 border-r border-slate-800 min-w-[200px]">
                  8. MOTIF REJET
                </th>
                <th className="py-3.5 px-3 text-center whitespace-nowrap">
                  ACTIONS (RBAC)
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-200">
              {filteredDossiers.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <p className="text-sm font-semibold text-slate-600">Aucun dossier ne correspond à votre filtre.</p>
                    <p className="text-xs text-slate-400 mt-1">Modifiez vos critères de recherche ou réinitialisez les filtres.</p>
                  </td>
                </tr>
              ) : (
                filteredDossiers.map((d, index) => {
                  const isEven = index % 2 === 0;
                  const isRejected = d.statut === 'REJETE_CF';
                  const isMandated = d.statut === 'MANDATE';
                  const checkEnvoi = WorkflowValidationService.canExecuteWorkflowAction(d, 'ENVOI_CF', activeRole);
                  const checkCf = WorkflowValidationService.canExecuteWorkflowAction(d, 'DECISION_CF', activeRole);
                  const checkMandat = WorkflowValidationService.canExecuteWorkflowAction(d, 'MANDATEMENT', activeRole);

                  // Calcul de complétude des pièces obligatoires
                  const totalRequired = d.pieces ? d.pieces.filter(p => p.estObligatoire).length : 0;
                  const validRequired = d.pieces ? d.pieces.filter(p => p.estObligatoire && (p.statut === 'CONFORME' || p.statut === 'VALIDE')).length : 0;
                  const percentCompleteness = totalRequired > 0 ? Math.round((validRequired / totalRequired) * 100) : 100;

                  // Calcul de latence (dossiers en attente)
                  const dateToCompare = d.updatedAt || d.createdAt || d.dateArrivee;
                  let latencyDays = 0;
                  if (dateToCompare) {
                    const diffTime = Math.abs(new Date().getTime() - new Date(dateToCompare).getTime());
                    latencyDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                  }
                  const isStuck = latencyDays > 7 && d.statut !== 'MANDATE';

                  return (
                    <tr
                      key={d.id}
                      className={`hover:bg-blue-50/40 transition-colors ${
                        isRejected ? 'bg-rose-50/30' : isMandated ? 'bg-purple-50/20' : isEven ? 'bg-white' : 'bg-slate-50/50'
                      }`}
                    >
                      {/* 1. DATE ARRIVÉE */}
                      <td className="py-3 px-3 font-mono font-medium text-slate-900 border-r border-slate-200/80 whitespace-nowrap">
                        {d.dateArrivee}
                      </td>

                      {/* 2. NOM BÉNÉFICIAIRE */}
                      <td className="py-3 px-3 font-semibold text-slate-900 border-r border-slate-200/80">
                        <div className="truncate max-w-[180px]" title={`${d.demandeur.nom} ${d.demandeur.prenoms}`}>
                          {d.demandeur.nom} {d.demandeur.prenoms}
                        </div>
                        <span className="text-[10px] text-slate-400 block font-normal">
                          {d.demandeur.lienParente.replace(/_/g, ' ')}
                        </span>
                        
                        {/* Jauge de complétude */}
                        <div className="mt-1.5 flex items-center gap-1.5">
                          <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold ${
                            percentCompleteness === 100
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-amber-50 text-amber-800 border border-amber-200'
                          }`}>
                            {percentCompleteness}% pièces OK
                          </span>
                          <div className="w-12 bg-slate-100 h-1 rounded-full overflow-hidden border border-slate-200">
                            <div
                              className={`h-full rounded-full ${percentCompleteness === 100 ? 'bg-emerald-500' : 'bg-amber-500'}`}
                              style={{ width: `${percentCompleteness}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* 3. NOMS DÉFUNT */}
                      <td className="py-3 px-3 font-semibold text-slate-900 border-r border-slate-200/80">
                        <div className="truncate max-w-[180px]" title={`${d.defunt.nom} ${d.defunt.prenoms}`}>
                          {d.defunt.nom} {d.defunt.prenoms}
                        </div>
                        <div className="flex items-center gap-1 mt-0.5">
                          <span className={`inline-block px-1.5 py-0.2 rounded text-[10px] font-bold ${
                            d.defunt.statutActivite === 'ACTIVITE' 
                              ? (d.defunt.typeAgentActivite === 'EFA_ELD' 
                                  ? 'bg-amber-100 text-amber-800 border border-amber-200' 
                                  : 'bg-blue-100 text-blue-800 border border-blue-200')
                              : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          }`}>
                            {d.defunt.statutActivite === 'ACTIVITE' 
                              ? (d.defunt.typeAgentActivite === 'EFA_ELD' ? 'Agent EFA / ELD' : 'Fonctionnaire') 
                              : 'Pensionné Retraité'}
                          </span>
                        </div>

                        {/* Alerte de latence / blocage */}
                        {isStuck && (
                          <div className="mt-1.5 flex items-center gap-1 text-[9px] font-bold text-rose-700 bg-rose-50 border border-rose-100 px-1.5 py-0.5 rounded-md w-max animate-pulse">
                            <span className="relative flex h-1.5 w-1.5 shrink-0">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-rose-500"></span>
                            </span>
                            <span>Bloqué : {latencyDays} jours</span>
                          </div>
                        )}
                      </td>

                      {/* 4. IM */}
                      <td className="py-3 px-3 font-mono font-bold text-blue-700 border-r border-slate-200/80 whitespace-nowrap">
                        {d.defunt.im}
                      </td>

                      {/* 5. DATE ET HEURE ENVOI CF */}
                      <td className="py-3 px-3 font-mono text-slate-800 border-r border-slate-200/80 whitespace-nowrap">
                        {d.dateEnvoiCf ? (
                          <div className="flex flex-col gap-1">
                            <span className="text-xs font-semibold text-blue-900 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 w-max">
                              {d.dateEnvoiCf}
                            </span>
                            {d.dateRetourCf && (
                              <span className="text-[10px] font-bold text-orange-800 bg-orange-50 px-1.5 py-0.5 rounded border border-orange-200 w-max" title={d.motifRetourCf || 'Dossier revenu du CF'}>
                                ↩ Revenu : {d.dateRetourCf}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-300 italic">— Non envoyé</span>
                        )}
                      </td>

                      {/* 6. N° VISA CF ET DÉCISION */}
                      <td className="py-3 px-3 font-mono text-slate-900 border-r border-slate-200/80 whitespace-nowrap">
                        {d.numVisaCf || d.numDecision || d.dateVisaCf ? (
                          <div className="flex flex-col gap-1">
                            {/* Visa CF */}
                            {(d.numVisaCf || d.dateVisaCf) && (
                              <div className="flex items-center gap-1">
                                <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold text-[11px]" title="N° de Visa du Contrôle Financier">
                                  VCF: {d.numVisaCf || 'Accordé'}
                                </span>
                                {d.dateVisaCf && (
                                  <span className="text-[10px] text-emerald-700" title="Date du visa CF">
                                    ({d.dateVisaCf})
                                  </span>
                                )}
                              </div>
                            )}
                            {/* Décision administrative */}
                            {d.numDecision ? (
                              <div className="flex items-center gap-1">
                                <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-900 border border-blue-200 font-bold text-[11px]" title="N° de Décision administrative">
                                  Déc: {d.numDecision}
                                </span>
                                {d.dateDecision && (
                                  <span className="text-[10px] text-blue-700" title="Date de la décision">
                                    ({d.dateDecision})
                                  </span>
                                )}
                              </div>
                            ) : (
                              (d.statut === 'VALIDE_CF' || d.statut === 'ENGAGE' || d.statut === 'MANDATE') && (
                                <span className="text-[10px] text-amber-700 font-medium italic">
                                  Décision à rédiger
                                </span>
                              )
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-300 italic">— En attente</span>
                        )}
                      </td>

                      {/* 7. DATE, N° ET PRIX MANDAT */}
                      <td className="py-3 px-3 font-mono text-slate-900 border-r border-slate-200/80 whitespace-nowrap">
                        {d.dateMandatement || d.refEngagement ? (
                          <div className="flex flex-col gap-1">
                            {d.refEngagement && (
                              <span className="text-[10px] font-semibold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-200 w-max">
                                Engagé : {d.refEngagement}
                              </span>
                            )}
                            {d.dateMandatement && (
                              <span className="px-2 py-0.5 rounded bg-purple-50 text-purple-800 border border-purple-200 font-bold w-max text-xs">
                                Mandaté : {d.dateMandatement}
                              </span>
                            )}
                            {d.numMandat && (
                              <span className="text-[10px] text-slate-500 font-medium tracking-wide">
                                N° {d.numMandat}
                              </span>
                            )}
                            <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50/80 border border-emerald-200 px-1.5 py-0.5 rounded w-max">
                              {(d.montantMandat || d.montantSecours || 0).toLocaleString()} Ar
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-300 italic">— Non mandaté</span>
                        )}
                      </td>

                      {/* 8. MOTIF RETOUR / REJET / OBSERVATIONS */}
                      <td className="py-3 px-3 border-r border-slate-200/80">
                        {d.motifRetourCf ? (
                          <div className="text-xs text-orange-800 font-medium bg-orange-50 p-1.5 rounded border border-orange-200 leading-snug">
                            <strong className="block text-[10px] uppercase font-bold text-orange-900">Motif retour CF :</strong>
                            {d.motifRetourCf}
                          </div>
                        ) : d.motifRejet ? (
                          <div className="text-xs text-rose-700 font-medium bg-rose-50 p-1.5 rounded border border-rose-200 leading-snug">
                            <strong className="block text-[10px] uppercase font-bold text-rose-900">Motif rejet :</strong>
                            {d.motifRejet}
                          </div>
                        ) : d.observations ? (
                          <div className="text-xs text-slate-600 line-clamp-2" title={d.observations}>
                            {d.observations}
                          </div>
                        ) : (
                          <span className="text-slate-300 italic text-[11px]">Néant</span>
                        )}
                      </td>

                      {/* ACTIONS SELON RÔLE */}
                      <td className="py-2.5 px-3 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5 flex-wrap">
                          {/* Consult button */}
                          <button
                            onClick={() => onSelectDossier(d)}
                            className="p-1.5 rounded-lg text-slate-600 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                            title="Consulter les détails et vérifier les pièces"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {/* Edit button (Agent) */}
                          {onEditDossier && (activeRole === 'AGENT') && (
                            <button
                              onClick={() => onEditDossier(d)}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-blue-700 hover:bg-blue-50 transition-colors"
                              title="Modifier ce dossier"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                          )}

                          {/* Delete button (Agent) */}
                          {onDeleteDossier && (activeRole === 'AGENT') && (
                            <button
                              onClick={() => onDeleteDossier(d)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                              title="Supprimer ce dossier"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}

                          {/* --- ACTIONS COMPTE AGENT --- */}
                          {activeRole === 'AGENT' && (
                            <>
                              {/* 1. Dossier Incomplet ou en réception (non encore visé par le CF) */}
                              {(!d.dateEnvoiCf || d.statut === 'RECEPTION_EN_COURS' || d.statut === 'ENQUETE_CONFORME' || d.statut === 'DOSSIER_INCOMPLET') && d.statut !== 'MANDATE' && (
                                <div className="flex items-center gap-1">
                                  <button
                                    onClick={() => onOpenWorkflowAction(d, 'ENVOI_CF')}
                                    className="px-2.5 py-1 rounded-md text-[11px] font-semibold flex items-center gap-1 text-white bg-blue-600 hover:bg-blue-700 shadow-2xs transition-all cursor-pointer"
                                    title="Envoyer le dossier au Contrôle Financier (enregistre date et heure)"
                                  >
                                    <Send className="w-3 h-3" />
                                    <span>Envoyer CF</span>
                                  </button>

                                  <button
                                    onClick={() => onOpenWorkflowAction(d, 'VISA_CF')}
                                    className="px-2 py-1 rounded-md text-[11px] font-semibold flex items-center gap-1 text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 shadow-2xs cursor-pointer"
                                    title="Notifier le Visa accordé par le CF"
                                  >
                                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                    <span>Visa CF</span>
                                  </button>
                                </div>
                              )}

                              {/* 2. Dossier retourné : Renvoyer au CF (visa et décision inchangés) OU Renvoyer directement au mandatement */}
                              {(d.statut === 'RETOUR_CF' || d.statut === 'REJETE_CF') && (
                                <div className="flex items-center gap-1">
                                  <button
                                    onClick={() => onOpenWorkflowAction(d, 'ENVOI_CF')}
                                    className="px-2.5 py-1 rounded-md text-[11px] font-semibold flex items-center gap-1 text-white bg-blue-600 hover:bg-blue-700 shadow-2xs transition-all cursor-pointer"
                                    title="Renvoyer le dossier corrigé au CF (le visa et la décision ne changent pas)"
                                  >
                                    <Send className="w-3 h-3" />
                                    <span>Renvoyer CF</span>
                                  </button>

                                  {(d.refEngagement || d.numVisaCf) && (
                                    <button
                                      onClick={() => {
                                        DossierStorageService.renvoyerAuMandatement(d.id);
                                        onOpenWorkflowAction(d, 'MANDATEMENT');
                                      }}
                                      className="px-2 py-1 rounded-md text-[11px] font-semibold flex items-center gap-1 text-purple-900 bg-purple-100 hover:bg-purple-200 border border-purple-300 shadow-2xs cursor-pointer"
                                      title="Renvoyer directement au mandatement sans repasser par le CF"
                                    >
                                      <CreditCard className="w-3 h-3 text-purple-700" />
                                      <span>Renvoi Mandatement</span>
                                    </button>
                                  )}

                                  {!d.numVisaCf && (
                                    <button
                                      onClick={() => onOpenWorkflowAction(d, 'VISA_CF')}
                                      className="px-2 py-1 rounded-md text-[11px] font-semibold flex items-center gap-1 text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 shadow-2xs cursor-pointer"
                                      title="Visa CF accordé"
                                    >
                                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                      <span>Visa CF</span>
                                    </button>
                                  )}
                                </div>
                              )}

                              {/* 3. Si chez le CF (TRANSMIS_CF) : Rejet CF OU Notifier Visa */}
                              {d.statut === 'TRANSMIS_CF' && (
                                <>
                                  <button
                                    onClick={() => onOpenWorkflowAction(d, 'RETOUR_CF')}
                                    className="px-2.5 py-1 rounded-md text-[11px] font-semibold flex items-center gap-1 text-rose-950 bg-rose-100 hover:bg-rose-200 border border-rose-300 shadow-2xs transition-all cursor-pointer"
                                    title="Marquer le rejet du dossier par le CF (date et heure automatique + motif)"
                                  >
                                    <XCircle className="w-3 h-3 text-rose-700" />
                                    <span>Rejet CF</span>
                                  </button>

                                  <button
                                    onClick={() => onOpenWorkflowAction(d, 'VISA_CF')}
                                    className="px-2.5 py-1 rounded-md text-[11px] font-semibold flex items-center gap-1 text-white bg-emerald-600 hover:bg-emerald-700 shadow-2xs transition-all cursor-pointer"
                                    title="Notifier que le dossier est visé par le CF (prêt pour le comptable)"
                                  >
                                    <CheckCircle2 className="w-3 h-3" />
                                    <span>Visa CF</span>
                                  </button>
                                </>
                              )}

                              {/* 4. Si déjà visé ou engagé : l'agent peut établir et saisir le N° de décision et engager/mandater */}
                              {(d.statut === 'VALIDE_CF' || d.statut === 'ENGAGE') && (
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                    ✓ Visé CF
                                  </span>
                                  <button
                                    onClick={() => onOpenWorkflowAction(d, 'SAISIE_DECISION')}
                                    className={`px-2 py-0.5 rounded text-[10px] font-semibold flex items-center gap-1 cursor-pointer transition-all ${
                                      d.numDecision
                                        ? 'text-blue-800 bg-blue-50 hover:bg-blue-100 border border-blue-200'
                                        : 'text-white bg-blue-600 hover:bg-blue-700 shadow-2xs'
                                    }`}
                                    title={d.numDecision ? `Décision ${d.numDecision} (cliquer pour modifier)` : "Saisir le N° de décision d'octroi"}
                                  >
                                    <FileText className="w-2.5 h-2.5" />
                                    <span>{d.numDecision ? `N° ${d.numDecision}` : 'Saisir Décision'}</span>
                                  </button>

                                  {d.statut === 'VALIDE_CF' && (
                                    <>
                                      <button
                                        onClick={() => onOpenWorkflowAction(d, 'ENGAGEMENT')}
                                        className="px-2.5 py-1 rounded-md text-[11px] font-semibold flex items-center gap-1 text-white bg-indigo-600 hover:bg-indigo-700 shadow-2xs cursor-pointer"
                                        title="Engager le dossier de dépense"
                                      >
                                        <FileCheck className="w-3 h-3" />
                                        <span>Engager</span>
                                      </button>
                                      <button
                                        onClick={() => onOpenWorkflowAction(d, 'MANDATEMENT')}
                                        className="px-2.5 py-1 rounded-md text-[11px] font-semibold flex items-center gap-1 text-slate-700 bg-slate-100 hover:bg-rose-50 hover:text-rose-700 border border-slate-200 shadow-2xs cursor-pointer"
                                        title="Mandater le secours"
                                      >
                                        <CreditCard className="w-3 h-3 text-slate-500" />
                                        <span>Mandater</span>
                                      </button>
                                    </>
                                  )}

                                  {d.statut === 'ENGAGE' && (
                                    <div className="flex items-center gap-1">
                                      <button
                                        onClick={() => onOpenWorkflowAction(d, 'MANDATEMENT')}
                                        className="px-2.5 py-1 rounded-md text-[11px] font-semibold flex items-center gap-1 text-white bg-purple-600 hover:bg-purple-700 shadow-2xs cursor-pointer"
                                        title="Mandater le secours"
                                      >
                                        <CreditCard className="w-3 h-3" />
                                        <span>Mandater</span>
                                      </button>

                                      <button
                                        onClick={() => onOpenWorkflowAction(d, 'RETOUR_CF')}
                                        className="px-2 py-1 rounded-md text-[11px] font-semibold flex items-center gap-1 text-amber-900 bg-amber-50 hover:bg-amber-100 border border-amber-300 shadow-2xs cursor-pointer"
                                        title="Enregistrer un retour ou des observations après engagement"
                                      >
                                        <RotateCcw className="w-3 h-3 text-amber-700" />
                                        <span>Retour</span>
                                      </button>
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* 5. Si déjà mandaté */}
                              {d.statut === 'MANDATE' && (
                                <div className="flex items-center gap-1.5">
                                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-200">
                                    ✓ Mandaté
                                  </span>
                                  {!d.numDecision && (
                                    <button
                                      onClick={() => onOpenWorkflowAction(d, 'SAISIE_DECISION')}
                                      className="px-2 py-0.5 rounded text-[10px] font-semibold flex items-center gap-1 text-white bg-blue-600 hover:bg-blue-700 shadow-2xs cursor-pointer"
                                      title="Saisir le N° de décision d'octroi"
                                    >
                                      <FileText className="w-2.5 h-2.5" />
                                      <span>+ Décision</span>
                                    </button>
                                  )}
                                </div>
                              )}
                            </>
                          )}


                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Datagrid Footer */}
        <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between text-xs text-slate-500 gap-2">
          <div>
            Affichage de <strong>{filteredDossiers.length}</strong> sur <strong>{dossiers.length}</strong> dossier(s)
          </div>
          <div className="flex items-center gap-4 text-[11px]">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
              Activité
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              Pensionné
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
              Rejeté
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-purple-500" />
              Mandaté
            </span>
          </div>
        </div>
      </div>

      {/* Modal d'exportation officielle du registre en PDF */}
      {isExportPdfModalOpen && (
        <ExportPdfModal
          dossiers={filteredDossiers}
          allDossiersCount={dossiers.length}
          activeFilterLabel={getActiveFilterLabel()}
          onClose={() => setIsExportPdfModalOpen(false)}
        />
      )}
    </div>
  );
};
