import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ShieldCheck,
  Building2,
  Lock,
  Mail,
  User as UserIcon,
  Phone,
  Briefcase,
  KeyRound,
  ArrowRight,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  X,
  Copy,
  Check,
  Sparkles,
} from 'lucide-react';
import { User, UserRole } from '../types';
import { AuthService } from '../services/authService';

export type AuthMode = 'LOGIN' | 'REGISTER' | 'FORGOT_PASSWORD';

interface AuthModalProps {
  isOpen: boolean;
  initialMode?: AuthMode;
  onClose: () => void;
  onAuthSuccess: (user: User, message: string) => void;
  canClose?: boolean;
  isStandalone?: boolean;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  initialMode = 'LOGIN',
  onClose,
  onAuthSuccess,
  canClose = true,
  isStandalone = false,
}) => {
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Login Form
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Register Form
  const [regNom, setRegNom] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [regRole, setRegRole] = useState<UserRole>('AGENT');
  const [regPoste, setRegPoste] = useState('Agent Instructeur des Dossiers');
  const [regDepartement, setRegDepartement] = useState('Direction de la Solde et des Pensions');
  const [regMatricule, setRegMatricule] = useState('');
  const [regPhone, setRegPhone] = useState('');

  // Forgot Password Flow
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotStep, setForgotStep] = useState<1 | 2 | 3>(1);
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);
  const [inputCode, setInputCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [copiedCode, setCopiedCode] = useState(false);

  // Synchronize initial mode when modal opens
  React.useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
      setErrorMessage(null);
      setSuccessMessage(null);
      setForgotStep(1);
      setGeneratedCode(null);
    }
  }, [isOpen, initialMode]);

  if (!isOpen) return null;

  // --- Quick 1-Click Demo Login ---
  const handleQuickDemoLogin = (email: string, pass: string) => {
    setErrorMessage(null);
    const result = AuthService.login(email, pass);
    if (result.success && result.user) {
      onAuthSuccess(result.user, `Connecté avec succès en tant que ${result.user.nomComplet} (${result.user.role})`);
      onClose();
    } else {
      setErrorMessage(result.error || 'Erreur lors de la connexion.');
    }
  };

  // --- Standard Login ---
  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!loginEmail.trim() || !loginPassword) {
      setErrorMessage('Veuillez renseigner votre e-mail et votre mot de passe.');
      return;
    }

    const res = AuthService.login(loginEmail, loginPassword);
    if (res.success && res.user) {
      onAuthSuccess(res.user, `Bienvenue, ${res.user.nomComplet} !`);
      onClose();
    } else {
      setErrorMessage(res.error || 'Échec de la connexion.');
    }
  };

  // --- Registration ---
  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!regNom.trim() || !regEmail.trim() || !regPassword) {
      setErrorMessage('Veuillez remplir tous les champs obligatoires.');
      return;
    }

    if (regPassword !== regConfirmPassword) {
      setErrorMessage('La confirmation du mot de passe ne correspond pas.');
      return;
    }

    const res = AuthService.register({
      nomComplet: regNom,
      email: regEmail,
      password: regPassword,
      role: regRole,
      poste: regPoste,
      departement: regDepartement,
      matricule: regMatricule,
      telephone: regPhone,
    });

    if (res.success && res.user) {
      onAuthSuccess(
        res.user,
        `Compte agent créé avec succès pour ${res.user.nomComplet} (${res.user.role}).`
      );
      onClose();
    } else {
      setErrorMessage(res.error || "Impossible d'enregistrer le compte.");
    }
  };

  // --- Forgot Password: Step 1 Request Code ---
  const handleForgotRequestCode = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!forgotEmail.trim()) {
      setErrorMessage('Veuillez renseigner votre adresse e-mail.');
      return;
    }

    const res = AuthService.requestPasswordReset(forgotEmail);
    if (res.success && res.resetCode) {
      setGeneratedCode(res.resetCode);
      setInputCode(res.resetCode); // Convenience auto-fill for frictionless preview
      setForgotStep(2);
    } else {
      setErrorMessage(res.error || 'Adresse e-mail introuvable.');
    }
  };

  // --- Forgot Password: Step 2 Reset Password ---
  const handleForgotConfirmReset = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!inputCode.trim()) {
      setErrorMessage('Veuillez saisir le code de vérification.');
      return;
    }

    if (!newPassword || newPassword.length < 6) {
      setErrorMessage('Le nouveau mot de passe doit comporter au moins 6 caractères.');
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setErrorMessage('La confirmation du mot de passe ne correspond pas.');
      return;
    }

    const res = AuthService.confirmPasswordReset(forgotEmail, inputCode, newPassword);
    if (res.success) {
      setForgotStep(3);
      setSuccessMessage('Votre mot de passe a été réinitialisé avec succès.');
    } else {
      setErrorMessage(res.error || 'Code invalide ou expiré.');
    }
  };

  const copyResetCode = () => {
    if (generatedCode) {
      navigator.clipboard.writeText(generatedCode);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  const modalBody = (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: 10 }}
      className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-4"
    >
      {/* Header with Ministry branding */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 px-6 py-5 text-white relative">
        {canClose && (
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
            aria-label="Fermer"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600/30 border border-blue-400/30 flex items-center justify-center text-blue-300 shadow-md">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold tracking-tight text-white">
                Portail Authentification des Pensions
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-400/30">
                Sécurisé
              </span>
            </div>
            <p className="text-xs text-slate-300 flex items-center gap-1 mt-0.5">
              <Building2 className="w-3.5 h-3.5 text-blue-400" />
              Direction des Pensions et du Contrôle Financier
            </p>
          </div>
        </div>

          {/* Navigation Modes Switcher */}
          <div className="flex items-center gap-2 mt-4 pt-3 border-t border-white/10 text-xs">
            <button
              type="button"
              onClick={() => {
                setMode('LOGIN');
                setErrorMessage(null);
              }}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                mode === 'LOGIN'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-white/10'
              }`}
            >
              Connexion
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('REGISTER');
                setErrorMessage(null);
              }}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                mode === 'REGISTER'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-white/10'
              }`}
            >
              Créer un Compte
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('FORGOT_PASSWORD');
                setErrorMessage(null);
                setForgotStep(1);
              }}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                mode === 'FORGOT_PASSWORD'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-white/10'
              }`}
            >
              Mot de passe oublié
            </button>
          </div>
        </div>

        {/* Body Content */}
        <div className="p-6">
          {/* Error Alert */}
          {errorMessage && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2"
            >
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
              <span>{errorMessage}</span>
            </motion.div>
          )}

          {/* Success Alert */}
          {successMessage && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start gap-2"
            >
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
              <span>{successMessage}</span>
            </motion.div>
          )}

          {/* MODE 1: LOGIN */}
          {mode === 'LOGIN' && (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Adresse e-mail institutionnelle
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    placeholder="agent@tresor.mg"
                    className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-hidden transition-all"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-700">
                    Mot de passe
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setMode('FORGOT_PASSWORD');
                      setForgotEmail(loginEmail);
                    }}
                    className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                  >
                    Mot de passe oublié ?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-10 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-hidden transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-xl shadow-md shadow-blue-500/20 transition-all flex items-center justify-center gap-2 mt-2"
              >
                <span>Se connecter</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              {/* Quick Persona Access for Testing */}
              <div className="pt-4 border-t border-slate-100">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-amber-500" />
                    Connexion rapide démo (1-clic)
                  </span>
                  <span className="text-[10px] text-slate-400">Mot de passe : password123</span>
                </div>
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() => handleQuickDemoLogin('agent@tresor.mg', 'password123')}
                    className="w-full p-2 text-left rounded-lg border border-blue-200 bg-blue-50/60 hover:bg-blue-100/80 transition-colors"
                  >
                    <div className="text-[11px] font-bold text-blue-900">Rabe Andrianaivo (Agent Instructeur et Mandatement)</div>
                    <div className="text-[10px] text-blue-700 font-semibold">Connexion rapide Agent</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickDemoLogin('admin@tresor.mg', 'password123')}
                    className="w-full p-2 text-left rounded-lg border border-indigo-200 bg-indigo-50/60 hover:bg-indigo-100/80 transition-colors"
                  >
                    <div className="text-[11px] font-bold text-indigo-900">Randria Directeur (Administrateur / Suivi du circuit)</div>
                    <div className="text-[10px] text-indigo-700 font-semibold">Connexion rapide Admin</div>
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* MODE 2: REGISTER */}
          {mode === 'REGISTER' && (
            <form onSubmit={handleRegisterSubmit} className="space-y-3.5 max-h-[60vh] overflow-y-auto pr-1">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nom et Prénoms de l'agent *
                </label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={regNom}
                    onChange={(e) => setRegNom(e.target.value)}
                    placeholder="Ex: Razafimahatratra Alain"
                    className="w-full pl-9 pr-3 py-1.5 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-hidden transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    E-mail professionnel *
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      required
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      placeholder="alain@tresor.mg"
                      className="w-full pl-9 pr-3 py-1.5 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-hidden transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Rôle et Habilitation *
                  </label>
                  <select
                    value={regRole}
                    onChange={(e) => {
                      const newRole = e.target.value as UserRole;
                      setRegRole(newRole);
                      if (newRole === 'AGENT') setRegPoste('Agent Chargé d’Étude et Mandatement');
                      else if (newRole === 'ADMIN') setRegPoste('Administrateur / Suivi du circuit');
                    }}
                    className="w-full px-3 py-1.5 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-hidden transition-all font-medium"
                  >
                    <option value="AGENT">Compte Agent (Saisie et Études)</option>
                    <option value="ADMIN">Compte Administrateur (Suivi du circuit)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Poste / Fonction
                  </label>
                  <div className="relative">
                    <Briefcase className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={regPoste}
                      onChange={(e) => setRegPoste(e.target.value)}
                      className="w-full pl-9 pr-3 py-1.5 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-hidden transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Indice Matricule (IM)
                  </label>
                  <input
                    type="text"
                    value={regMatricule}
                    onChange={(e) => setRegMatricule(e.target.value)}
                    placeholder="IM-123456"
                    className="w-full px-3 py-1.5 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-hidden transition-all font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Direction / Service
                  </label>
                  <input
                    type="text"
                    value={regDepartement}
                    onChange={(e) => setRegDepartement(e.target.value)}
                    placeholder="Direction de la Solde et des Pensions"
                    className="w-full px-3 py-1.5 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-hidden transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Téléphone professionnel
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="tel"
                      value={regPhone}
                      onChange={(e) => setRegPhone(e.target.value)}
                      placeholder="+261 34 00 000 00"
                      className="w-full pl-9 pr-3 py-1.5 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-hidden transition-all"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-slate-100">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Mot de passe * (min. 6 car.)
                  </label>
                  <input
                    type="password"
                    required
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-3 py-1.5 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-hidden transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Confirmer mot de passe *
                  </label>
                  <input
                    type="password"
                    required
                    value={regConfirmPassword}
                    onChange={(e) => setRegConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-3 py-1.5 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-hidden transition-all"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm rounded-xl shadow-md shadow-emerald-500/20 transition-all flex items-center justify-center gap-2 mt-3"
              >
                <span>Créer et activer le compte</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          )}

          {/* MODE 3: FORGOT PASSWORD */}
          {mode === 'FORGOT_PASSWORD' && (
            <div className="space-y-4">
              {forgotStep === 1 && (
                <form onSubmit={handleForgotRequestCode} className="space-y-4">
                  <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl text-xs text-blue-900">
                    <p className="font-semibold">Procédure de récupération sécurisée</p>
                    <p className="mt-0.5 text-blue-700">
                      Indiquez votre adresse e-mail institutionnelle pour recevoir un code de vérification à 6 chiffres.
                    </p>
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
                        value={forgotEmail}
                        onChange={(e) => setForgotEmail(e.target.value)}
                        placeholder="agent@tresor.mg"
                        className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-hidden transition-all"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-xl shadow-md shadow-blue-500/20 transition-all flex items-center justify-center gap-2"
                  >
                    <span>Envoyer le code de vérification</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </form>
              )}

              {forgotStep === 2 && (
                <form onSubmit={handleForgotConfirmReset} className="space-y-4">
                  {/* Simulated Code Banner */}
                  {generatedCode && (
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between">
                      <div>
                        <div className="text-[11px] font-bold text-amber-900 uppercase">
                          Code de vérification généré :
                        </div>
                        <div className="text-lg font-mono font-bold tracking-widest text-amber-800 mt-0.5">
                          {generatedCode}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={copyResetCode}
                        className="px-2.5 py-1.5 text-xs font-semibold text-amber-900 bg-white border border-amber-300 rounded-lg hover:bg-amber-100 flex items-center gap-1 transition-colors"
                      >
                        {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedCode ? 'Copié' : 'Copier'}</span>
                      </button>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Code à 6 chiffres
                    </label>
                    <div className="relative">
                      <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        maxLength={6}
                        required
                        value={inputCode}
                        onChange={(e) => setInputCode(e.target.value)}
                        placeholder="Ex: 849201"
                        className="w-full pl-9 pr-3 py-2 text-base font-mono tracking-wider bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-hidden transition-all"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Nouveau mot de passe
                      </label>
                      <input
                        type="password"
                        required
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-hidden transition-all"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Confirmer
                      </label>
                      <input
                        type="password"
                        required
                        value={confirmNewPassword}
                        onChange={(e) => setConfirmNewPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-hidden transition-all"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm rounded-xl shadow-md shadow-emerald-500/20 transition-all flex items-center justify-center gap-2"
                  >
                    <span>Valider et modifier mon mot de passe</span>
                    <CheckCircle2 className="w-4 h-4" />
                  </button>
                </form>
              )}

              {forgotStep === 3 && (
                <div className="text-center py-4 space-y-4">
                  <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-slate-900">Mot de passe réinitialisé !</h4>
                    <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                      Votre mot de passe a été mis à jour avec succès. Vous pouvez désormais vous connecter immédiatement.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setMode('LOGIN');
                      setLoginEmail(forgotEmail);
                      setLoginPassword(newPassword);
                      setSuccessMessage(null);
                    }}
                    className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-xl shadow-md transition-all inline-flex items-center gap-2"
                  >
                    <span>Passer à la connexion</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </motion.div>
  );

  if (isStandalone) {
    return (
      <div
        id="auth-standalone-screen"
        className="min-h-screen bg-slate-950 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(30,58,138,0.35),rgba(255,255,255,0))] flex flex-col justify-between p-4 sm:p-6 lg:p-8"
      >
        {/* Official State Banner Header */}
        <header className="w-full max-w-4xl mx-auto text-center pt-2 pb-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-400/20 text-blue-300 text-xs font-semibold mb-2">
            <ShieldCheck className="w-4 h-4 text-blue-400" />
            <span>Portail Officiel d'Accès Réglementaire</span>
          </div>

          <div className="text-[11px] font-bold tracking-widest uppercase text-slate-400">
            Repoblikan'i Madagasikara
          </div>
          <div className="text-[10px] text-slate-500 italic mt-0.5">
            Fitiavana — Tanindrazana — Fandrosoana
          </div>

          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight mt-2">
            Système de Gestion des Secours au Décès
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-xl mx-auto">
            Ministère de l'Économie et des Finances • Direction Générale du Trésor
            <br className="hidden sm:inline" />
            {' '}Direction de la Solde et des Pensions
          </p>
        </header>

        {/* Form Card */}
        <main className="w-full flex items-center justify-center py-2">
          {modalBody}
        </main>

        {/* Security et Regulatory Footer */}
        <footer className="w-full max-w-2xl mx-auto text-center pb-2 text-[11px] text-slate-500 space-y-1">
          <p className="text-slate-400">
            Accès strictement réservé aux agents publics habilités (Agents Instructeurs, Contrôleurs Financiers, Comptables du Trésor, Directeurs).
          </p>
          <p className="text-[10px] text-slate-600">
            Toute tentative d'accès non autorisée est enregistrée et passible des sanctions prévues par la réglementation en vigueur.
          </p>
        </footer>
      </div>
    );
  }

  return (
    <div
      id="auth-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm overflow-y-auto"
      onClick={(e) => {
        if (canClose && e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      {modalBody}
    </div>
  );
};
