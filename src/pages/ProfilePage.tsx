import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  User as UserIcon,
  Shield,
  Key,
  Mail,
  Phone,
  Building2,
  Briefcase,
  CheckCircle2,
  AlertCircle,
  Clock,
  LogOut,
  Save,
  Lock,
  Calendar,
  History,
  ShieldCheck,
  Sparkles,
  Users,
  Trash2,
} from 'lucide-react';
import { User, UserRole, AuditLogEntry } from '../types';
import { AuthService } from '../services/authService';
import { DossierStorageService } from '../services/dossierStorage';

interface ProfilePageProps {
  currentUser: User;
  onProfileUpdated: (updatedUser: User, message: string) => void;
  onLogout: () => void;
  onOpenAuthModal: (mode: 'LOGIN' | 'REGISTER') => void;
}

export const ProfilePage: React.FC<ProfilePageProps> = ({
  currentUser,
  onProfileUpdated,
  onLogout,
  onOpenAuthModal,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'INFO' | 'SECURITY' | 'PERMISSIONS' | 'LOGS' | 'ACCOUNTS'>('INFO');
  const [systemUsers, setSystemUsers] = useState<User[]>(() => AuthService.getUsers());

  // Form states - Info
  const [nomComplet, setNomComplet] = useState(currentUser.nomComplet);
  const [email, setEmail] = useState(currentUser.email);
  const [poste, setPoste] = useState(currentUser.poste);
  const [departement, setDepartement] = useState(currentUser.departement || 'Direction des Pensions et de la Solde');
  const [matricule, setMatricule] = useState(currentUser.matricule || 'IM-458921');
  const [telephone, setTelephone] = useState(currentUser.telephone || '+261 34 00 000 00');

  // Form states - Security
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Status banners
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);

  // User audit logs
  const userLogs = DossierStorageService.getAuditLogs().filter(
    (l) => l.userEmail.toLowerCase() === currentUser.email.toLowerCase() || l.userRole === currentUser.role
  );

  const handleUpdateInfo = (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMessage(null);

    const res = AuthService.updateProfile(currentUser.id, {
      nomComplet,
      email,
      poste,
      departement,
      matricule,
      telephone,
    });

    if (res.success && res.user) {
      setStatusMessage({ type: 'success', text: 'Vos informations de profil ont été mises à jour avec succès.' });
      onProfileUpdated(res.user, 'Profil mis à jour');
    } else {
      setStatusMessage({ type: 'error', text: res.error || 'Erreur lors de la mise à jour.' });
    }
  };

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMessage(null);

    if (newPassword !== confirmPassword) {
      setStatusMessage({ type: 'error', text: 'Le nouveau mot de passe et sa confirmation ne correspondent pas.' });
      return;
    }

    const res = AuthService.changePassword(currentUser.id, currentPassword, newPassword);
    if (res.success) {
      setStatusMessage({ type: 'success', text: 'Votre mot de passe a été modifié avec succès.' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      onProfileUpdated(currentUser, 'Mot de passe modifié avec succès');
    } else {
      setStatusMessage({ type: 'error', text: res.error || 'Erreur lors du changement de mot de passe.' });
    }
  };

  const roleDetails: Record<UserRole, { title: string; color: string; badgeColor: string; description: string; rights: string[] }> = {
    AGENT: {
      title: 'Agent Chargé d’Étude (Service des Pensions)',
      color: 'border-blue-300 bg-blue-50/70 text-blue-900',
      badgeColor: 'bg-blue-600 text-white',
      description: 'Réception des dossiers d’ayants droit, vérification réglementaire des pièces justificatives et instruction des études.',
      rights: [
        'Enregistrement de nouvelles demandes de secours aux décès',
        'Vérification et pointage des pièces justificatives obligatoires',
        'Contrôle automatique du moteur de règles déterministe',
        'Instruction complète des études de fond et de forme',
      ],
    },

    ADMIN: {
      title: 'Administrateur / Suivi du Circuit',
      color: 'border-indigo-300 bg-indigo-50/70 text-indigo-900',
      badgeColor: 'bg-indigo-600 text-white',
      description: 'Supervision générale du circuit, suivi en temps réel des dossiers, audit inaltérable et gestion des comptes.',
      rights: [
        'Supervision et consultation de tous les dossiers en temps réel (suivi du circuit)',
        'Consultation du journal d’audit inaltérable avec horodatages',
        'Exportation complète des registres au format Excel conforme',
        'Aucune création, modification ou suppression de dossier (séparation stricte des rôles)',
      ],
    },
  };

  const currentRoleInfo = roleDetails[currentUser.role] || roleDetails.AGENT;

  return (
    <div id="profile-page-container" className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Top Profile Banner */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Header Background Banner */}
        <div className="bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-950 px-6 py-6 text-white">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-white/80 text-xs font-medium">
              <Building2 className="w-4 h-4 text-blue-400 shrink-0" />
              <span>République de Madagascar — Ministère des Finances et du Budget</span>
            </div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <button
                type="button"
                onClick={() => onOpenAuthModal('REGISTER')}
                className="px-3.5 py-2 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/20 text-white border border-white/20 transition-all flex items-center gap-1.5 shadow-sm"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Nouveau compte agent</span>
              </button>
              <button
                type="button"
                onClick={onLogout}
                className="px-3.5 py-2 rounded-xl text-xs font-bold bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 border border-rose-400/30 transition-all flex items-center gap-1.5 shadow-sm"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Déconnexion</span>
              </button>
            </div>
          </div>
        </div>

        {/* Profile Info Bar */}
        <div className="px-6 py-6 flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
            {/* Avatar with Initials */}
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white font-bold text-2xl flex items-center justify-center shadow-lg ring-4 ring-slate-100 border border-blue-400/30 shrink-0">
              {currentUser.nomComplet
                .split(' ')
                .map((n) => n[0])
                .slice(0, 2)
                .join('')
                .toUpperCase() || 'AG'}
            </div>

            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
                  {currentUser.nomComplet}
                </h1>
                <span className={`px-3 py-1 rounded-full text-xs font-bold tracking-wide ${currentRoleInfo.badgeColor} shadow-2xs`}>
                  {currentUser.role}
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-600 flex items-center gap-2 mt-1.5 font-medium">
                <span>{currentUser.poste}</span>
                <span>•</span>
                <span className="font-mono text-slate-700 font-semibold">{currentUser.matricule || 'IM-458921'}</span>
              </p>
            </div>
          </div>

          <div className="text-xs text-slate-600 space-y-1.5 bg-slate-50 px-4 py-3 rounded-2xl border border-slate-200 shadow-2xs shrink-0">
            <div className="flex items-center justify-between gap-6">
              <span className="text-slate-500 font-medium">Statut Session :</span>
              <span className="font-bold text-emerald-600 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Connecté (Actif)
              </span>
            </div>
            <div className="flex items-center justify-between gap-6">
              <span className="text-slate-500 font-medium">Dernière activité :</span>
              <span className="font-bold text-slate-800">
                {currentUser.lastLogin
                  ? new Date(currentUser.lastLogin).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
                  : 'Aujourd’hui'}
              </span>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="px-6 border-t border-slate-200/80 flex items-center gap-2 overflow-x-auto text-xs font-semibold">
          <button
            type="button"
            onClick={() => {
              setActiveSubTab('INFO');
              setStatusMessage(null);
            }}
            className={`py-3 px-3 border-b-2 transition-all flex items-center gap-2 ${
              activeSubTab === 'INFO'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <UserIcon className="w-4 h-4" />
            <span>Informations Personnelles</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveSubTab('SECURITY');
              setStatusMessage(null);
            }}
            className={`py-3 px-3 border-b-2 transition-all flex items-center gap-2 ${
              activeSubTab === 'SECURITY'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Key className="w-4 h-4" />
            <span>Sécurité et Mot de Passe</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveSubTab('PERMISSIONS');
              setStatusMessage(null);
            }}
            className={`py-3 px-3 border-b-2 transition-all flex items-center gap-2 ${
              activeSubTab === 'PERMISSIONS'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Habilitations et Rôle</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveSubTab('LOGS');
              setStatusMessage(null);
            }}
            className={`py-3 px-3 border-b-2 transition-all flex items-center gap-2 ${
              activeSubTab === 'LOGS'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <History className="w-4 h-4" />
            <span>Journal d’Activité ({userLogs.length})</span>
          </button>

          {currentUser.role === 'ADMIN' && (
            <button
              type="button"
              onClick={() => {
                setActiveSubTab('ACCOUNTS');
                setStatusMessage(null);
                setSystemUsers(AuthService.getUsers());
              }}
              className={`py-3 px-3 border-b-2 transition-all flex items-center gap-2 ${
                activeSubTab === 'ACCOUNTS'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Users className="w-4 h-4 text-purple-600" />
              <span>Gestion Comptes et Base Partagée</span>
            </button>
          )}
        </div>
      </div>

      {/* Global Status Message */}
      {statusMessage && (
        <motion.div
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className={`p-4 rounded-xl border text-xs flex items-start gap-2.5 ${
            statusMessage.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-rose-50 border-rose-200 text-rose-900'
          }`}
        >
          {statusMessage.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          )}
          <span>{statusMessage.text}</span>
        </motion.div>
      )}

      {/* TAB 1: INFORMATIONS */}
      {activeSubTab === 'INFO' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <div className="mb-5">
            <h3 className="text-base font-bold text-slate-900">Coordonnées et Affectation de l'Agent</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Ces informations figurent sur les procès-verbaux de contrôle et les bordereaux de transmission au Contrôle Financier.
            </p>
          </div>

          <form onSubmit={handleUpdateInfo} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Nom et Prénoms
                </label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={nomComplet}
                    onChange={(e) => setNomComplet(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 outline-hidden transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Adresse e-mail institutionnelle
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 outline-hidden transition-all"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Poste / Titre administratif
                </label>
                <div className="relative">
                  <Briefcase className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={poste}
                    onChange={(e) => setPoste(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 outline-hidden transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Direction / Service d'affectation
                </label>
                <div className="relative">
                  <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={departement}
                    onChange={(e) => setDepartement(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 outline-hidden transition-all"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Numéro d'Indice Matricule (IM)
                </label>
                <input
                  type="text"
                  value={matricule}
                  onChange={(e) => setMatricule(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 outline-hidden transition-all font-mono font-bold text-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Téléphone professionnel
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="tel"
                    value={telephone}
                    onChange={(e) => setTelephone(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 outline-hidden transition-all"
                  />
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-200 flex justify-end">
              <button
                type="submit"
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-md shadow-blue-500/20 transition-all flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                <span>Enregistrer les modifications</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 2: SECURITY ET PASSWORD */}
      {activeSubTab === 'SECURITY' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <div className="mb-5">
            <h3 className="text-base font-bold text-slate-900">Modification du Mot de Passe</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Assurez la protection de vos identifiants d'accès au système des secours aux décès.
            </p>
          </div>

          <form onSubmit={handleChangePassword} className="space-y-4 max-w-md">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Mot de passe actuel *
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 outline-hidden transition-all"
                />
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Mot de passe par défaut des comptes démo : <code className="text-blue-600 font-mono">password123</code>
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Nouveau mot de passe * (min. 6 caractères)
              </label>
              <div className="relative">
                <Key className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 outline-hidden transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Confirmer le nouveau mot de passe *
              </label>
              <div className="relative">
                <Key className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 outline-hidden transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow-md shadow-emerald-500/20 transition-all flex items-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Mettre à jour mon mot de passe</span>
            </button>
          </form>
        </div>
      )}

      {/* TAB 3: HABILITATIONS ET PERMISSIONS */}
      {activeSubTab === 'PERMISSIONS' && (
        <div className="space-y-4">
          <div className={`rounded-2xl border p-5 ${currentRoleInfo.color}`}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold ${currentRoleInfo.badgeColor} mb-2`}>
                  RÔLE ACTIF : {currentUser.role}
                </span>
                <h3 className="text-base font-bold">{currentRoleInfo.title}</h3>
                <p className="text-xs mt-1 leading-relaxed opacity-90">{currentRoleInfo.description}</p>
              </div>
              <Shield className="w-8 h-8 shrink-0 opacity-80" />
            </div>

            <div className="mt-4 pt-4 border-t border-current/20">
              <h4 className="text-xs font-bold uppercase tracking-wider mb-2">
                Actions réglementaires autorisées :
              </h4>
              <ul className="space-y-1.5 text-xs">
                {currentRoleInfo.rights.map((right, idx) => (
                  <li key={idx} className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-current" />
                    <span>{right}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">
              Autres Rôles Disponibles dans le Système
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {(['AGENT', 'ADMIN'] as UserRole[])
                .filter((r) => r !== currentUser.role)
                .map((r) => {
                  const info = roleDetails[r];
                  return (
                    <div key={r} className="p-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-800">
                      <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${info.badgeColor} mb-1`}>
                        {r}
                      </span>
                      <div className="text-xs font-bold text-slate-900">{info.title}</div>
                      <p className="text-[11px] text-slate-500 mt-1 line-clamp-2">{info.description}</p>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: AUDIT LOGS */}
      {activeSubTab === 'LOGS' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900">Historique des Opérations de la Session</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Traçabilité des contrôles de pièces, visas et modifications enregistrés par votre compte.
              </p>
            </div>
            <span className="text-xs font-mono bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200 text-slate-700">
              {userLogs.length} évènement{userLogs.length > 1 ? 's' : ''}
            </span>
          </div>

          {userLogs.length === 0 ? (
            <div className="text-center py-10 text-slate-400 text-xs">
              Aucune opération enregistrée pour le moment.
            </div>
          ) : (
            <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
              {userLogs.slice(0, 10).map((log) => (
                <div key={log.id} className="p-3 hover:bg-slate-50/80 transition-colors flex items-start justify-between gap-3 text-xs">
                  <div className="space-y-0.5 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 font-mono text-[11px] px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200">
                        {log.action}
                      </span>
                      {log.dossierNumero && (
                        <span className="font-semibold text-blue-600 font-mono text-[11px]">
                          {log.dossierNumero}
                        </span>
                      )}
                    </div>
                    <p className="text-slate-600 text-[11px] leading-relaxed">{log.details}</p>
                  </div>
                  <div className="text-right shrink-0 text-[10px] text-slate-400 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    <span>{new Date(log.timestamp).toLocaleTimeString('fr-FR')}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 5: ADMIN ACCOUNTS ET SHARED DATABASE MANAGEMENT */}
      {activeSubTab === 'ACCOUNTS' && currentUser.role === 'ADMIN' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold text-slate-900">Gestion des Comptes et Accès à la Base Partagée</h3>
              <p className="text-xs sm:text-sm text-slate-600 mt-1">
                Cochez ou décochez les comptes pour autoriser ou restreindre l’accès synchronisé à la base de données des dossiers suivis. Les comptes sans accès partagé disposent d’une base isolée/bloquée.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                const updated = AuthService.getUsers();
                setSystemUsers(updated);
                setStatusMessage({ type: 'success', text: 'Comptes actualisés.' });
              }}
              className="px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold rounded-xl text-xs border border-blue-200 transition-all shrink-0"
            >
              Actualiser la Liste
            </button>
          </div>

          <div className="overflow-x-auto border border-slate-200 rounded-2xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-700 uppercase tracking-wider font-bold border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Agent et Rôle</th>
                  <th className="px-4 py-3">E-mail et Matricule</th>
                  <th className="px-4 py-3">Poste / Affectation</th>
                  <th className="px-4 py-3 text-center">Accès Base de Dossiers Partagés</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {systemUsers.map((u) => {
                  const isShared = u.partageDossiers !== false;
                  return (
                    <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-bold text-slate-900">{u.nomComplet}</div>
                        <span className="inline-block px-2 py-0.5 mt-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                          {u.role}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-slate-800">{u.email}</div>
                        <div className="text-slate-500 font-mono text-[11px]">{u.matricule || 'N/A'}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-slate-800">{u.poste}</div>
                        <div className="text-slate-500 text-[11px]">{u.departement}</div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <label className="inline-flex items-center gap-2 cursor-pointer bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-100 transition-colors">
                          <input
                            type="checkbox"
                            checked={isShared}
                            onChange={(e) => {
                              const checked = e.target.checked;
                              const result = AuthService.toggleUserPartageDossiers(currentUser, u.id, checked);
                              if (result.success && result.users) {
                                setSystemUsers(result.users);
                                setStatusMessage({ type: 'success', text: `Accès mis à jour pour ${u.nomComplet}.` });
                              } else {
                                setStatusMessage({ type: 'error', text: result.error || 'Erreur' });
                              }
                            }}
                            className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 cursor-pointer"
                          />
                          <span className={`font-bold ${isShared ? 'text-emerald-700' : 'text-rose-600'}`}>
                            {isShared ? 'Partagé (Actif)' : 'Restreint (Bloqué)'}
                          </span>
                        </label>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-3">
                          <span className="text-[11px] text-slate-500 font-mono hidden sm:inline">
                            Vu : {u.lastLogin ? new Date(u.lastLogin).toLocaleDateString('fr-FR') : 'Jamais'}
                          </span>
                          {u.id !== currentUser.id ? (
                            <button
                              type="button"
                              onClick={() => setUserToDelete(u)}
                              className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 hover:text-rose-700 transition-all border border-transparent hover:border-rose-100 shrink-0"
                              title="Supprimer définitivement ce compte"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          ) : (
                            <span className="text-[10px] bg-slate-100 text-slate-500 px-2.5 py-0.5 rounded-lg border border-slate-200 shrink-0">
                              Moi (Admin)
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Modal de Confirmation de Suppression */}
          {userToDelete && (
            <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full p-6 space-y-5">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-rose-50 flex items-center justify-center shrink-0 border border-rose-100">
                    <AlertCircle className="w-5 h-5 text-rose-600" />
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-slate-900">Supprimer le compte ?</h4>
                    <p className="text-xs text-slate-600 mt-1">
                      Cette action est définitive et irréversible. L’agent n’aura plus aucun accès à l’application de suivi des secours décès.
                    </p>
                  </div>
                </div>

                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-1.5 text-xs text-slate-700">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Nom Complet :</span>
                    <span className="font-bold text-slate-900">{userToDelete.nomComplet}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Adresse E-mail :</span>
                    <span className="font-semibold">{userToDelete.email}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Matricule :</span>
                    <span className="font-mono text-slate-600">{userToDelete.matricule || 'Non renseigné'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Poste / Affectation :</span>
                    <span>{userToDelete.poste}</span>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setUserToDelete(null)}
                    className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 transition-all"
                  >
                    Annuler
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const res = AuthService.deleteUser(currentUser, userToDelete.id);
                      if (res.success && res.users) {
                        setSystemUsers(res.users);
                        setUserToDelete(null);
                        setStatusMessage({
                          type: 'success',
                          text: `Le compte de ${userToDelete.nomComplet} a été supprimé définitivement de la base de données.`,
                        });
                      } else {
                        setStatusMessage({
                          type: 'error',
                          text: res.error || 'Erreur lors de la suppression.',
                        });
                        setUserToDelete(null);
                      }
                    }}
                    className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all flex items-center gap-1.5"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Supprimer Définitivement
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
