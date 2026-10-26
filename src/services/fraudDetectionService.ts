import { DossierSecours } from '../types';
import { DossierStorageService } from './dossierStorage';

export interface DuplicateCheckResult {
  hasDuplicate: boolean;
  duplicateType: 'IM' | 'PENSION' | 'CIN' | 'ACTE' | 'NONE';
  existingDossier?: DossierSecours;
  message: string;
}

export class FraudDetectionService {
  /**
   * Vérifie si un nouveau dossier présente un doublon ou une tentative de fraude (même IM, même N° pension, même CIN demandeur, ou même référence d'acte).
   */
  public static checkForDuplicates(
    im: string,
    numeroPension?: string,
    cinDemandeur?: string,
    acteDecesRef?: string,
    excludeDossierId?: string
  ): DuplicateCheckResult {
    const dossiers = DossierStorageService.getDossiers();
    const cleanIm = im.trim().toLowerCase();
    const cleanPension = numeroPension ? numeroPension.trim().toLowerCase() : '';
    const cleanCin = cinDemandeur ? cinDemandeur.trim().toLowerCase() : '';
    const cleanActe = acteDecesRef ? acteDecesRef.trim().toLowerCase() : '';

    for (const dossier of dossiers) {
      if (excludeDossierId && dossier.id === excludeDossierId) continue;

      // 1. Vérification IM (Identifiant Matricule du défunt)
      if (cleanIm && dossier.defunt.im.trim().toLowerCase() === cleanIm) {
        return {
          hasDuplicate: true,
          duplicateType: 'IM',
          existingDossier: dossier,
          message: `Doublon critique détecté : L'Identifiant Matricule (IM) ${dossier.defunt.im} est déjà enregistré dans le dossier ${dossier.numeroDossier} (${dossier.defunt.nom} ${dossier.defunt.prenoms}). Un agent ne peut percevoir qu'un seul secours aux décès.`
        };
      }

      // 2. Vérification Numéro de Pension
      if (
        cleanPension &&
        dossier.defunt.numeroPension &&
        dossier.defunt.numeroPension.trim().toLowerCase() === cleanPension
      ) {
        return {
          hasDuplicate: true,
          duplicateType: 'PENSION',
          existingDossier: dossier,
          message: `Doublon détecté : Le numéro de pension ${dossier.defunt.numeroPension} est déjà associé au dossier ${dossier.numeroDossier}.`
        };
      }

      // 3. Vérification CIN Demandeur
      if (cleanCin && dossier.demandeur.cin.trim().toLowerCase() === cleanCin) {
        // Alerte si le même demandeur formule plusieurs demandes
        return {
          hasDuplicate: true,
          duplicateType: 'CIN',
          existingDossier: dossier,
          message: `Alerte Fraude / Multi-demande : Le demandeur (CIN ${dossier.demandeur.cin} - ${dossier.demandeur.nom}) a déjà initié le dossier ${dossier.numeroDossier}.`
        };
      }

      // 4. Vérification Référence d'Acte dans les pièces ou remarques
      if (cleanActe) {
        const hasMatchingActe = dossier.pieces.some(
          (p) =>
            p.remarque && p.remarque.trim().toLowerCase().includes(cleanActe)
        );
        if (hasMatchingActe) {
          return {
            hasDuplicate: true,
            duplicateType: 'ACTE',
            existingDossier: dossier,
            message: `Doublon d'état civil : La référence d'acte ou de pièce correspond à un justificatif déjà enregistré dans le dossier ${dossier.numeroDossier}.`
          };
        }
      }
    }

    return {
      hasDuplicate: false,
      duplicateType: 'NONE',
      message: 'Aucun doublon ni anomalie détectée.'
    };
  }
}
