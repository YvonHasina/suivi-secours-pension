import React, { useState } from 'react';
import {
  X,
  Save,
  User,
  Users,
  Building2,
  Calendar,
  CreditCard,
  Plus,
  Trash2,
  AlertCircle,
  FileCheck,
  CheckCircle2,
  Edit3,
} from 'lucide-react';
import {
  DossierSecours,
  StatutActivite,
  TypeAgentActivite,
  LienParente,
  Enfant,
  UserRole,
} from '../types';

interface DossierEditModalProps {
  isOpen: boolean;
  dossier: DossierSecours | null;
  activeRole: UserRole;
  onClose: () => void;
  onSave: (updatedDossier: DossierSecours, modificationNote: string) => void;
}

export const DossierEditModal: React.FC<DossierEditModalProps> = ({
  isOpen,
  dossier,
  activeRole,
  onClose,
  onSave,
}) => {
  if (!isOpen || !dossier) return null;

  const [activeTab, setActiveTab] = useState<'defunt' | 'demandeur' | 'enfants' | 'administratif'>('defunt');

  // Agent Défunt
  const [im, setIm] = useState(dossier.defunt.im);
  const [nomDefunt, setNomDefunt] = useState(dossier.defunt.nom);
  const [prenomsDefunt, setPrenomsDefunt] = useState(dossier.defunt.prenoms);
  const [statutActivite, setStatutActivite] = useState<StatutActivite>(dossier.defunt.statutActivite);
  const [typeAgentActivite, setTypeAgentActivite] = useState<TypeAgentActivite>(
    dossier.defunt.typeAgentActivite || 'FONCTIONNAIRE'
  );
  const [dateDeces, setDateDeces] = useState(dossier.defunt.dateDeces);
  const [lieuDeces, setLieuDeces] = useState(dossier.defunt.lieuDeces || '');
  const [ministereInstitution, setMinistereInstitution] = useState(dossier.defunt.ministereInstitution || '');
  const [dernierGrade, setDernierGrade] = useState(dossier.defunt.dernierGrade || '');
  const [corpsAppartenance, setCorpsAppartenance] = useState(dossier.defunt.corpsAppartenance || '');
  const [numeroPension, setNumeroPension] = useState(dossier.defunt.numeroPension || '');
  const [salaireDeBase, setSalaireDeBase] = useState<number | string>(dossier.defunt.salaireDeBase || 41667);

  // Demandeur
  const [nomDemandeur, setNomDemandeur] = useState(dossier.demandeur.nom);
  const [prenomsDemandeur, setPrenomsDemandeur] = useState(dossier.demandeur.prenoms);
  const [lienParente, setLienParente] = useState<LienParente>(dossier.demandeur.lienParente);
  const [cinDemandeur, setCinDemandeur] = useState(dossier.demandeur.cin);
  const [dateDelivranceCin, setDateDelivranceCin] = useState(dossier.demandeur.dateDelivranceCin || '');
  const [lieuDelivranceCin, setLieuDelivranceCin] = useState(dossier.demandeur.lieuDelivranceCin || '');
  const [adresse, setAdresse] = useState(dossier.demandeur.adresse || '');
  const [telephone, setTelephone] = useState(dossier.demandeur.telephone || '');

  // Enfants
  const [enfants, setEnfants] = useState<Enfant[]>(dossier.enfants || []);
  const [newEnfantNom, setNewEnfantNom] = useState('');
  const [newEnfantPrenoms, setNewEnfantPrenoms] = useState('');
  const [newEnfantDateNaiss, setNewEnfantDateNaiss] = useState('');
  const [newEnfantMineur, setNewEnfantMineur] = useState(true);
  const [newEnfantHandicape, setNewEnfantHandicape] = useState(false);

  // Données Administratives
  const [dateArrivee, setDateArrivee] = useState(dossier.dateArrivee);
  const [dateDelaiComplet, setDateDelaiComplet] = useState(dossier.dateDelaiComplet || '');
  
  const baseSalNum = Number(salaireDeBase) || 0;
  const multiplier = statutActivite === 'RETRAITE_PENSIONNE' 
    ? 3 
    : (typeAgentActivite === 'EFA_ELD' ? 3 : 12);
  const computedMontantSecours = baseSalNum * multiplier;
  const [montantSecours, setMontantSecours] = useState<number | string>(dossier.montantSecours || computedMontantSecours || 500000);

  const [numVisaCf, setNumVisaCf] = useState(dossier.numVisaCf || '');
  const [dateVisaCf, setDateVisaCf] = useState(dossier.dateVisaCf || '');
  const [numDecision, setNumDecision] = useState(dossier.numDecision || '');
  const [dateDecision, setDateDecision] = useState(dossier.dateDecision || '');
  const [dateEnvoiCf, setDateEnvoiCf] = useState(dossier.dateEnvoiCf || '');
  const [dateMandatement, setDateMandatement] = useState(dossier.dateMandatement || '');
  const [numMandat, setNumMandat] = useState(dossier.numMandat || '');
  const [observations, setObservations] = useState(dossier.observations || '');

  // Note de modification
  const [modificationNote, setModificationNote] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const handleAddEnfant = () => {
    if (!newEnfantNom.trim()) return;
    const item: Enfant = {
      id: `enf-${Date.now()}`,
      nom: newEnfantNom.trim().toUpperCase(),
      prenoms: newEnfantPrenoms.trim(),
      dateNaissance: newEnfantDateNaiss,
      estMineur: newEnfantMineur,
      estHandicape: newEnfantHandicape,
      numeroLit: 1,
    };
    setEnfants([...enfants, item]);
    setNewEnfantNom('');
    setNewEnfantPrenoms('');
    setNewEnfantDateNaiss('');
  };

  const handleRemoveEnfant = (id: string) => {
    setEnfants(enfants.filter((e) => e.id !== id));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!im.trim() || !nomDefunt.trim() || !nomDemandeur.trim() || !cinDemandeur.trim()) {
      setErrorMsg('Veuillez renseigner au minimum l’IM, le nom du défunt, le nom du demandeur et son N° CIN.');
      return;
    }

    const updated: DossierSecours = {
      ...dossier,
      dateArrivee,
      dateDelaiComplet: dateDelaiComplet.trim() || undefined,
      montantSecours: Number(montantSecours) || 0,
      numVisaCf: numVisaCf.trim() || undefined,
      dateVisaCf: dateVisaCf.trim() || undefined,
      numDecision: numDecision.trim() || undefined,
      dateDecision: dateDecision.trim() || undefined,
      dateEnvoiCf: dateEnvoiCf.trim() || undefined,
      dateMandatement: dateMandatement.trim() || undefined,
      numMandat: numMandat.trim() || undefined,
      observations: observations.trim() || undefined,
      defunt: {
        ...dossier.defunt,
        im: im.trim(),
        nom: nomDefunt.trim().toUpperCase(),
        prenoms: prenomsDefunt.trim(),
        statutActivite,
        typeAgentActivite: statutActivite === 'ACTIVITE' ? typeAgentActivite : undefined,
        dateDeces,
        lieuDeces: lieuDeces.trim() || undefined,
        ministereInstitution: ministereInstitution.trim() || undefined,
        dernierGrade: dernierGrade.trim() || undefined,
        corpsAppartenance: corpsAppartenance.trim() || undefined,
        numeroPension: statutActivite === 'RETRAITE_PENSIONNE' ? numeroPension.trim() : undefined,
        salaireDeBase: baseSalNum,
      },
      demandeur: {
        ...dossier.demandeur,
        nom: nomDemandeur.trim().toUpperCase(),
        prenoms: prenomsDemandeur.trim(),
        lienParente,
        cin: cinDemandeur.trim(),
        dateDelivranceCin: dateDelivranceCin.trim() || undefined,
        lieuDelivranceCin: lieuDelivranceCin.trim() || undefined,
        adresse: adresse.trim() || undefined,
        telephone: telephone.trim() || undefined,
      },
      enfants,
    };

    const finalNote = modificationNote.trim() || 'Mise à jour des informations administratives.';
    onSave(updated, finalNote);
  };

  return (
    <div
      id="edit-dossier-modal-backdrop"
      className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-150"
    >
      <div
        id="edit-dossier-modal-box"
        className="card-3d bg-white rounded-2xl shadow-2xl border border-slate-300 w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150"
      >
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-[0_2px_8px_rgba(37,99,235,0.4),inset_0_1px_0_rgba(255,255,255,0.3)]">
              <Edit3 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white tracking-tight">
                  Modifier le Dossier
                </h3>
                <span className="font-mono text-xs px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/30">
                  {dossier.numeroDossier}
                </span>
              </div>
              <p className="text-xs text-slate-300">
                Agent Défunt IM : <span className="font-mono text-blue-200 font-bold">{dossier.defunt.im}</span> — {dossier.defunt.nom} {dossier.defunt.prenoms}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="px-6 pt-3 bg-slate-50 border-b border-slate-200 flex items-center gap-2 overflow-x-auto shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('defunt')}
            className={`pb-2.5 px-3 text-xs font-bold transition-all border-b-2 whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'defunt'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>1. Agent Défunt</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('demandeur')}
            className={`pb-2.5 px-3 text-xs font-bold transition-all border-b-2 whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'demandeur'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>2. Ayant Droit (Demandeur)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('enfants')}
            className={`pb-2.5 px-3 text-xs font-bold transition-all border-b-2 whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'enfants'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>3. Enfants ({enfants.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('administratif')}
            className={`pb-2.5 px-3 text-xs font-bold transition-all border-b-2 whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'administratif'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>4. Données Administratives</span>
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* TAB 1: DÉFUNT */}
          {activeTab === 'defunt' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Indice Matricule (IM) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={im}
                    onChange={(e) => setIm(e.target.value)}
                    className="w-full text-xs font-mono font-bold bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:ring-2 focus:ring-blue-500 shadow-2xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Nom du Défunt <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={nomDefunt}
                    onChange={(e) => setNomDefunt(e.target.value)}
                    className="w-full text-xs font-semibold bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:ring-2 focus:ring-blue-500 shadow-2xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Prénoms du Défunt
                  </label>
                  <input
                    type="text"
                    value={prenomsDefunt}
                    onChange={(e) => setPrenomsDefunt(e.target.value)}
                    className="w-full text-xs bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:ring-2 focus:ring-blue-500 shadow-2xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Statut d'Activité <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={statutActivite}
                    onChange={(e) => setStatutActivite(e.target.value as StatutActivite)}
                    className="w-full text-xs font-bold bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:ring-2 focus:ring-blue-500 shadow-2xs"
                  >
                    <option value="ACTIVITE">Agent en Activité</option>
                    <option value="RETRAITE_PENSIONNE">Pensionné / Retraité</option>
                  </select>
                </div>

                {statutActivite === 'ACTIVITE' ? (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Type d'agent actif <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={typeAgentActivite}
                      onChange={(e) => setTypeAgentActivite(e.target.value as TypeAgentActivite)}
                      className="w-full text-xs font-bold bg-white border border-blue-400 rounded-xl px-3 py-2 text-blue-900 focus:ring-2 focus:ring-blue-500 shadow-2xs"
                    >
                      <option value="FONCTIONNAIRE">Fonctionnaire</option>
                      <option value="EFA_ELD">Agent EFA / ELD</option>
                    </select>
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Régime Pension
                    </label>
                    <div className="text-xs font-medium text-slate-600 bg-slate-100 rounded-xl px-3 py-2 border border-slate-200">
                      Pensionné Trésor
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Date du Décès <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={dateDeces}
                    onChange={(e) => setDateDeces(e.target.value)}
                    className="w-full text-xs bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:ring-2 focus:ring-blue-500 shadow-2xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Lieu du Décès
                  </label>
                  <input
                    type="text"
                    value={lieuDeces}
                    onChange={(e) => setLieuDeces(e.target.value)}
                    className="w-full text-xs bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:ring-2 focus:ring-blue-500 shadow-2xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Ministère ou Institution
                  </label>
                  <input
                    type="text"
                    value={ministereInstitution}
                    onChange={(e) => setMinistereInstitution(e.target.value)}
                    className="w-full text-xs bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:ring-2 focus:ring-blue-500 shadow-2xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Dernier Grade / Corps
                  </label>
                  <input
                    type="text"
                    value={dernierGrade}
                    onChange={(e) => setDernierGrade(e.target.value)}
                    placeholder="Ex: Administrateur Civil"
                    className="w-full text-xs bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:ring-2 focus:ring-blue-500 shadow-2xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Corps d'appartenance
                  </label>
                  <input
                    type="text"
                    value={corpsAppartenance}
                    onChange={(e) => setCorpsAppartenance(e.target.value)}
                    placeholder="Ex: Cadre A, Personnel EFA..."
                    className="w-full text-xs bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:ring-2 focus:ring-blue-500 shadow-2xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    N° Pension (si retraité)
                  </label>
                  <input
                    type="text"
                    disabled={statutActivite !== 'RETRAITE_PENSIONNE'}
                    value={numeroPension}
                    onChange={(e) => setNumeroPension(e.target.value)}
                    placeholder={statutActivite === 'ACTIVITE' ? 'Non applicable (Actif)' : 'Ex: PEN-98741'}
                    className="w-full text-xs font-mono bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:ring-2 focus:ring-blue-500 shadow-2xs disabled:bg-slate-100 disabled:text-slate-400"
                  />
                </div>
              </div>

              {/* Saisie manuelle du Montant de Secours (sans calcul forcé) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-slate-200">
                <div>
                  <label className="block text-xs font-bold text-indigo-900 mb-1">
                    Montant du Secours Alloué (Ar) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    required
                    value={montantSecours}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/\D/g, '');
                      setMontantSecours(raw === '' ? '' : Number(raw));
                    }}
                    placeholder="Ex: 500000"
                    className="w-full text-xs font-mono font-bold bg-white border border-indigo-300 rounded-xl px-3 py-2 text-indigo-950 focus:ring-2 focus:ring-indigo-500 shadow-2xs"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">
                    ✍️ Saisie manuelle directe du montant (aucun calcul forcé).
                  </p>
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
                        setMontantSecours(Number(raw) * multiplier);
                      }
                    }}
                    placeholder="Optionnel"
                    className="w-full text-xs font-mono bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-800 focus:ring-2 focus:ring-blue-500 shadow-2xs"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">
                    Indication solde (ajuste le montant ci-contre si renseigné, mais modifiable).
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: DEMANDEUR */}
          {activeTab === 'demandeur' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Nom de l'Ayant Droit <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={nomDemandeur}
                    onChange={(e) => setNomDemandeur(e.target.value)}
                    className="w-full text-xs font-semibold bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:ring-2 focus:ring-blue-500 shadow-2xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Prénoms
                  </label>
                  <input
                    type="text"
                    value={prenomsDemandeur}
                    onChange={(e) => setPrenomsDemandeur(e.target.value)}
                    className="w-full text-xs bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:ring-2 focus:ring-blue-500 shadow-2xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Qualité / Lien de Parenté <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={lienParente}
                    onChange={(e) => setLienParente(e.target.value as LienParente)}
                    className="w-full text-xs font-bold bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:ring-2 focus:ring-blue-500 shadow-2xs"
                  >
                    <option value="VEUF_VEUVE">Conjoint Survivant (Veuf / Veuve)</option>
                    <option value="TUTEUR_ENFANT_MINEUR">Tuteur d'Enfant(s) Mineur(s)</option>
                    <option value="CELIBATAIRE_AVEC_MINEUR">Célibataire avec Enfant Mineur</option>
                    <option value="ENFANT_MAJEUR">Enfant Majeur Handicapé</option>
                    <option value="AUTRE_AYANT_DROIT">Autre Ayant Droit Qualifié</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Numéro CIN <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={cinDemandeur}
                    onChange={(e) => setCinDemandeur(e.target.value)}
                    placeholder="Ex: 101 221 045 892"
                    className="w-full text-xs font-mono font-bold bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:ring-2 focus:ring-blue-500 shadow-2xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Date de Délivrance CIN
                  </label>
                  <input
                    type="date"
                    value={dateDelivranceCin}
                    onChange={(e) => setDateDelivranceCin(e.target.value)}
                    className="w-full text-xs bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:ring-2 focus:ring-blue-500 shadow-2xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Lieu de Délivrance CIN
                  </label>
                  <input
                    type="text"
                    value={lieuDelivranceCin}
                    onChange={(e) => setLieuDelivranceCin(e.target.value)}
                    placeholder="Ex: Antananarivo Renivohitra"
                    className="w-full text-xs bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:ring-2 focus:ring-blue-500 shadow-2xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Téléphone de Contact
                  </label>
                  <input
                    type="text"
                    value={telephone}
                    onChange={(e) => setTelephone(e.target.value)}
                    placeholder="Ex: 034 12 345 67"
                    className="w-full text-xs bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:ring-2 focus:ring-blue-500 shadow-2xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Adresse / Firaisana
                  </label>
                  <input
                    type="text"
                    value={adresse}
                    onChange={(e) => setAdresse(e.target.value)}
                    placeholder="Ex: Lot IVB 42 Ankadifotsy"
                    className="w-full text-xs bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:ring-2 focus:ring-blue-500 shadow-2xs"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: ENFANTS */}
          {activeTab === 'enfants' && (
            <div className="space-y-4">
              {/* Add child bar */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Plus className="w-3.5 h-3.5 text-blue-600" />
                  <span>Ajouter un enfant ayant droit</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                  <input
                    type="text"
                    value={newEnfantNom}
                    onChange={(e) => setNewEnfantNom(e.target.value)}
                    placeholder="Nom de l'enfant"
                    className="text-xs bg-white border border-slate-300 rounded-lg px-2.5 py-1.5"
                  />
                  <input
                    type="text"
                    value={newEnfantPrenoms}
                    onChange={(e) => setNewEnfantPrenoms(e.target.value)}
                    placeholder="Prénoms"
                    className="text-xs bg-white border border-slate-300 rounded-lg px-2.5 py-1.5"
                  />
                  <input
                    type="date"
                    value={newEnfantDateNaiss}
                    onChange={(e) => setNewEnfantDateNaiss(e.target.value)}
                    className="text-xs bg-white border border-slate-300 rounded-lg px-2.5 py-1.5"
                  />
                  <button
                    type="button"
                    onClick={handleAddEnfant}
                    className="btn-3d-primary text-xs font-bold px-3 py-1.5 text-white rounded-lg flex items-center justify-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Ajouter</span>
                  </button>
                </div>

                <div className="flex items-center gap-4 text-xs text-slate-600">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newEnfantMineur}
                      onChange={(e) => setNewEnfantMineur(e.target.checked)}
                      className="rounded text-blue-600 focus:ring-blue-500"
                    />
                    <span>Mineur (&lt; 21 ans)</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newEnfantHandicape}
                      onChange={(e) => setNewEnfantHandicape(e.target.checked)}
                      className="rounded text-blue-600 focus:ring-blue-500"
                    />
                    <span>Enfant Handicapé (avec certificat médical)</span>
                  </label>
                </div>
              </div>

              {/* Children List */}
              {enfants.length === 0 ? (
                <div className="p-6 text-center bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-500">
                  Aucun enfant rattaché à ce dossier pour l'instant.
                </div>
              ) : (
                <div className="space-y-2">
                  {enfants.map((enf) => (
                    <div
                      key={enf.id}
                      className="p-3 bg-white border border-slate-200 rounded-xl flex items-center justify-between gap-3 card-3d shadow-2xs"
                    >
                      <div className="space-y-0.5">
                        <div className="text-xs font-bold text-slate-900">
                          {enf.nom} {enf.prenoms}
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-slate-500">
                          <span>Né(e) le : {enf.dateNaissance || '—'}</span>
                          <span>•</span>
                          <span className={enf.estMineur ? 'text-blue-600 font-semibold' : 'text-slate-600'}>
                            {enf.estMineur ? 'Mineur (< 21 ans)' : 'Majeur'}
                          </span>
                          {enf.estHandicape && (
                            <span className="px-1.5 py-0.2 bg-amber-50 text-amber-800 rounded font-bold border border-amber-200">
                              Handicapé
                            </span>
                          )}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveEnfant(enf.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        title="Retirer cet enfant"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: ADMINISTRATIF */}
          {activeTab === 'administratif' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Date d'Arrivée du Dossier <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={dateArrivee}
                    onChange={(e) => setDateArrivee(e.target.value)}
                    className="w-full text-xs bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:ring-2 focus:ring-blue-500 shadow-2xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1" title="Délai limite fixé pour régulariser les pièces incomplètes">
                    Délai limite (Dossier Complet) ⏱️
                  </label>
                  <input
                    type="date"
                    value={dateDelaiComplet}
                    onChange={(e) => setDateDelaiComplet(e.target.value)}
                    className="w-full text-xs bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:ring-2 focus:ring-blue-500 shadow-2xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Montant du Secours (Calcul Auto)
                  </label>
                  <div className="w-full text-xs font-bold bg-indigo-50 border border-indigo-200 rounded-xl px-3 py-2.5 text-indigo-900 font-mono flex items-center justify-between">
                    <span>{computedMontantSecours.toLocaleString()} Ar</span>
                    <span className="text-[10px] uppercase tracking-wider font-bold text-indigo-700 bg-indigo-100 border border-indigo-200 px-2 py-0.5 rounded">
                      {statutActivite === 'ACTIVITE' ? '12 mois (En service)' : '3 mois (Retraité/Contractuel)'}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Date Envoi Contrôle Financier
                  </label>
                  <input
                    type="date"
                    value={dateEnvoiCf}
                    onChange={(e) => setDateEnvoiCf(e.target.value)}
                    className="w-full text-xs bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:ring-2 focus:ring-blue-500 shadow-2xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    N° Visa Contrôle Financier
                  </label>
                  <input
                    type="text"
                    value={numVisaCf}
                    onChange={(e) => setNumVisaCf(e.target.value)}
                    placeholder="Ex: VISA-CF-2026/0540"
                    className="w-full text-xs font-mono bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:ring-2 focus:ring-emerald-500 shadow-2xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Date du Visa CF
                  </label>
                  <input
                    type="date"
                    value={dateVisaCf}
                    onChange={(e) => setDateVisaCf(e.target.value)}
                    className="w-full text-xs font-mono bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:ring-2 focus:ring-emerald-500 shadow-2xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    N° Décision Administrative (Agent)
                  </label>
                  <input
                    type="text"
                    value={numDecision}
                    onChange={(e) => setNumDecision(e.target.value)}
                    placeholder="Ex: DEC-2026/0540"
                    className="w-full text-xs font-mono bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:ring-2 focus:ring-blue-500 shadow-2xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Date de la Décision
                  </label>
                  <input
                    type="date"
                    value={dateDecision}
                    onChange={(e) => setDateDecision(e.target.value)}
                    className="w-full text-xs font-mono bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:ring-2 focus:ring-blue-500 shadow-2xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Date de Mandatement Trésor
                  </label>
                  <input
                    type="date"
                    value={dateMandatement}
                    onChange={(e) => setDateMandatement(e.target.value)}
                    className="w-full text-xs bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:ring-2 focus:ring-blue-500 shadow-2xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Numéro de Mandat Trésor
                  </label>
                  <input
                    type="text"
                    value={numMandat}
                    onChange={(e) => setNumMandat(e.target.value)}
                    placeholder="Ex: MND-2025-0042"
                    className="w-full text-xs font-mono bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:ring-2 focus:ring-blue-500 shadow-2xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Observations Administratives et Précisions
                </label>
                <textarea
                  rows={2}
                  value={observations}
                  onChange={(e) => setObservations(e.target.value)}
                  placeholder="Notes complémentaires pour la liquidation ou le visa..."
                  className="w-full text-xs bg-white border border-slate-300 rounded-xl p-2.5 text-slate-900 focus:ring-2 focus:ring-blue-500 shadow-2xs"
                />
              </div>
            </div>
          )}

          {/* Audit Trail Note Box */}
          <div className="pt-2 border-t border-slate-200">
            <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
              <span>Justification / Note de modification (Audit Log) :</span>
              <span className="text-[10px] text-slate-400 font-normal">Sera inscrite dans le journal d'audit</span>
            </label>
            <input
              type="text"
              value={modificationNote}
              onChange={(e) => setModificationNote(e.target.value)}
              placeholder="Ex: Correction de l'orthographe du nom et mise à jour du numéro CIN..."
              className="w-full text-xs bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-800 focus:ring-2 focus:ring-blue-500 shadow-inner"
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="btn-3d-secondary px-4 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 rounded-xl border border-slate-300"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="btn-3d-primary px-5 py-2 text-xs font-bold text-white rounded-xl flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              <span>Enregistrer les modifications</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
