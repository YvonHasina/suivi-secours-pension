import React from 'react';
import {
  Download,
  UserCheck,
  ChevronDown,
  Bell,
  RefreshCw,
  Plus,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  LogIn,
  UserPlus,
  LogOut,
  User as UserIcon,
  Shield,
  Sparkles,
} from 'lucide-react';
import { User, UserRole } from '../types';
import { DossierStorageService } from '../services/dossierStorage';
import { INITIAL_USERS } from '../services/initialData';

interface NavbarProps {
  activeUser?: User;
  activeRole?: UserRole;
  onNewEnquete: () => void;
  onExportCsv?: () => void;
  onExportAll?: () => void;
  onToggleMobileSidebar?: () => void;
  isSidebarCollapsed?: boolean;
  onToggleCollapseSidebar?: () => void;
  onOpenAuthModal?: (mode: 'LOGIN' | 'REGISTER') => void;
  onNavigateProfile?: () => void;
  onLogout?: () => void;
  onResetData?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeUser,
  activeRole,
  onNewEnquete,
  onExportCsv,
  onExportAll,
  onToggleMobileSidebar,
  isSidebarCollapsed,
  onToggleCollapseSidebar,
  onOpenAuthModal,
  onNavigateProfile,
  onLogout,
  onResetData,
}) => {
  const [dropdownOpen, setDropdownOpen] = React.useState(false);

  const effectiveRole: UserRole = activeUser?.role || activeRole || 'AGENT';
  const currentUser: User =
    activeUser ||
    INITIAL_USERS.find((u) => u.role === effectiveRole) ||
    INITIAL_USERS[0];

  const handleExport = onExportCsv || onExportAll || (() => DossierStorageService.exportExcelCsv(DossierStorageService.getDossiers()));

  const rolesConfig: Record<UserRole, { label: string; badge: string; color: string; desc: string }> = {
    AGENT: {
      label: 'Compte Agent',
      badge: 'AGENT',
      color: 'bg-blue-50 text-blue-700 border-blue-200',
      desc: 'Saisie dossier, étude de fond et mandatement',
    },
    ADMIN: {
      label: 'Compte Administrateur',
      badge: 'ADMIN',
      color: 'bg-indigo-50 text-indigo-700 border-indigo-200',
      desc: 'Suivi du circuit et supervision globale',
    },
  };

  const currentCfg = rolesConfig[currentUser.role] || rolesConfig.AGENT;

  return (
    <header
      id="top-navbar"
      className="sticky top-0 z-20 h-16 bg-white border-b border-slate-200/80 px-4 sm:px-6 flex items-center justify-between shadow-xs"
    >
      {/* Left title et context */}
      <div className="flex items-center gap-3 min-w-0">
        {/* Mobile Hamburger toggle */}
        {onToggleMobileSidebar && (
          <button
            id="btn-toggle-mobile-sidebar"
            type="button"
            onClick={onToggleMobileSidebar}
            className="lg:hidden p-2 -ml-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors shrink-0"
            title="Ouvrir le menu de navigation"
            aria-label="Menu"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}

        {/* Desktop Collapse / Expand toggle */}
        {onToggleCollapseSidebar && (
          <button
            id="btn-toggle-collapse-desktop"
            type="button"
            onClick={onToggleCollapseSidebar}
            className="hidden lg:flex items-center justify-center p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors shrink-0"
            title={isSidebarCollapsed ? "Agrandir le menu latéral" : "Réduire le menu pour maximiser la vue"}
          >
            {isSidebarCollapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
          </button>
        )}

        <div className="min-w-0">
          <h1 className="text-base sm:text-lg font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5 truncate">
            <span className="truncate">Régime des Pensions et Secours aux Décès</span>
            <span className="hidden md:inline-block px-2.5 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200 shrink-0">
              Arrêté Interministériel
            </span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 hidden sm:block truncate font-medium">
            Contrôle d'instruction des dossiers et vérification réglementaire des pièces
          </p>
        </div>
      </div>

      {/* Right Actions et User Profile */}
      <div className="flex items-center gap-3">

        {/* Interactive User Profile et RBAC Menu with 3D Badge */}
        <div className="relative">
          <button
            id="btn-role-switcher-toggle"
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-medium transition-all ${currentCfg.color} card-3d shadow-2xs hover:shadow-md hover:-translate-y-0.5 active:translate-y-0.5`}
          >
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-700 text-white font-bold text-[11px] flex items-center justify-center shrink-0 shadow-[0_2px_4px_rgba(37,99,235,0.35),inset_0_1px_0_rgba(255,255,255,0.3)]">
              {currentUser.nomComplet.charAt(0).toUpperCase()}
            </div>
            <div className="text-left hidden sm:block">
              <span className="font-bold block leading-tight text-slate-900">{currentUser.nomComplet}</span>
              <span className="text-[10px] font-medium opacity-80 block">{currentCfg.label}</span>
            </div>
            <span className="sm:hidden font-bold">{currentCfg.badge}</span>
            <ChevronDown className="w-3.5 h-3.5 opacity-60 ml-0.5" />
          </button>

          {dropdownOpen && (
            <div
              id="role-switcher-dropdown"
              className="absolute right-0 mt-2.5 w-80 bg-white/98 backdrop-blur-md rounded-2xl shadow-[0_20px_50px_rgba(15,23,42,0.2),inset_0_1px_0_rgba(255,255,255,0.9)] border border-slate-200 py-2 z-50 animate-in fade-in zoom-in-95 duration-150"
            >
              {/* User Identity Header */}
              <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/70">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Compte Actif
                  </span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${currentCfg.color}`}>
                    {currentUser.role}
                  </span>
                </div>
                <div className="text-xs font-bold text-slate-900 mt-1 truncate">
                  {currentUser.nomComplet}
                </div>
                <div className="text-[11px] text-slate-500 truncate">
                  {currentUser.email}
                </div>
                {currentUser.matricule && (
                  <div className="text-[10px] font-mono text-slate-400 mt-0.5">
                    {currentUser.matricule} • {currentUser.poste}
                  </div>
                )}
              </div>

              {/* Profile et Auth Actions */}
              <div className="p-2 border-b border-slate-100 space-y-1">
                {onNavigateProfile && (
                  <button
                    type="button"
                    onClick={() => {
                      onNavigateProfile();
                      setDropdownOpen(false);
                    }}
                    className="w-full px-3 py-2 text-xs font-semibold text-slate-700 hover:text-blue-700 hover:bg-blue-50 rounded-xl transition-colors flex items-center gap-2.5 text-left"
                  >
                    <UserIcon className="w-4 h-4 text-blue-600" />
                    <span>Mon Profil et Paramètres de sécurité</span>
                  </button>
                )}

                {onOpenAuthModal && (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        onOpenAuthModal('REGISTER');
                        setDropdownOpen(false);
                      }}
                      className="w-full px-3 py-2 text-xs font-semibold text-slate-700 hover:text-emerald-700 hover:bg-emerald-50 rounded-xl transition-colors flex items-center gap-2.5 text-left"
                    >
                      <UserPlus className="w-4 h-4 text-emerald-600" />
                      <span>Créer un nouveau compte agent</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        onOpenAuthModal('LOGIN');
                        setDropdownOpen(false);
                      }}
                      className="w-full px-3 py-2 text-xs font-semibold text-slate-700 hover:text-indigo-700 hover:bg-indigo-50 rounded-xl transition-colors flex items-center gap-2.5 text-left"
                    >
                      <LogIn className="w-4 h-4 text-indigo-600" />
                      <span>Changer de compte / Se connecter</span>
                    </button>
                  </>
                )}
              </div>



              {/* Bottom Actions: Clear All et Logout */}
              <div className="px-3 pt-2 mt-1 border-t border-slate-100 flex items-center justify-between text-xs">
                <button
                  type="button"
                  onClick={() => {
                    if (onResetData) {
                      onResetData();
                    } else {
                      DossierStorageService.resetToDemo();
                    }
                    setDropdownOpen(false);
                  }}
                  className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Effacer tout (0 dossier)</span>
                </button>

                {onLogout && (
                  <button
                    type="button"
                    onClick={() => {
                      onLogout();
                      setDropdownOpen(false);
                    }}
                    className="flex items-center gap-1 text-[11px] font-semibold text-rose-600 hover:text-rose-700 transition-colors"
                  >
                    <LogOut className="w-3 h-3" />
                    <span>Déconnexion</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
