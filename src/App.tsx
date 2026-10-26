import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sidebar, NavTab } from './components/Sidebar';
import { Navbar } from './components/Navbar';
import { DashboardPage } from './pages/DashboardPage';
import { DossiersPage } from './pages/DossiersPage';
import { EnquetePage } from './pages/EnquetePage';
import { SettingsPage } from './pages/SettingsPage';
import { ProfilePage } from './pages/ProfilePage';
import { DossierDetailModal } from './components/DossierDetailModal';
import { DossierEditModal } from './components/DossierEditModal';
import { DossierDeleteModal } from './components/DossierDeleteModal';
import { WorkflowActionModal } from './components/WorkflowActionModal';
import { AuthModal, AuthMode } from './components/AuthModal';
import { ToastNotification } from './components/ToastNotification';
import { DossierStorageService } from './services/dossierStorage';
import { AuthService } from './services/authService';
import { DossierSecours, UserRole, User, ToastMessage, WorkflowActionType } from './types';

export default function App() {
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');
  const [dossierFilterStatus, setDossierFilterStatus] = useState<string>('ALL');
  const [activeUser, setActiveUser] = useState<User | null>(() => AuthService.getCurrentUser());

  const handleNavigate = (tab: NavTab, filter?: string) => {
    if (tab === 'dossiers' && filter) {
      setDossierFilterStatus(filter);
    } else if (tab === 'dossiers' && !filter) {
      setDossierFilterStatus('ALL');
    }
    setActiveTab(tab);
  };
  const [dossiers, setDossiers] = useState<DossierSecours[]>([]);
  const [isSidebarOpenMobile, setIsSidebarOpenMobile] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Auth modal state (for in-app account switching or adding accounts)
  const [authModal, setAuthModal] = useState<{
    isOpen: boolean;
    mode: AuthMode;
  }>({
    isOpen: false,
    mode: 'LOGIN',
  });

  // Toast Helper
  const addToast = (
    type: 'success' | 'error' | 'warning' | 'info',
    title: string,
    message?: string
  ) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    setToasts((prev) => [...prev, { id, type, title, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Modals state
  const [selectedDossier, setSelectedDossier] = useState<DossierSecours | null>(null);
  const [editingDossier, setEditingDossier] = useState<DossierSecours | null>(null);
  const [deletingDossier, setDeletingDossier] = useState<DossierSecours | null>(null);
  const [workflowActionState, setWorkflowActionState] = useState<{
    dossier: DossierSecours;
    action: WorkflowActionType;
  } | null>(null);

  // Workflow action opener (Dossiers incomplets désormais négligeables par le CF et le comptable)
  const handleOpenWorkflowAction = (dossier: DossierSecours, action: WorkflowActionType) => {
    // Règle formelle : L'engagement n'aura pas lieu si le dossier n'est pas visé par le CF
    if (action === 'ENGAGEMENT') {
      const aEteVise =
        !!dossier.numVisaCf ||
        !!dossier.numDecision ||
        !!dossier.dateVisaCf ||
        dossier.statut === 'VALIDE_CF' ||
        dossier.statut === 'ENGAGE';
      if (!aEteVise) {
        addToast(
          'error',
          'Engagement impossible',
          "L'engagement n'aura pas lieu si le dossier n'est pas préalablement visé par le Contrôle Financier."
        );
        return;
      }
    }

    // Si des pièces obligatoires sont manquantes, notification informative (non bloquante)
    const piecesIncompletes = (dossier.pieces || []).filter(
      (p) => p.estObligatoire && p.statut !== 'CONFORME'
    );
    if (piecesIncompletes.length > 0 && (action === 'ENGAGEMENT' || action === 'MANDATEMENT')) {
      addToast(
        'info',
        'Dossier incomplet négligeable',
        `Ce dossier comporte ${piecesIncompletes.length} pièce(s) manquante(s). Le Contrôle Financier et le Comptable sont autorisés à procéder.`
      );
    }

    setWorkflowActionState({ dossier, action });
  };

  // Load dossiers from local service
  const refreshDossiers = () => {
    const data = DossierStorageService.getDossiers();
    setDossiers([...data]);
  };

  useEffect(() => {
    refreshDossiers();
    const unsubDossiers = DossierStorageService.subscribe(() => {
      refreshDossiers();
    });

    const unsubAuth = AuthService.subscribe(() => {
      setActiveUser(AuthService.getCurrentUser());
    });

    return () => {
      unsubDossiers();
      unsubAuth();
    };
  }, []);

  const handleExportAll = () => {
    DossierStorageService.exportExcelCsv(dossiers);
    addToast(
      'success',
      'Export Excel généré',
      `${dossiers.length} dossiers exportés selon le format 8 colonnes.`
    );
  };

  const handleDossierCreated = (createdDossier: DossierSecours) => {
    refreshDossiers();
    setSelectedDossier(createdDossier);
    setActiveTab('dossiers');
    addToast(
      'success',
      'Dossier enregistré',
      `Dossier ${createdDossier.numeroDossier} créé avec succès pour ${createdDossier.demandeur.nom} ${createdDossier.demandeur.prenoms}.`
    );
  };

  const handleWorkflowSuccess = () => {
    refreshDossiers();
    if (workflowActionState) {
      const updated = DossierStorageService.getDossierById(workflowActionState.dossier.id);
      if (updated) setSelectedDossier(updated);
      addToast(
        'success',
        'Transition validée',
        `Le dossier ${workflowActionState.dossier.numeroDossier} a franchi l'étape réglementaire avec succès.`
      );
    }
    setWorkflowActionState(null);
  };

  const handleSaveEdit = (updatedDossier: DossierSecours, modificationNote: string) => {
    const saved = DossierStorageService.modifyDossier(updatedDossier, modificationNote);
    refreshDossiers();
    if (selectedDossier && selectedDossier.id === saved.id) {
      setSelectedDossier(saved);
    }
    setEditingDossier(null);
    addToast(
      'success',
      'Dossier mis à jour',
      `Les modifications du dossier ${saved.numeroDossier} ont été enregistrées avec succès.`
    );
  };

  const handleConfirmDelete = (dossierId: string, motif: string) => {
    const target = dossiers.find((d) => d.id === dossierId);
    const num = target?.numeroDossier || dossierId;
    const ok = DossierStorageService.deleteDossier(dossierId, motif);
    if (ok) {
      refreshDossiers();
      if (selectedDossier && selectedDossier.id === dossierId) {
        setSelectedDossier(null);
      }
      setDeletingDossier(null);
      addToast(
        'info',
        'Dossier supprimé',
        `Le dossier ${num} a été définitivement retiré du registre.`
      );
    } else {
      addToast('error', 'Erreur de suppression', 'Impossible de supprimer ce dossier.');
    }
  };

  const handleResetData = () => {
    DossierStorageService.resetToInitialData();
    refreshDossiers();
    setSelectedDossier(null);
    setWorkflowActionState(null);
    addToast('info', 'Registre vidé', 'Tous les dossiers ont été effacés. Le registre est désormais entièrement vide (0 dossier).');
  };

  const handleAuthSuccess = (user: User, message: string) => {
    setActiveUser(user);
    setActiveTab('dashboard');
    addToast('success', 'Authentification réussie', message);
  };

  const handleLogout = () => {
    AuthService.logout();
    setActiveUser(null);
    setAuthModal({ isOpen: false, mode: 'LOGIN' });
    addToast('info', 'Session fermée', 'Vous avez été déconnecté avec succès.');
  };

  // Require authentication on first launch or when not logged in
  if (!activeUser) {
    return (
      <div id="auth-portal-root" className="min-h-screen bg-slate-950 font-sans">
        <AuthModal
          isOpen={true}
          isStandalone={true}
          canClose={false}
          initialMode="LOGIN"
          onClose={() => {}}
          onAuthSuccess={handleAuthSuccess}
        />
        <ToastNotification toasts={toasts} onDismiss={removeToast} />
      </div>
    );
  }

  const activeRole: UserRole = activeUser.role;

  // Pending count for the active role badge
  const pendingCount = dossiers.filter((d) => {
    if (activeRole === 'AGENT') return d.statut === 'RECEPTION_EN_COURS' || d.statut === 'DOSSIER_INCOMPLET' || d.statut === 'RETOUR_CF' || d.statut === 'VALIDE_CF';
    return d.statut !== 'MANDATE';
  }).length;

  return (
    <div id="app-container" className="flex h-screen bg-slate-100 text-slate-900 overflow-hidden font-sans">
      {/* 1. Left Navigation Sidebar (Desktop in-flow, Mobile slide-over) */}
      <Sidebar
        activeTab={activeTab}
        onSelectTab={(tab) => {
          setActiveTab(tab);
          setIsSidebarOpenMobile(false);
        }}
        activeRole={activeRole}
        pendingCount={pendingCount}
        isOpenMobile={isSidebarOpenMobile}
        onCloseMobile={() => setIsSidebarOpenMobile(false)}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
      />

      {/* 2. Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* Top Navbar */}
        <Navbar
          activeRole={activeRole}
          activeUser={activeUser}
          onNewEnquete={() => setActiveTab('enquete')}
          onExportCsv={handleExportAll}
          onExportAll={handleExportAll}
          onToggleMobileSidebar={() => setIsSidebarOpenMobile(true)}
          isSidebarCollapsed={isSidebarCollapsed}
          onToggleCollapseSidebar={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          onOpenAuthModal={(mode) => setAuthModal({ isOpen: true, mode })}
          onNavigateProfile={() => setActiveTab('profile')}
          onLogout={handleLogout}
          onResetData={handleResetData}
        />

        {/* Dynamic Animated Page Body */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.15, ease: 'easeOut' }}
              className="h-full"
            >
              {activeTab === 'dashboard' && (
                <DashboardPage
                  dossiers={dossiers}
                  activeRole={activeRole}
                  onNavigate={handleNavigate}
                  onSelectDossier={(d) => setSelectedDossier(d)}
                  onOpenWorkflowAction={handleOpenWorkflowAction}
                />
              )}

              {activeTab === 'dossiers' && (
                <DossiersPage
                  dossiers={dossiers}
                  activeRole={activeRole}
                  initialStatusFilter={dossierFilterStatus}
                  onSelectDossier={(d) => setSelectedDossier(d)}
                  onOpenWorkflowAction={handleOpenWorkflowAction}
                  onNewEnquete={() => handleNavigate('enquete')}
                  onEditDossier={(d) => setEditingDossier(d)}
                  onDeleteDossier={(d) => setDeletingDossier(d)}
                />
              )}

              {activeTab === 'enquete' && (
                <EnquetePage
                  activeRole={activeRole}
                  onDossierCreated={handleDossierCreated}
                />
              )}

              {activeTab === 'settings' && (
                <SettingsPage
                  activeRole={activeRole}
                  onResetData={handleResetData}
                />
              )}

              {activeTab === 'profile' && (
                <ProfilePage
                  currentUser={activeUser}
                  onProfileUpdated={(upd, msg) => {
                    setActiveUser(upd);
                    addToast('success', 'Profil mis à jour', msg);
                  }}
                  onLogout={handleLogout}
                  onOpenAuthModal={(mode) => setAuthModal({ isOpen: true, mode })}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* 3. Dossier Details Modal */}
      {selectedDossier && (
        <DossierDetailModal
          dossier={selectedDossier}
          activeRole={activeRole}
          onClose={() => setSelectedDossier(null)}
          onOpenWorkflowAction={(action) => {
            handleOpenWorkflowAction(selectedDossier, action);
          }}
          onEdit={activeRole === 'AGENT' ? (d) => setEditingDossier(d) : undefined}
          onDelete={activeRole === 'AGENT' ? (d) => setDeletingDossier(d) : undefined}
        />
      )}

      {/* 4. Dossier Edit Modal */}
      {editingDossier && (
        <DossierEditModal
          isOpen={!!editingDossier}
          dossier={editingDossier}
          activeRole={activeRole}
          onClose={() => setEditingDossier(null)}
          onSave={handleSaveEdit}
        />
      )}

      {/* 5. Dossier Delete Confirmation Modal */}
      {deletingDossier && (
        <DossierDeleteModal
          isOpen={!!deletingDossier}
          dossier={deletingDossier}
          activeRole={activeRole}
          onClose={() => setDeletingDossier(null)}
          onConfirmDelete={handleConfirmDelete}
        />
      )}

      {/* 6. Workflow Transition Modal */}
      {workflowActionState && (
        <WorkflowActionModal
          dossier={workflowActionState.dossier}
          actionType={workflowActionState.action}
          activeRole={activeRole}
          onClose={() => setWorkflowActionState(null)}
          onSuccess={handleWorkflowSuccess}
        />
      )}

      {/* 5. Authentication et Account Creation Modal */}
      <AuthModal
        isOpen={authModal.isOpen}
        initialMode={authModal.mode}
        onClose={() => setAuthModal({ isOpen: false, mode: 'LOGIN' })}
        onAuthSuccess={handleAuthSuccess}
      />

      {/* 6. Dynamic Floating Toast Notifications */}
      <ToastNotification toasts={toasts} onDismiss={removeToast} />
    </div>
  );
}
