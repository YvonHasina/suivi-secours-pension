import React from 'react';
import {
  LayoutDashboard,
  Table,
  FileText,
  BarChart3,
  Settings,
  ShieldCheck,
  FileSpreadsheet,
  Building2,
  X,
  ChevronLeft,
  ChevronRight,
  UserCheck,
  PieChart,
} from 'lucide-react';
import { UserRole } from '../types';

export type NavTab = 'dashboard' | 'dossiers' | 'enquete' | 'settings' | 'profile';

interface SidebarProps {
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  activeRole: UserRole;
  pendingCount?: number;
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  activeRole,
  pendingCount = 0,
  isOpenMobile = false,
  onCloseMobile,
  isCollapsed = false,
  onToggleCollapse,
}) => {
  const navItems = [
    {
      id: 'dashboard' as NavTab,
      label: 'Tableau de Bord et Indicateurs',
      shortLabel: 'Tableau',
      icon: LayoutDashboard,
      badge: null,
      description: 'Pilotage et statistiques',
    },
    {
      id: 'dossiers' as NavTab,
      label: 'Registre des Dossiers',
      shortLabel: 'Registre',
      icon: Table,
      badge: pendingCount > 0 ? `${pendingCount}` : null,
      description: 'Tableau des 8 colonnes',
    },
    ...((activeRole === 'AGENT')
      ? [{
          id: 'enquete' as NavTab,
          label: 'Nouvelle Étude de fond et de forme',
          shortLabel: 'Étude',
          icon: FileText,
          badge: 'Nouveau',
          badgeColor: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30',
          description: 'Saisie et pièces justificatives',
        }]
      : []),
    {
      id: 'settings' as NavTab,
      label: 'Rôles et Paramètres',
      shortLabel: 'Paramètres',
      icon: Settings,
      badge: null,
      description: 'Changer de profil ou configurer',
    },
    {
      id: 'profile' as NavTab,
      label: 'Mon Compte',
      shortLabel: 'Profil',
      icon: UserCheck,
      badge: null,
      description: 'Session et audit',
    },
  ];

  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case 'AGENT':
        return { label: 'COMPTE AGENT', color: 'bg-blue-500/10 text-blue-400 border-blue-500/30' };
      case 'ADMIN':
        return { label: 'ADMINISTRATEUR', color: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30' };
      default:
        return { label: 'COMPTE AGENT', color: 'bg-blue-500/10 text-blue-400 border-blue-500/30' };
    }
  };

  const roleInfo = getRoleBadge(activeRole);

  const handleItemClick = (id: NavTab) => {
    onSelectTab(id);
    if (onCloseMobile) {
      onCloseMobile();
    }
  };

  // Content shared between desktop and mobile drawer
  const renderNavContent = (collapsed: boolean, isMobileView: boolean = false) => (
    <div className="flex flex-col h-full justify-between select-none relative z-10">
      {/* Brand Header with 3D Sovereign Emblem et Madagascar National Ribbon */}
      <div>
        <div
          className={`border-b border-slate-800/90 bg-gradient-to-b from-slate-900 via-slate-950/95 to-slate-950/80 ${
            collapsed ? 'p-3 flex flex-col items-center' : 'px-5 py-4'
          }`}
        >
          {/* Subtle National Colors micro-ribbon at the very top */}
          <div className="flex h-1 w-full rounded-full overflow-hidden mb-3.5 opacity-90 shadow-[0_1px_4px_rgba(0,0,0,0.5)]">
            <span className="w-1/3 bg-white" />
            <span className="w-1/3 bg-rose-600" />
            <span className="w-1/3 bg-emerald-600" />
          </div>

          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-3">
              {/* Layered 3D Sovereign Shield Emblem with Dual Specular Light Rims */}
              <div className="relative group shrink-0">
                <div className="absolute -inset-1 bg-gradient-to-r from-blue-500 via-cyan-400 to-indigo-600 rounded-2xl blur-xs opacity-60 group-hover:opacity-85 transition duration-300" />
                <div className="relative w-10 h-10 rounded-xl bg-gradient-to-b from-blue-500 via-blue-600 to-indigo-900 flex items-center justify-center shadow-[0_6px_16px_rgba(37,99,235,0.55),inset_0_1.5px_1px_rgba(255,255,255,0.5),inset_0_-2px_0_rgba(15,23,42,0.8)] border border-blue-400/50 transform transition-transform duration-200 group-hover:scale-105 group-hover:-translate-y-0.5">
                  <ShieldCheck className="w-5 h-5 text-white drop-shadow-[0_1.5px_3px_rgba(0,0,0,0.6)]" />
                  {/* Micro rim specular reflection */}
                  <div className="absolute top-0.5 left-1.5 right-1.5 h-[1px] bg-white/60 rounded-full" />
                </div>
              </div>

              {!collapsed && (
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <h1 className="text-sm font-black text-white tracking-tight leading-tight truncate drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]">
                      Secours aux Décès
                    </h1>
                    <span className="px-1.5 py-0.2 rounded-sm text-[8px] font-extrabold uppercase bg-blue-500/25 text-blue-300 border border-blue-400/40 shadow-xs">
                      MEF
                    </span>
                  </div>
                  <p className="text-[10px] font-medium text-slate-400 flex items-center gap-1 mt-0.5 truncate">
                    <Building2 className="w-3 h-3 text-cyan-400 inline shrink-0" />
                    Pensions et Solde • Madagascar
                  </p>
                </div>
              )}
            </div>

            {/* Mobile Close Button */}
            {isMobileView && onCloseMobile && (
              <button
                type="button"
                onClick={onCloseMobile}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800/80 transition-colors active:scale-95"
                aria-label="Fermer le menu"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* Active Role 3D Identity Badge */}
          {!collapsed && (
            <div className="mt-3.5 pt-2.5 border-t border-slate-800/70">
              <div className="flex items-center justify-between gap-2 p-1.5 rounded-lg bg-slate-950/80 border border-slate-800 shadow-[inset_0_2px_4px_rgba(0,0,0,0.6),0_1px_0_rgba(255,255,255,0.06)]">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="relative flex h-2 w-2 shrink-0">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                  </span>
                  <span className="text-slate-400 text-[10px] font-semibold uppercase tracking-wider truncate">
                    Session Active
                  </span>
                </div>
                <span
                  className={`px-2 py-0.5 rounded-md text-[10px] font-bold tracking-wide border truncate badge-3d-pill ${roleInfo.color}`}
                >
                  {roleInfo.label}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Navigation Items with 3D tactile elevation */}
        <nav className={`space-y-1.5 mt-3 ${collapsed ? 'px-2' : 'px-3'}`}>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                id={`sidebar-tab-${item.id}`}
                onClick={() => handleItemClick(item.id)}
                title={collapsed ? item.label : undefined}
                className={`w-full group flex items-center rounded-xl text-left transition-all duration-200 relative ${
                  collapsed
                    ? 'justify-center p-2.5'
                    : 'justify-between px-3 py-2.5'
                } ${
                  isActive
                    ? 'sidebar-item-active text-white font-medium shadow-[0_6px_18px_rgba(37,99,235,0.5),inset_0_1.5px_0_rgba(255,255,255,0.4),inset_0_-1.5px_1px_rgba(0,0,0,0.3)]'
                    : 'text-slate-300 hover:text-white hover:bg-slate-900/90 hover:shadow-[0_4px_12px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.08)] hover:-translate-y-0.5'
                }`}
              >
                {/* Active Indicator 3D Edge Pill with neon glow */}
                {isActive && !collapsed && (
                  <span className="absolute left-0 top-2 bottom-2 w-1.5 rounded-r-full bg-gradient-to-b from-cyan-300 via-blue-200 to-blue-400 shadow-[0_0_10px_rgba(103,232,249,0.9)]" />
                )}

                <div className={`flex items-center min-w-0 ${collapsed ? 'justify-center' : 'gap-3'}`}>
                  {/* Recessed 3D Socket for Icon */}
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200 shrink-0 ${
                      isActive
                        ? 'bg-white/20 text-white shadow-[inset_0_1px_1px_rgba(255,255,255,0.5),0_2px_4px_rgba(0,0,0,0.3)] border border-white/25'
                        : 'bg-slate-950/90 text-slate-400 group-hover:text-blue-400 group-hover:scale-105 border border-slate-800 shadow-[inset_0_2px_3px_rgba(0,0,0,0.6),0_1px_0_rgba(255,255,255,0.07)]'
                    }`}
                  >
                    <Icon className="w-4 h-4 drop-shadow-[0_1px_1px_rgba(0,0,0,0.3)]" />
                  </div>

                  {!collapsed && (
                    <div className="truncate">
                      <div className="text-xs font-semibold tracking-tight leading-tight flex items-center gap-1.5">
                        <span className={isActive ? 'text-white' : 'text-slate-200 group-hover:text-white'}>
                          {item.label}
                        </span>
                      </div>
                      <div
                        className={`text-[10px] truncate mt-0.5 ${
                          isActive ? 'text-blue-100/90 font-normal' : 'text-slate-400 group-hover:text-slate-300'
                        }`}
                      >
                        {item.description}
                      </div>
                    </div>
                  )}
                </div>

                {/* 3D Badge */}
                {item.badge && (
                  collapsed ? (
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-blue-400 ring-2 ring-slate-950 shadow-[0_0_6px_rgba(96,165,250,0.8)]" />
                  ) : (
                    <span
                      className={`ml-2 px-1.5 py-0.5 text-[9px] font-bold rounded-full shrink-0 badge-3d-pill ${
                        item.badgeColor
                          ? item.badgeColor
                          : isActive
                          ? 'bg-white text-blue-800 shadow-[0_2px_6px_rgba(0,0,0,0.2)]'
                          : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom Footer 3D Metallic Card et Collapse Toggle */}
      <div className={`border-t border-slate-800/90 bg-gradient-to-t from-slate-900/60 to-transparent ${collapsed ? 'p-2' : 'p-3'}`}>
        {!collapsed ? (
          <div className="rounded-xl p-3 bg-gradient-to-b from-slate-900/90 to-slate-950 border border-slate-800/90 shadow-[0_4px_16px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.08)] text-xs text-slate-300 space-y-2">
            <div className="flex items-center justify-between text-slate-200 font-semibold">
              <div className="flex items-center gap-2 text-xs">
                <div className="w-6 h-6 rounded-md bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]">
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                </div>
                <span className="truncate text-slate-100 text-xs">8 Colonnes Excel</span>
              </div>
              {onToggleCollapse && !isMobileView && (
                <button
                  type="button"
                  onClick={onToggleCollapse}
                  className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/80 transition-all border border-transparent hover:border-slate-700 active:translate-y-0.5 shadow-2xs"
                  title="Réduire le volet latéral"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
              )}
            </div>

            <p className="text-[10px] leading-relaxed text-slate-400">
              Contrôle Financier et Mandats du Trésor
            </p>

            <div className="pt-1.5 flex items-center justify-between text-[10px] text-slate-400 border-t border-slate-800/80">
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]" />
                <span>Base Synchronisée</span>
              </span>
              <span className="text-emerald-400 font-mono font-bold bg-emerald-500/10 px-1.5 py-0.2 rounded border border-emerald-500/20 text-[9px]">
                v1.0.0
              </span>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 py-1">
            {onToggleCollapse && !isMobileView && (
              <button
                type="button"
                onClick={onToggleCollapse}
                className="w-8 h-8 flex items-center justify-center rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 hover:border-slate-700 transition-all shadow-[0_2px_6px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.08)] active:translate-y-0.5"
                title="Développer le volet latéral"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
            <span className="text-[9px] font-mono text-emerald-400 font-semibold">v1.0</span>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* 1. DESKTOP SIDEBAR with 3D Edge Highlight et Elevation */}
      <aside
        id="main-sidebar-desktop"
        className={`hidden lg:flex flex-col shrink-0 h-full bg-gradient-to-b from-slate-950 via-slate-950 to-slate-900 text-slate-200 border-r border-slate-800/90 sidebar-bevel-edge transition-all duration-200 z-20 relative ${
          isCollapsed ? 'w-20' : 'w-60 xl:w-64'
        }`}
      >
        {renderNavContent(isCollapsed, false)}
      </aside>

      {/* 2. MOBILE DRAWER: slide-over with backdrop overlay for small screens / tablets */}
      {isOpenMobile && (
        <div
          id="sidebar-mobile-backdrop"
          onClick={onCloseMobile}
          className="fixed inset-0 z-40 bg-slate-950/80 backdrop-blur-xs lg:hidden transition-opacity"
          aria-hidden="true"
        />
      )}

      <aside
        id="main-sidebar-mobile"
        className={`fixed inset-y-0 left-0 z-50 w-72 bg-gradient-to-b from-slate-950 to-slate-900 text-slate-200 shadow-[10px_0_36px_rgba(0,0,0,0.8)] sidebar-bevel-edge transition-transform duration-300 ease-in-out lg:hidden border-r border-slate-800 ${
          isOpenMobile ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {renderNavContent(false, true)}
      </aside>
    </>
  );
};
