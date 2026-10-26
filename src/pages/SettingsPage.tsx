import React, { useState } from 'react';
import {
  Settings,
  Shield,
  Key,
  Terminal,
  Server,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Code2,
  Copy,
  Check,
  Users,
  Trash2,
  Banknote,
  Coins,
} from 'lucide-react';
import { UserRole } from '../types';
import { DossierStorageService } from '../services/dossierStorage';
import { AuthService } from '../services/authService';

interface SettingsPageProps {
  activeRole: UserRole;
  onResetData: () => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({
  activeRole,
  onResetData,
}) => {
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [resetSuccess, setResetSuccess] = useState(false);

  const roles = [
    {
      id: 'AGENT' as UserRole,
      title: 'Compte Agent (Instruction, CF et Mandatement)',
      color: 'blue',
      desc: 'Réceptionne et instruit le dossier, saisit les informations sans calcul, envoie au CF, engage et mandate le secours.',
      permissions: [
        'Création et ajout manuel des dossiers (sans calcul)',
        'Envoi, renvoi et notification du visa CF',
        'Engagement comptable et mandatement avec saisie manuelle',
        'Consultation et export Excel normalisé 8 colonnes',
      ],
    },
  ];

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(id);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleReset = () => {
    onResetData();
    setResetSuccess(true);
    setTimeout(() => setResetSuccess(false), 3000);
  };

  const backendCodeSnippet = `# 1. Cloner et se placer dans le dossier backend
cd backend

# 2. Créer un environnement virtuel Python
python -m venv venv
source venv/bin/activate  # Sur Windows: venv\\Scripts\\activate

# 3. Installer les dépendances
pip install -r requirements.txt

# 4. Lancer le serveur d'API FastAPI
uvicorn main:app --reload --port 8000

# Documentation Swagger interactive disponible sur :
# http://localhost:8000/docs`;

  const frontendCodeSnippet = `# 1. Installer les dépendances Node.js
npm install

# 2. Lancer le serveur de développement Vite
npm run dev

# L'application est disponible sur :
# http://localhost:3000`;

  return (
    <div id="settings-page" className="max-w-5xl mx-auto space-y-6 animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-md">
            <Settings className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 tracking-tight">
              Paramètres du Système et Gestion des Rôles (RBAC)
            </h2>
            <p className="text-xs text-slate-500">
              Basculez entre les différents profils institutionnels pour tester les restrictions de workflow et les autorisations.
            </p>
          </div>
        </div>
      </div>

      {/* Role Switcher Grid */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Shield className="w-4 h-4 text-blue-600" />
            <span>Rôles et Habilitations Institutionnelles</span>
          </h3>
          <span className="text-xs text-slate-500">
            Profil actuellement actif : <strong className="text-blue-600 font-bold">{activeRole}</strong>
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {roles.map((r) => {
            const isSelected = activeRole === r.id;
            return (
              <div
                key={r.id}
                className={`p-5 rounded-2xl border transition-all shadow-2xs ${
                  isSelected
                    ? 'bg-blue-50/50 border-blue-500 ring-2 ring-blue-500/20'
                    : 'bg-white border-slate-200'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-3 h-3 rounded-full ${
                        isSelected ? 'bg-blue-600 ring-4 ring-blue-100' : 'bg-slate-300'
                      }`}
                    />
                    <h4 className="text-sm font-bold text-slate-900">{r.title}</h4>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-bold">
                    {r.id}
                  </span>
                </div>

                <p className="text-xs text-slate-600 mt-2 leading-relaxed">{r.desc}</p>

                <div className="mt-3 pt-3 border-t border-slate-100 space-y-1">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                    Droits et Permissions :
                  </span>
                  <ul className="text-[11px] text-slate-600 space-y-0.5">
                    {r.permissions.map((perm, idx) => (
                      <li key={idx} className="flex items-center gap-1.5">
                        <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" />
                        <span>{perm}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Paramètres Financiers et Règles de Mandatement */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-200 text-sm font-bold text-slate-900">
          <Banknote className="w-4 h-4 text-purple-600" />
          <span>Paramètres Budgétaires et Règle du Mandatement (Comptabilité)</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-purple-50/50 rounded-xl border border-purple-100 space-y-1">
            <span className="text-[11px] font-bold text-purple-900 uppercase tracking-wider block">
              Montant Standard de Référence
            </span>
            <div className="text-xl font-black text-purple-950 font-mono">
              500 000 Ar
            </div>
            <p className="text-[11px] text-purple-700">
              Valeur de départ par défaut. Le Comptable Payeur fixe ou ajuste le prix effectif lors du mandatement.
            </p>
          </div>

          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
            <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
              Exercice Budgétaire Ouvert
            </span>
            <div className="text-xl font-black text-slate-900 font-mono">
              {new Date().getFullYear()}
            </div>
            <p className="text-[11px] text-slate-500">
              Exercice fiscal annuel pour la liquidation et le mandatement des secours au décès.
            </p>
          </div>

          <div className="p-4 bg-emerald-50/50 rounded-xl border border-emerald-100 space-y-1">
            <span className="text-[11px] font-bold text-emerald-900 uppercase tracking-wider block">
              Séparation Strict des Pouvoirs
            </span>
            <div className="text-sm font-bold text-emerald-950 flex items-center gap-1.5 pt-1">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>CF (Visa) ➔ Comptable (Prix/Mandat)</span>
            </div>
            <p className="text-[11px] text-emerald-700">
              Le mandatement et la fixation du prix sont bloqués sans visa préalable favorable du Contrôle Financier.
            </p>
          </div>
        </div>
      </div>

      {/* Guide d'Exécution Locale Fullstack Python / React */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-200 text-sm font-bold text-slate-900">
          <Terminal className="w-4 h-4 text-blue-600" />
          <span>Guide d'Exécution Locale (Architecture Entreprise Python FastAPI + React)</span>
        </div>

        <p className="text-xs text-slate-600 leading-relaxed">
          Le projet comporte une architecture fullstack complète avec un backend robuste en Python (FastAPI, SQLAlchemy, Pydantic, Moteur de règles déterministe) et une interface moderne en React (TypeScript, Tailwind CSS).
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          {/* Backend FastAPI Instructions */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <Server className="w-3.5 h-3.5 text-emerald-600" />
                <span>1. Backend Python FastAPI (Port 8000)</span>
              </span>
              <button
                onClick={() => copyToClipboard(backendCodeSnippet, 'backend')}
                className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1"
              >
                {copiedCode === 'backend' ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-emerald-600 font-semibold">Copié</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copier</span>
                  </>
                )}
              </button>
            </div>
            <pre className="p-3 bg-slate-900 text-slate-100 rounded-xl text-[11px] font-mono overflow-x-auto leading-relaxed">
              {backendCodeSnippet}
            </pre>
          </div>

          {/* Frontend Vite Instructions */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <Code2 className="w-3.5 h-3.5 text-blue-600" />
                <span>2. Frontend React Vite (Port 3000)</span>
              </span>
              <button
                onClick={() => copyToClipboard(frontendCodeSnippet, 'frontend')}
                className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1"
              >
                {copiedCode === 'frontend' ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-emerald-600 font-semibold">Copié</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copier</span>
                  </>
                )}
              </button>
            </div>
            <pre className="p-3 bg-slate-900 text-slate-100 rounded-xl text-[11px] font-mono overflow-x-auto leading-relaxed">
              {frontendCodeSnippet}
            </pre>
          </div>
        </div>

        {/* MongoDB Integration Guide */}
        <div className="mt-6 pt-5 border-t border-slate-200 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
              <Server className="w-3.5 h-3.5 text-emerald-600" />
              <span>3. Guide de Connexion Base de Données MongoDB (Mongoose / Atlas)</span>
            </span>
            <button
              onClick={() => copyToClipboard(`# 1. Installer Mongoose\nnpm install mongoose\n\n# 2. Configuration .env\nMONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/srsp_db?retryWrites=true&w=majority\n\n# 3. Connexion\nimport mongoose from 'mongoose';\nawait mongoose.connect(process.env.MONGODB_URI);`, 'mongodb')}
              className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1"
            >
              {copiedCode === 'mongodb' ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-emerald-600 font-semibold">Copié</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copier</span>
                </>
              )}
            </button>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            Pour basculer le stockage des dossiers et des journaux d'audit sur MongoDB (MongoDB Atlas ou instance locale), configurez l'URI de connexion dans votre service backend :
          </p>
          <pre className="p-3 bg-slate-900 text-slate-100 rounded-xl text-[11px] font-mono overflow-x-auto leading-relaxed">
{`# 1. Installer Mongoose
npm install mongoose

# 2. Configuration .env
MONGODB_URI=mongodb+srv://utilisateur:motdepasse@cluster.mongodb.net/srsp_pensions?retryWrites=true&w=majority

# 3. Connexion Mongoose dans le serveur Node.js / Express
import mongoose from 'mongoose';

export async function connectMongoDB() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/srsp_pensions');
    console.log('✅ Connecté avec succès à MongoDB Atlas / Local !');
  } catch (error) {
    console.error('❌ Erreur de connexion MongoDB :', error);
    process.exit(1);
  }
}`}
          </pre>
        </div>
      </div>

      {/* Reset Data Section */}
      <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h4 className="text-xs font-bold text-slate-900">Effacer tous les dossiers (Zéro données)</h4>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Supprime l'intégralité des dossiers et des journaux pour repartir sur un registre entièrement vide.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {resetSuccess && (
            <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
              <CheckCircle2 className="w-4 h-4" />
              <span>Registre vidé (0 dossier) !</span>
            </span>
          )}
          <button
            onClick={handleReset}
            className="px-4 py-2 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-xl border border-rose-200 flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Effacer tous les dossiers</span>
          </button>
        </div>
      </div>
    </div>
  );
};
