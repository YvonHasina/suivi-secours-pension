import React, { useState, useMemo } from 'react';
import {
  FileCheck2,
  User,
  Users,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowRight,
  ArrowLeft,
  Save,
  Plus,
  Trash2,
  Building2,
  FileText,
  ShieldAlert,
  Lock,
} from 'lucide-react';
import {
  StatutActivite,
  TypeAgentActivite,
  LienParente,
  Enfant,
  PieceJustificative,
  DossierSecours,
  StatutPiece,
  UserRole,
} from '../types';
import { genererChecklistRequise } from '../services/checklistEngine';
import { DossierStorageService } from '../services/dossierStorage';
import { FraudDetectionService } from '../services/fraudDetectionService';

interface EnquetePageProps {
  activeRole: UserRole;
  onDossierCreated: (dossier: DossierSecours) => void;
}

export const EnquetePage: React.FC<EnquetePageProps> = ({
  activeRole,
  onDossierCreated,
}) => {
  const [currentStep, setCurrentStep] = useState<number>(1);

  // Étape 1 : Agent défunt
  const [im, setIm] = useState('');
  const [nomDefunt, setNomDefunt] = useState('');
  const [prenomsDefunt, setPrenomsDefunt] = useState('');
  const [statutActivite, setStatutActivite] = useState<StatutActivite>('ACTIVITE');
  const [typeAgentActivite, setTypeAgentActivite] = useState<TypeAgentActivite>('FONCTIONNAIRE');
  const [dateDeces, setDateDeces] = useState('');
  const [lieuDeces, setLieuDeces] = useState('Antananarivo');
  const [ministereInstitution, setMinistereInstitution] = useState(
    "Ministère de l'Économie et des Finances"
  );
  const [dernierGrade, setDernierGrade] = useState('');
  const [numeroPension, setNumeroPension] = useState('');
  const [salaireDeBase, setSalaireDeBase] = useState<number | string>(41667);
  const [montantSecoursSaisi, setMontantSecoursSaisi] = useState<number | string>(500000);

  const baseSalNum = Number(salaireDeBase) || 0;
  const multiplier = statutActivite === 'RETRAITE_PENSIONNE' 
    ? 3 
    : (typeAgentActivite === 'EFA_ELD' ? 3 : 12);
  const computedMontantSecours = baseSalNum * multiplier;

  // Étape 2 : Demandeur
  const [nomDemandeur, setNomDemandeur] = useState('');
  const [prenomsDemandeur, setPrenomsDemandeur] = useState('');
  const [lienParente, setLienParente] = useState<LienParente>('VEUF_VEUVE');
  const [cinDemandeur, setCinDemandeur] = useState('');
  const [dateDelivranceCin, setDateDelivranceCin] = useState('');
  const [telephone, setTelephone] = useState('');
  const [adresse, setAdresse] = useState('');

  // Étape 3 : Enfants et Cas complexes
  const [enfants, setEnfants] = useState<Omit<Enfant, 'id'>[]>([]);
  const [hasDeuxParentsDecedes, setHasDeuxParentsDecedes] = useState(false);
  const [hasPluraliteLits, setHasPluraliteLits] = useState(false);
  const [hasDivorce, setHasDivorce] = useState(false);
  const [hasEnfantHandicape, setHasEnfantHandicape] = useState(false);

  // Étape 4 : Check-list des pièces (états de vérification saisis par l'agent)
  const [piecesStatus, setPiecesStatus] = useState<Record<string, { statut: StatutPiece; remarque?: string }>>({});

  // Dynamic calculation of required pieces
  const requiredPiecesSpecs = useMemo(() => {
    const casComplexes: string[] = [];
    if (hasDeuxParentsDecedes) casComplexes.push('DEUX_PARENTS_DECES');
    if (hasPluraliteLits) casComplexes.push('PLURALITE_LITS');
    if (hasDivorce) casComplexes.push('DIVORCE');

    const nbMineurs = enfants.filter((e) => e.estMineur).length;

    return genererChecklistRequise(
      statutActivite,
      lienParente,
      casComplexes,
      hasEnfantHandicape,
      nbMineurs
    );
  }, [
    statutActivite,
    lienParente,
    hasDeuxParentsDecedes,
    hasPluraliteLits,
    hasDivorce,
    hasEnfantHandicape,
    enfants,
  ]);

  // Handle piece status change
  const handlePieceStatusChange = (codePiece: string, statut: StatutPiece) => {
    setPiecesStatus((prev) => ({
      ...prev,
      [codePiece]: {
        statut,
        remarque: prev[codePiece]?.remarque || '',
      },
    }));
  };

  const handlePieceRemarqueChange = (codePiece: string, remarque: string) => {
    setPiecesStatus((prev) => ({
      ...prev,
      [codePiece]: {
        statut: prev[codePiece]?.statut || 'NON_FOURNIE',
        remarque,
      },
    }));
  };

  // Add child
  const handleAddEnfant = () => {
    setEnfants((prev) => [
      ...prev,
      {
        nom: nomDefunt || '',
        prenoms: '',
        dateNaissance: '2015-01-01',
        estMineur: true,
        estHandicape: false,
        numeroLit: 1,
      },
    ]);
  };

  const handleRemoveEnfant = (index: number) => {
    setEnfants((prev) => prev.filter((_, i) => i !== index));
  };

  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Step 1 Validation
  const isStep1Valid = useMemo(() => {
    if (!im.trim()) return false;
    if (!nomDefunt.trim()) return false;
    if (!dateDeces) return false;
    if (statutActivite === 'RETRAITE_PENSIONNE' && !numeroPension.trim()) return false;
    return true;
  }, [im, nomDefunt, dateDeces, statutActivite, numeroPension]);

  // Step 2 Validation
  const isStep2Valid = useMemo(() => {
    if (!nomDemandeur.trim()) return false;
    if (!cinDemandeur.trim()) return false;
    return true;
  }, [nomDemandeur, cinDemandeur]);

  // Step 3 Validation
  const isStep3Valid = useMemo(() => {
    for (const enf of enfants) {
      if (!enf.nom.trim() || !enf.dateNaissance) return false;
    }
    return true;
  }, [enfants]);

  // Fraud et Duplicate check
  const duplicateCheckResult = useMemo(() => {
    return FraudDetectionService.checkForDuplicates(im, numeroPension, cinDemandeur);
  }, [im, numeroPension, cinDemandeur]);

  // Enforce sequential step transition with prerequisite checks
  const goToStep = (targetStep: number) => {
    setErrorMsg(null);
    if (targetStep > 1 && !isStep1Valid) {
      setErrorMsg(
        "Priorité Étape 1 obligatoire non accomplie : L'Indice Matricule (IM), le Nom du défunt et la Date de décès sont obligatoires" +
          (statutActivite === 'RETRAITE_PENSIONNE' ? ', ainsi que le Numéro de pension.' : '.')
      );
      return;
    }
    if (targetStep > 2 && !isStep2Valid) {
      setErrorMsg(
        "Priorité Étape 2 obligatoire non accomplie : Le Nom du demandeur et son N° CIN sont obligatoires" +
          (lienParente === 'TUTEUR_ENFANT_MINEUR' || lienParente === 'CELIBATAIRE_AVEC_MINEUR'
            ? ", ainsi que la référence de l'ordonnance de tutelle."
            : '.')
      );
      return;
    }
    if (targetStep > 3 && !isStep3Valid) {
      setErrorMsg(
        "Priorité Étape 3 obligatoire non accomplie : Veuillez renseigner le nom et la date de naissance pour chaque enfant déclaré."
      );
      return;
    }
    setCurrentStep(targetStep);
  };

  // Submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (duplicateCheckResult.hasDuplicate) {
      setErrorMsg(`🚨 ALERTE DOUBLON ET FRAUDE BLOQUÉE : ${duplicateCheckResult.message}`);
      return;
    }

    const annee = new Date().getFullYear();
    const count = DossierStorageService.getDossiers().length + 1;
    const numDossier = `SEC-${annee}-${String(count).padStart(4, '0')}`;

    // Construire la liste des pièces
    const finalPieces: PieceJustificative[] = requiredPiecesSpecs.map((spec, idx) => {
      const state = piecesStatus[spec.codePiece] || { statut: 'NON_FOURNIE' };
      return {
        id: `p-${Date.now()}-${idx}`,
        codePiece: spec.codePiece,
        intitule: spec.intitule,
        categorie: spec.categorie,
        estObligatoire: spec.estObligatoire,
        statut: state.statut,
        instruction: spec.instruction,
        remarque: state.remarque,
        dateVerification: state.statut === 'CONFORME' ? new Date().toISOString() : undefined,
      };
    });

    const obligatoires = finalPieces.filter((p) => p.estObligatoire);
    const allConformes = obligatoires.every((p) => p.statut === 'CONFORME');

    let complexite: any = undefined;
    if (hasDeuxParentsDecedes) complexite = 'DEUX_PARENTS_DECES';
    else if (hasPluraliteLits) complexite = 'PLURALITE_LITS';
    else if (hasDivorce) complexite = 'DIVORCE';

    const newDossier: DossierSecours = {
      id: `dos-${Date.now()}`,
      numeroDossier: numDossier,
      dateArrivee: new Date().toISOString().slice(0, 10),
      statut: allConformes ? 'ENQUETE_CONFORME' : 'RECEPTION_EN_COURS',
      montantSecours: Number(montantSecoursSaisi) || (computedMontantSecours > 0 ? computedMontantSecours : 500000),
      situationComplexe: complexite,
      defunt: {
        im: im.trim(),
        nom: nomDefunt.trim().toUpperCase(),
        prenoms: prenomsDefunt.trim(),
        statutActivite,
        typeAgentActivite: statutActivite === 'ACTIVITE' ? typeAgentActivite : undefined,
        dateDeces,
        lieuDeces,
        ministereInstitution,
        dernierGrade,
        numeroPension: statutActivite === 'RETRAITE_PENSIONNE' ? numeroPension : undefined,
        salaireDeBase: baseSalNum,
      },
      demandeur: {
        nom: nomDemandeur.trim().toUpperCase(),
        prenoms: prenomsDemandeur.trim(),
        lienParente,
        cin: cinDemandeur.trim(),
        dateDelivranceCin,
        telephone,
        adresse,
      },
      enfants: enfants.map((enf, idx) => ({
        ...enf,
        id: `enf-${Date.now()}-${idx}`,
      })),
      pieces: finalPieces,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    DossierStorageService.addDossier(newDossier);
    onDossierCreated(newDossier);
  };

  return (
    <div id="enquete-page" className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md">
            <FileCheck2 className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight">
              Procédure d'Étude de fond et de forme et Contrôle des Pièces Justificatives
            </h2>
          </div>
        </div>

        {/* Step Indicator */}
        <div className="mt-6 grid grid-cols-4 gap-2">
          {[
            { step: 1, label: '1. Défunt', allowed: true, completed: isStep1Valid },
            { step: 2, label: '2. Demandeur', allowed: isStep1Valid, completed: isStep2Valid },
            { step: 3, label: '3. Enfants et Cas', allowed: isStep1Valid && isStep2Valid, completed: isStep3Valid },
            {
              step: 4,
              label: '4. Check-list Pièces',
              allowed: isStep1Valid && isStep2Valid && isStep3Valid,
              completed: false,
            },
          ].map((s) => {
            const isCurrent = currentStep === s.step;
            const isLocked = !s.allowed;

            return (
              <button
                key={s.step}
                type="button"
                disabled={isLocked}
                onClick={() => goToStep(s.step)}
                title={
                  isLocked
                    ? "Accomplissez les priorités de l'étape précédente pour déverrouiller cette étape"
                    : undefined
                }
                className={`py-2 px-3 rounded-xl text-xs font-semibold text-center border flex items-center justify-center gap-1.5 transition-all ${
                  isCurrent
                    ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                    : s.completed
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                    : isLocked
                    ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed opacity-75'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                {isLocked ? (
                  <Lock className="w-3 h-3 text-slate-400 shrink-0" />
                ) : s.completed ? (
                  <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                ) : null}
                <span className="truncate">{s.label}</span>
              </button>
            );
          })}
        </div>

        {/* Error / Prerequisite Blocking Banner */}
        {errorMsg && (
          <div className="mt-4 p-3.5 bg-rose-50 border border-rose-300 rounded-xl text-xs text-rose-800 flex items-start gap-2.5 animate-in fade-in">
            <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <span className="font-bold">Passage d'étape bloqué : </span>
              <span>{errorMsg}</span>
            </div>
            <button
              type="button"
              onClick={() => setErrorMsg(null)}
              className="text-rose-500 hover:text-rose-700 font-bold ml-1 text-xs"
            >
              ✕
            </button>
          </div>
        )}
      </div>

      {/* Main Multi-Step Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* ÉTAPE 1 : SITUATION DU DÉFUNT */}
        {currentStep === 1 && (
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4 animate-in fade-in">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-200 text-sm font-bold text-slate-900">
              <User className="w-4 h-4 text-blue-600" />
              <span>Étape 1 : Situation de l'Agent Décédé</span>
            </div>

            {/* Statut Activité vs Pensionné */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
              <label className="block text-xs font-bold text-slate-800">
                Statut au moment du décès
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setStatutActivite('ACTIVITE')}
                  className={`p-3 rounded-xl border text-xs font-bold text-left transition-all cursor-pointer ${
                    statutActivite === 'ACTIVITE'
                      ? 'bg-blue-50 border-blue-500 text-blue-900 ring-2 ring-blue-500/20'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100/70'
                  }`}
                >
                  <span className="block text-sm font-extrabold text-blue-700">Agent en Activité</span>
                </button>

                <button
                  type="button"
                  onClick={() => setStatutActivite('RETRAITE_PENSIONNE')}
                  className={`p-3 rounded-xl border text-xs font-bold text-left transition-all cursor-pointer ${
                    statutActivite === 'RETRAITE_PENSIONNE'
                      ? 'bg-emerald-50 border-emerald-500 text-emerald-900 ring-2 ring-emerald-500/20'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100/70'
                  }`}
                >
                  <span className="block text-sm font-extrabold text-emerald-700">Pensionné / Retraité</span>
                </button>
              </div>

              {/* Sous-type d'agent en activité : Fonctionnaire ou Agent EFA / ELD */}
              {statutActivite === 'ACTIVITE' && (
                <div className="pt-3 border-t border-slate-200 mt-2 space-y-2 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-slate-800">
                      Type d'agent en activité <span className="text-rose-500">*</span> :
                    </label>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setTypeAgentActivite('FONCTIONNAIRE')}
                      className={`p-3 rounded-xl border text-xs font-bold text-left transition-all cursor-pointer ${
                        typeAgentActivite === 'FONCTIONNAIRE'
                          ? 'bg-blue-600 text-white shadow-xs border-blue-700 ring-2 ring-blue-500/30'
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-extrabold">Fonctionnaire</span>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setTypeAgentActivite('EFA_ELD')}
                      className={`p-3 rounded-xl border text-xs font-bold text-left transition-all cursor-pointer ${
                        typeAgentActivite === 'EFA_ELD'
                          ? 'bg-amber-600 text-white shadow-xs border-amber-700 ring-2 ring-amber-500/30'
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-extrabold">Agent EFA / ELD</span>
                      </div>
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Indice Matricule (IM) *
                </label>
                <input
                  type="text"
                  required
                  value={im}
                  onChange={(e) => setIm(e.target.value)}
                  placeholder="Ex: 345.892"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 font-mono font-bold focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nom du Défunt *
                </label>
                <input
                  type="text"
                  required
                  value={nomDefunt}
                  onChange={(e) => setNomDefunt(e.target.value)}
                  placeholder="Ex: RANDRIANASOLO"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 uppercase font-semibold focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Prénoms *
                </label>
                <input
                  type="text"
                  required
                  value={prenomsDefunt}
                  onChange={(e) => setPrenomsDefunt(e.target.value)}
                  placeholder="Ex: Jean Baptiste"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Date du Décès *
                </label>
                <input
                  type="date"
                  required
                  value={dateDeces}
                  onChange={(e) => setDateDeces(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Lieu du Décès
                </label>
                <input
                  type="text"
                  value={lieuDeces}
                  onChange={(e) => setLieuDeces(e.target.value)}
                  placeholder="Ex: HJRA Antananarivo"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Ministère ou Institution d'Origine
                </label>
                <input
                  type="text"
                  value={ministereInstitution}
                  onChange={(e) => setMinistereInstitution(e.target.value)}
                  placeholder="Ex: Ministère de l'Économie et des Finances"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {statutActivite === 'RETRAITE_PENSIONNE' && (
                <div>
                  <label className="block text-xs font-semibold text-emerald-800 mb-1">
                    Numéro de Pension de Retraite
                  </label>
                  <input
                    type="text"
                    value={numeroPension}
                    onChange={(e) => setNumeroPension(e.target.value)}
                    placeholder="Ex: PEN-RET-89452"
                    className="w-full px-3 py-2 border border-emerald-300 rounded-lg text-sm text-slate-900 font-mono focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              )}
            </div>

            {/* Saisie manuelle du montant de secours (aucun calcul imposé) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-indigo-50/50 rounded-xl border border-indigo-200">
              <div>
                <label className="block text-xs font-bold text-indigo-900 mb-1">
                  Montant du Secours à Allouer (Ar) *
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  required
                  value={montantSecoursSaisi}
                  onChange={(e) => {
                    const raw = e.target.value.replace(/\D/g, '');
                    setMontantSecoursSaisi(raw === '' ? '' : Number(raw));
                  }}
                  placeholder="Ex: 500000"
                  className="w-full px-3 py-2 border border-indigo-300 rounded-lg text-sm font-mono font-bold text-indigo-950 bg-white focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Total rubrique ou Salaire de base (Ar) — Optionnel
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={salaireDeBase}
                  onChange={(e) => {
                    const raw = e.target.value.replace(/\D/g, '');
                    setSalaireDeBase(raw === '' ? '' : Number(raw));
                    if (raw !== '') {
                      const num = Number(raw);
                      setMontantSecoursSaisi(num * multiplier);
                    }
                  }}
                  placeholder="Optionnel"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono text-slate-800 bg-white focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="pt-4 flex justify-end">
              <button
                type="button"
                onClick={() => goToStep(2)}
                className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm flex items-center gap-1.5"
              >
                <span>Suivant : Demandeur</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* ÉTAPE 2 : DEMANDEUR ET LIEN DE PARENTÉ */}
        {currentStep === 2 && (
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4 animate-in fade-in">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-200 text-sm font-bold text-slate-900">
              <Users className="w-4 h-4 text-blue-600" />
              <span>Étape 2 : Qualité du Demandeur (Ayant Droit)</span>
            </div>

            {/* Lien de parenté Selector */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
              <label className="block text-xs font-bold text-slate-800">
                Lien juridique avec l'agent décédé *
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => setLienParente('VEUF_VEUVE')}
                  className={`p-3 rounded-xl border text-xs font-bold text-left transition-all ${
                    lienParente === 'VEUF_VEUVE'
                      ? 'bg-blue-50 border-blue-500 text-blue-900 ring-2 ring-blue-500/20'
                      : 'bg-white border-slate-200 text-slate-600'
                  }`}
                >
                  <span className="block font-bold">Veuf / Veuve</span>
                </button>

                <button
                  type="button"
                  onClick={() => setLienParente('TUTEUR_ENFANT_MINEUR')}
                  className={`p-3 rounded-xl border text-xs font-bold text-left transition-all ${
                    lienParente === 'TUTEUR_ENFANT_MINEUR'
                      ? 'bg-blue-50 border-blue-500 text-blue-900 ring-2 ring-blue-500/20'
                      : 'bg-white border-slate-200 text-slate-600'
                  }`}
                >
                  <span className="block font-bold">Tuteur d'enfant(s) mineur(s)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setLienParente('CELIBATAIRE_AVEC_MINEUR')}
                  className={`p-3 rounded-xl border text-xs font-bold text-left transition-all ${
                    lienParente === 'CELIBATAIRE_AVEC_MINEUR'
                      ? 'bg-blue-50 border-blue-500 text-blue-900 ring-2 ring-blue-500/20'
                      : 'bg-white border-slate-200 text-slate-600'
                  }`}
                >
                  <span className="block font-bold">Célibataire avec mineur(s)</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nom du Bénéficiaire *
                </label>
                <input
                  type="text"
                  required
                  value={nomDemandeur}
                  onChange={(e) => setNomDemandeur(e.target.value)}
                  placeholder="Ex: RAKOTOMALALA"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 uppercase font-semibold focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Prénoms *
                </label>
                <input
                  type="text"
                  required
                  value={prenomsDemandeur}
                  onChange={(e) => setPrenomsDemandeur(e.target.value)}
                  placeholder="Ex: Voahirana Hanta"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  N° CIN *
                </label>
                <input
                  type="text"
                  required
                  value={cinDemandeur}
                  onChange={(e) => setCinDemandeur(e.target.value)}
                  placeholder="Ex: 101 245 890 123"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 font-mono focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Téléphone de contact
                </label>
                <input
                  type="text"
                  value={telephone}
                  onChange={(e) => setTelephone(e.target.value)}
                  placeholder="Ex: +261 34 12 345 67"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="pt-4 flex justify-between">
              <button
                type="button"
                onClick={() => setCurrentStep(1)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl border border-slate-300 flex items-center gap-1.5"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Précédent</span>
              </button>
              <button
                type="button"
                onClick={() => goToStep(3)}
                className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm flex items-center gap-1.5"
              >
                <span>Suivant : Enfants et Cas Complexes</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* ÉTAPE 3 : ENFANTS ET CAS COMPLEXES */}
        {currentStep === 3 && (
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-5 animate-in fade-in">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-200 text-sm font-bold text-slate-900">
              <ShieldAlert className="w-4 h-4 text-blue-600" />
              <span>Étape 3 : Enfants et Cas Particuliers ou Complexes</span>
            </div>

            {/* Checkboxes for complex situations */}
            <div className="space-y-3">
              <label className="block text-xs font-bold text-slate-800">
                Cas Particuliers Réglementaires (Ajout automatique de pièces) :
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <label className="flex items-start gap-2.5 p-3 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={hasDeuxParentsDecedes}
                    onChange={(e) => setHasDeuxParentsDecedes(e.target.checked)}
                    className="mt-0.5 rounded text-blue-600 focus:ring-blue-500"
                  />
                  <div>
                    <span className="font-bold text-slate-900 block">Deux parents décédés</span>
                    <span className="text-[11px] text-slate-500">Exige l'acte de décès du second parent.</span>
                  </div>
                </label>

                <label className="flex items-start gap-2.5 p-3 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={hasPluraliteLits}
                    onChange={(e) => setHasPluraliteLits(e.target.checked)}
                    className="mt-0.5 rounded text-blue-600 focus:ring-blue-500"
                  />
                  <div>
                    <span className="font-bold text-slate-900 block">Pluralité de lits</span>
                    <span className="text-[11px] text-slate-500">Exige les actes des lits et protocoles de répartition.</span>
                  </div>
                </label>

                <label className="flex items-start gap-2.5 p-3 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={hasDivorce}
                    onChange={(e) => setHasDivorce(e.target.checked)}
                    className="mt-0.5 rounded text-blue-600 focus:ring-blue-500"
                  />
                  <div>
                    <span className="font-bold text-slate-900 block">Défunt Divorcé</span>
                    <span className="text-[11px] text-slate-500">Grosse de jugement de divorce avec certificat non-appel.</span>
                  </div>
                </label>

                <label className="flex items-start gap-2.5 p-3 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={hasEnfantHandicape}
                    onChange={(e) => setHasEnfantHandicape(e.target.checked)}
                    className="mt-0.5 rounded text-blue-600 focus:ring-blue-500"
                  />
                  <div>
                    <span className="font-bold text-slate-900 block">Enfant majeur handicapé (&gt; 21 ans)</span>
                    <span className="text-[11px] text-slate-500">Certificat médical d'incapacité permanente délivré par CMA.</span>
                  </div>
                </label>
              </div>
            </div>

            {/* Enfants List Section */}
            <div className="pt-2 border-t border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-900 block">
                    Enfants à charge ({enfants.length})
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Nécessaire pour le calcul des actes de naissance et certificats de vie collectif.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleAddEnfant}
                  className="px-3 py-1.5 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Ajouter un enfant</span>
                </button>
              </div>

              {enfants.map((enf, idx) => (
                <div
                  key={idx}
                  className="p-3 bg-slate-50 rounded-xl border border-slate-200 grid grid-cols-1 sm:grid-cols-4 gap-3 items-center text-xs"
                >
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-500">Prénoms</label>
                    <input
                      type="text"
                      value={enf.prenoms}
                      onChange={(e) => {
                        const next = [...enfants];
                        next[idx].prenoms = e.target.value;
                        setEnfants(next);
                      }}
                      placeholder="Prénom de l'enfant"
                      className="w-full px-2 py-1.5 border border-slate-300 rounded bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold text-slate-500">Date naissance</label>
                    <input
                      type="date"
                      value={enf.dateNaissance}
                      onChange={(e) => {
                        const next = [...enfants];
                        next[idx].dateNaissance = e.target.value;
                        setEnfants(next);
                      }}
                      className="w-full px-2 py-1.5 border border-slate-300 rounded bg-white"
                    />
                  </div>

                  <div className="flex items-center gap-3 pt-3">
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={enf.estMineur}
                        onChange={(e) => {
                          const next = [...enfants];
                          next[idx].estMineur = e.target.checked;
                          setEnfants(next);
                        }}
                      />
                      <span>&lt; 21 ans (Mineur)</span>
                    </label>
                  </div>

                  <div className="flex justify-end pt-3">
                    <button
                      type="button"
                      onClick={() => handleRemoveEnfant(idx)}
                      className="p-1.5 text-rose-600 hover:bg-rose-50 rounded"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-4 flex justify-between">
              <button
                type="button"
                onClick={() => setCurrentStep(2)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl border border-slate-300 flex items-center gap-1.5"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Précédent</span>
              </button>
              <button
                type="button"
                onClick={() => goToStep(4)}
                className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm flex items-center gap-1.5"
              >
                <span>Générer Check-list Dynamique ({requiredPiecesSpecs.length} pièces)</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* ÉTAPE 4 : CHECK-LIST DYNAMIQUE DES PIÈCES JUSTIFICATIVES */}
        {currentStep === 4 && (
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-5 animate-in fade-in">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <FileCheck2 className="w-5 h-5 text-emerald-600" />
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Étape 4 : Contrôle Dynamique des Pièces Justificatives Requises
                  </h3>
                  <p className="text-xs text-slate-500">
                    {requiredPiecesSpecs.length} pièces obligatoires déduites selon les règles pour :{' '}
                    <strong className="text-slate-800">
                      {statutActivite === 'ACTIVITE' ? 'Défunt Actif' : 'Défunt Pensionné'} + {lienParente.replace(/_/g, ' ')}
                    </strong>
                  </p>
                </div>
              </div>
            </div>

            {/* Checklist items */}
            <div className="space-y-3">
              {requiredPiecesSpecs.map((spec) => {
                const currentStatus = piecesStatus[spec.codePiece]?.statut || 'NON_FOURNIE';
                const currentRemarque = piecesStatus[spec.codePiece]?.remarque || '';

                return (
                  <div
                    key={spec.codePiece}
                    className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2 hover:border-slate-300 transition-colors"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-white text-slate-700 border border-slate-200 uppercase">
                            {spec.categorie}
                          </span>
                          <span className="text-[10px] font-semibold text-rose-600">Obligatoire</span>
                        </div>
                        <h4 className="text-xs font-bold text-slate-900 mt-1">
                          {spec.intitule}
                        </h4>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          {spec.instruction}
                        </p>
                      </div>

                      {/* Tri-state buttons: Conforme / Non conforme / Non fournie */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => handlePieceStatusChange(spec.codePiece, 'CONFORME')}
                          className={`px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-all ${
                            currentStatus === 'CONFORME'
                              ? 'bg-emerald-600 text-white shadow-xs'
                              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Conforme</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handlePieceStatusChange(spec.codePiece, 'NON_CONFORME')}
                          className={`px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-all ${
                            currentStatus === 'NON_CONFORME'
                              ? 'bg-rose-600 text-white shadow-xs'
                              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          <span>Non conforme</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handlePieceStatusChange(spec.codePiece, 'NON_FOURNIE')}
                          className={`px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-all ${
                            currentStatus === 'NON_FOURNIE'
                              ? 'bg-slate-700 text-white shadow-xs'
                              : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          <Clock className="w-3.5 h-3.5" />
                          <span>En attente</span>
                        </button>
                      </div>
                    </div>

                    {/* Note input if needed */}
                    <input
                      type="text"
                      value={currentRemarque}
                      onChange={(e) => handlePieceRemarqueChange(spec.codePiece, e.target.value)}
                      placeholder="Remarques éventuelles sur la pièce (date légalisation, autorité, référence)..."
                      className="w-full px-2.5 py-1 text-xs border border-slate-200 rounded-lg bg-white text-slate-800"
                    />
                  </div>
                );
              })}
            </div>

            {/* Institutional Procedure Notice */}
            <div className="p-3.5 rounded-xl border bg-slate-50 border-slate-200 text-xs">
              <div className="flex items-start gap-2.5">
                <ShieldAlert className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-slate-900 block">
                    Règle de procédure :
                  </span>
                  <span className="text-slate-600">
                    Les dossiers "En cours" ne sont pas encore complets (les pièces ne sont pas totalement obligatoires à la création). Cependant, il est formellement interdit de mandater le dossier du bénéficiaire si l'intégralité des pièces justificatives obligatoires n'est pas fournie et conforme.
                  </span>
                </div>
              </div>
            </div>

            {/* Bottom Form Actions */}
            <div className="pt-4 border-t border-slate-200 flex justify-between items-center">
              <button
                type="button"
                onClick={() => setCurrentStep(3)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl border border-slate-300 flex items-center gap-1.5"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Précédent</span>
              </button>

              <button
                type="submit"
                className="px-6 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-md flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                <span>Enregistrer le Dossier dans le Registre</span>
              </button>
            </div>
          </div>
        )}
      </form>
    </div>
  );
};
