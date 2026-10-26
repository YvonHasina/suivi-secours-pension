import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { DossierSecours } from '../types';

export class PdfExportService {
  /**
   * Génère et télécharge le fichier PDF officiel normalisé du Registre des Secours aux Décès (8 Colonnes)
   * avec en-tête solennel de la République de Madagascar et du Ministère de l'Économie et des Finances.
   */
  static exportRegistrePdf(
    dossiers: DossierSecours[],
    options?: {
      titrePersonnalise?: string;
      sousTitrePersonnalise?: string;
      filtreActif?: string;
      nomFichier?: string;
    }
  ) {
    // Création du document PDF au format A4 en orientation PAYSAGE (Landscape) pour accueillir confortablement les 8 colonnes
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4',
    });

    const pageWidth = doc.internal.pageSize.getWidth(); // ~297 mm
    const pageHeight = doc.internal.pageSize.getHeight(); // ~210 mm
    const today = new Date();
    const dateFormatted = today.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
    const timeFormatted = today.toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
    });

    const currentYear = today.getFullYear();
    const titreDocument =
      options?.titrePersonnalise ||
      `REGISTRE OFFICIEL NORMALISÉ DES DOSSIERS DE SECOURS AUX DÉCÈS — EXERCICE ${currentYear}`;

    // Métadonnées officielles du document PDF
    doc.setProperties({
      title: titreDocument,
      subject: "Registre officiel normalisé en 8 colonnes des dossiers de secours aux décès sur pension",
      author: "Ministère de l'Économie et des Finances — DPS.4",
      keywords: "Secours au décès, MEF, DPS, Contrôle Financier, Mandatement, Registre 8 colonnes, Madagascar",
      creator: "Système MEF/DPS de Suivi des Secours aux Décès",
    });

    // -------------------------------------------------------------
    // 1. EN-TÊTE OFFICIEL DE LA RÉPUBLIQUE DE MADAGASCAR
    // -------------------------------------------------------------
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(20, 20, 20);
    doc.text("REPOBLIKAN'I MADAGASIKARA", pageWidth / 2, 12, { align: 'center' });

    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    doc.setTextColor(70, 70, 70);
    doc.text('Fitiavana - Tanindrazana - Fandrosoana', pageWidth / 2, 16, { align: 'center' });

    // Filet officiel
    doc.setDrawColor(30, 41, 59);
    doc.setLineWidth(0.4);
    doc.line(pageWidth / 2 - 25, 18, pageWidth / 2 + 25, 18);

    // Titres institutionnels (Gauche et Droite)
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(15, 23, 42);
    doc.text("MINISTÈRE DE L'ÉCONOMIE ET DES FINANCES", 14, 13);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.text('DIRECTION GÉNÉRALE DES OPÉRATIONS FINANCIÈRES', 14, 17);
    doc.setFont('helvetica', 'bold');
    doc.text('DIRECTION DES PENSIONS ET DE LA SOLDE (DPS / DPS.4)', 14, 21);
    doc.setFont('helvetica', 'normal');
    doc.text('Service des Pensions et Secours au Décès', 14, 25);

    // Référence à droite
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.text(`Antananarivo, le ${dateFormatted}`, pageWidth - 14, 13, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.text(`Édition : ${timeFormatted}`, pageWidth - 14, 17, { align: 'right' });
    doc.text(`Réf. : DPS-MEF/REG-8COL/${today.getFullYear()}`, pageWidth - 14, 21, { align: 'right' });
    doc.text(`Total : ${dossiers.length} dossier(s) consigné(s)`, pageWidth - 14, 25, { align: 'right' });

    // -------------------------------------------------------------
    // 2. TITRE FORMALISÉ DU DOCUMENT (CADRE EN RELIEF)
    // -------------------------------------------------------------
    doc.setDrawColor(30, 58, 138); // Bleu marine
    doc.setFillColor(241, 245, 249); // Gris ardoise clair
    doc.roundedRect(14, 28, pageWidth - 28, 14, 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(15, 23, 42);
    doc.text(titreDocument, pageWidth / 2, 34, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(51, 65, 85);
    const sousTitre = options?.sousTitrePersonnalise || (options?.filtreActif
      ? `Suivi réglementaire en 8 colonnes normalisées — Filtre appliqué : ${options.filtreActif} — Ministère de l'Économie et des Finances`
      : "Suivi réglementaire en 8 colonnes normalisées (Arrivée, Demandeur, Défunt, IM, Envoi CF, Visa CF/Décision, Mandat/Prix, Statut)");
    doc.text(sousTitre, pageWidth / 2, 39, { align: 'center' });

    // -------------------------------------------------------------
    // 3. PRÉPARATION DES DONNÉES DU TABLEAU (8 COLONNES NORMALISÉES)
    // -------------------------------------------------------------
    const tableBody = dossiers.map((d) => {
      // 1. ARRIVÉE ET N° DOSSIER
      const col1 = `${d.numeroDossier}\nDate : ${d.dateArrivee || '—'}`;

      // 2. AYANT DROIT DEMANDEUR
      const lienLabel = d.demandeur.lienParente
        ? d.demandeur.lienParente.replace(/_/g, ' ')
        : 'Ayant droit';
      const col2 = `${d.demandeur.nom.toUpperCase()} ${d.demandeur.prenoms || ''}\nLien : ${lienLabel}\nCIN : ${d.demandeur.cin || '—'}`;

      // 3. AGENT DÉFUNT
      const activiteLabel =
        d.defunt.statutActivite === 'RETRAITE_PENSIONNE'
          ? `Pensionné (N° ${d.defunt.numeroPension || '—'})`
          : 'En Activité';
      const col3 = `${d.defunt.nom.toUpperCase()} ${d.defunt.prenoms || ''}\n${d.defunt.ministereInstitution || 'Fonction Publique'}\n${activiteLabel}`;

      // 4. INDICE MATRICULE (IM)
      const col4 = `${d.defunt.im || '—'}`;

      // 5. ENVOI / RETOUR CF
      let col5 = '— Non envoyé';
      if (d.dateEnvoiCf) {
        col5 = `Envoyé le :\n${d.dateEnvoiCf}`;
        if (d.dateRetourCf) {
          col5 += `\n↩ Revenu le :\n${d.dateRetourCf}`;
        }
      }

      // 6. VISA CF ET DÉCISION
      let col6 = '— En attente';
      if (d.numVisaCf || d.numDecision || d.dateVisaCf) {
        const visa = d.numVisaCf ? `Visa CF : ${d.numVisaCf}` : 'Visa : Accordé';
        const dateVisa = d.dateVisaCf ? ` (${d.dateVisaCf})` : '';
        const dec = d.numDecision ? `Décision : ${d.numDecision}` : 'Décision : En cours';
        col6 = `${visa}${dateVisa}\n${dec}`;
      }

      // 7. MANDATEMENT ET MONTANT EN ARIARY
      let col7 = '— Non mandaté';
      const montantNum = d.montantMandat || d.montantSecours || 500000;
      const montantAffiche = montantNum.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
      if (d.dateMandatement || d.numMandat || d.refEngagement) {
        const eng = d.refEngagement ? `Engagé . ${d.refEngagement}\n` : '';
        const dateMandat = d.dateMandatement ? `Mandaté le . ${d.dateMandatement}\n` : '';
        const titreMandat = d.numMandat ? `Titre N° . ${d.numMandat}\n` : '';
        const montant = `Montant . ${montantAffiche} Ar`;
        col7 = `${eng}${dateMandat}${titreMandat}${montant}`;
      } else {
        col7 = `Prévu . ${montantAffiche} Ar\n(Non mandaté)`;
      }

      // 8. STATUT ET OBSERVATIONS
      let statutLisible = d.statut.replace(/_/g, ' ');
      if (d.statut === 'MANDATE') statutLisible = 'MANDATÉ ET PAYÉ';
      else if (d.statut === 'VALIDE_CF') statutLisible = 'VISÉ CF (VALIDE)';
      else if (d.statut === 'TRANSMIS_CF') statutLisible = 'TRANSMIS AU CF';
      else if (d.statut === 'RETOUR_CF') statutLisible = 'REVENU DU CF';
      else if (d.statut === 'DOSSIER_INCOMPLET') statutLisible = 'INCOMPLET (NÉGLIGEABLE)';

      let obs = statutLisible;
      if (d.motifRetourCf) {
        obs += `\nMotif CF : ${d.motifRetourCf}`;
      } else if (d.motifRejet) {
        obs += `\nRejet : ${d.motifRejet}`;
      } else if (d.observations) {
        obs += `\nObs : ${d.observations.substring(0, 70)}`;
      }

      return [col1, col2, col3, col4, col5, col6, col7, obs];
    });

    // -------------------------------------------------------------
    // 4. GÉNÉRATION DU TABLEAU AUTO-TABLE (8 COLONNES)
    // -------------------------------------------------------------
    autoTable(doc, {
      startY: 45,
      head: [
        [
          "1. N° DOSSIER\nET ARRIVÉE",
          "2. AYANT DROIT\nDEMANDEUR",
          "3. AGENT DÉFUNT\nET MINISTÈRE",
          "4. INDICE\nMATRICULE (IM)",
          "5. DATE ENVOI\nET RETOUR CF",
          "6. VISA DU CF\nET N° DÉCISION",
          "7. MANDATEMENT\nET MONTANT (AR)",
          "8. STATUT ET\nOBSERVATIONS",
        ],
      ],
      body: tableBody,
      theme: 'grid',
      styles: {
        fontSize: 7,
        cellPadding: 2,
        overflow: 'linebreak',
        lineColor: [203, 213, 225], // slate-300
        lineWidth: 0.2,
        textColor: [30, 41, 59],
        valign: 'middle',
      },
      headStyles: {
        fillColor: [30, 41, 59], // Slate-800
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 7.2,
        halign: 'center',
        valign: 'middle',
      },
      columnStyles: {
        0: { cellWidth: 26, halign: 'center', fontStyle: 'bold' }, // N° et Date Arrivée
        1: { cellWidth: 44 },                                       // Demandeur
        2: { cellWidth: 44 },                                       // Défunt
        3: { cellWidth: 20, halign: 'center', fontStyle: 'bold', textColor: [37, 99, 235] }, // IM
        4: { cellWidth: 28, halign: 'center' },                     // Envoi CF
        5: { cellWidth: 38 },                                       // Visa et Décision
        6: { cellWidth: 36 },                                       // Mandatement et Montant
        7: { cellWidth: 33 },                                       // Statut et Observations
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252], // slate-50
      },
      didDrawPage: (data) => {
        // PIED DE PAGE SOLENNEL SUR TOUTES LES PAGES
        const pageCount = (doc.internal as any).getNumberOfPages
          ? (doc.internal as any).getNumberOfPages()
          : (doc as any).internal.pages.length - 1;
        const currentPage = data.pageNumber;

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6.5);
        doc.setTextColor(100, 116, 139);

        // Ligne de séparation de pied de page
        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.2);
        doc.line(14, pageHeight - 8, pageWidth - 14, pageHeight - 8);

        // Mentions légales à gauche
        doc.text(
          "Direction des Pensions et de la Solde — Service des Secours et Allocations Décès — Document Officiel Administratif Normalisé",
          14,
          pageHeight - 4.5
        );

        // Numérotation à droite
        doc.text(
          `Page ${currentPage} sur ${pageCount}`,
          pageWidth - 14,
          pageHeight - 4.5,
          { align: 'right' }
        );
      },
      margin: { top: 45, left: 14, right: 14, bottom: 20 },
    });

    // -------------------------------------------------------------
    // 5. BLOC DES SIGNATURES OFFICIELLES (Sur la dernière page)
    // -------------------------------------------------------------
    const finalY = (doc as any).lastAutoTable?.finalY || 150;
    const needNewPageForSignatures = finalY > pageHeight - 35;

    if (needNewPageForSignatures) {
      doc.addPage();
    }

    const sigY = needNewPageForSignatures ? 30 : finalY + 8;

    // Cadre récapitulatif financier
    const montantTotal = dossiers.reduce((acc, d) => acc + (d.montantMandat || d.montantSecours || 500000), 0);
    const montantTotalStr = montantTotal.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    const totalMandates = dossiers.filter((d) => d.statut === 'MANDATE').length;
    const totalVisas = dossiers.filter((d) => d.statut === 'VALIDE_CF' || d.statut === 'ENGAGE' || d.statut === 'MANDATE' || !!d.numVisaCf).length;

    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(14, sigY, pageWidth - 28, 9, 1.5, 1.5, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.8);
    doc.setTextColor(15, 23, 42);
    const resumeText = `TOTAL REGISTRE . ${dossiers.length} DOSSIERS   .   VISÉS CF . ${totalVisas}   .   MANDATÉS . ${totalMandates}   .   MONTANT TOTAL . ${montantTotalStr} ARIARY`;
    doc.text(resumeText, pageWidth / 2, sigY + 5.5, { align: 'center' });

    // Emplacements pour les 3 signatures officielles
    const sigBoxY = sigY + 13;
    const colWidth = (pageWidth - 28) / 3;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(30, 41, 59);

    // Signataire 1
    doc.text("L'Agent Instructeur . Enquêteur", 14 + colWidth / 2, sigBoxY, { align: 'center' });
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    doc.text('(Signature . Date)', 14 + colWidth / 2, sigBoxY + 3.5, { align: 'center' });

    // Signataire 2
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(30, 41, 59);
    doc.text("Le Contrôleur Financier . CF", 14 + colWidth + colWidth / 2, sigBoxY, { align: 'center' });
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    doc.text('(Visa . Cachet . Date)', 14 + colWidth + colWidth / 2, sigBoxY + 3.5, { align: 'center' });

    // Signataire 3
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(30, 41, 59);
    doc.text("Le Trésorier Général . Agent Comptable", 14 + colWidth * 2 + colWidth / 2, sigBoxY, { align: 'center' });
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    doc.text('(Prise en charge . Paiement Trésor)', 14 + colWidth * 2 + colWidth / 2, sigBoxY + 3.5, { align: 'center' });

    // -------------------------------------------------------------
    // 6. ENREGISTREMENT ET TÉLÉCHARGEMENT DIRECT DU FICHIER .PDF
    // -------------------------------------------------------------
    const dateStr = today.toISOString().slice(0, 10);
    const sanitizedTitle = (options?.titrePersonnalise || `REGISTRE_OFFICIEL_SECOURS_DECES_${currentYear}`)
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .replace(/_+/g, '_')
      .substring(0, 45);

    const fileName =
      options?.nomFichier ||
      `${sanitizedTitle}_MEF_DPS_${dateStr}.pdf`;

    doc.save(fileName);
  }

  /**
   * Ouvre une fenêtre d'impression avec le document officiel complet
   * permettant l'impression haute définition ou la sauvegarde en PDF via le navigateur.
   */
  static printRegistreHtml(dossiers: DossierSecours[], filtreActif?: string) {
    const today = new Date();
    const dateStr = today.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
    const timeStr = today.toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
    });

    const rowsHtml = dossiers
      .map((d, idx) => {
        const montantNum = d.montantMandat || d.montantSecours || 500000;
        const montantAffiche = montantNum.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
        let statutBadge = d.statut.replace(/_/g, ' ');
        if (d.statut === 'MANDATE') statutBadge = 'MANDATÉ ET PAYÉ';
        else if (d.statut === 'VALIDE_CF') statutBadge = 'VISÉ CF';
        else if (d.statut === 'TRANSMIS_CF') statutBadge = 'TRANSMIS CF';
        else if (d.statut === 'RETOUR_CF') statutBadge = 'REVENU DU CF';

        return `
          <tr>
            <td style="text-align: center; font-weight: bold; font-family: monospace;">
              ${d.numeroDossier}<br/>
              <span style="font-size: 8px; color: #555;">${d.dateArrivee || '—'}</span>
            </td>
            <td>
              <strong>${d.demandeur.nom.toUpperCase()} ${d.demandeur.prenoms || ''}</strong><br/>
              <span style="font-size: 8.5px; color: #444;">Lien : ${d.demandeur.lienParente}</span><br/>
              <span style="font-size: 8px; color: #666;">CIN : ${d.demandeur.cin || '—'}</span>
            </td>
            <td>
              <strong>${d.defunt.nom.toUpperCase()} ${d.defunt.prenoms || ''}</strong><br/>
              <span style="font-size: 8.5px; color: #333;">${d.defunt.ministereInstitution || 'Fonction Publique'}</span><br/>
              <span style="font-size: 8px; color: #555;">${d.defunt.statutActivite === 'RETRAITE_PENSIONNE' ? `Retraité (N° ${d.defunt.numeroPension || '—'})` : 'En Activité'}</span>
            </td>
            <td style="text-align: center; font-family: monospace; font-weight: bold; color: #1e40af;">
              ${d.defunt.im || '—'}
            </td>
            <td style="text-align: center; font-size: 8.5px;">
              ${d.dateEnvoiCf ? `Envoyé le :<br/><strong>${d.dateEnvoiCf}</strong>` : '<span style="color: #999;">— Non envoyé</span>'}
              ${d.dateRetourCf ? `<br/><span style="color: #c2410c;">↩ Revenu : ${d.dateRetourCf}</span>` : ''}
            </td>
            <td style="font-size: 8.5px;">
              ${d.numVisaCf ? `<strong>Visa :</strong> ${d.numVisaCf}` : '<span style="color: #999;">Visa en attente</span>'}<br/>
              ${d.numDecision ? `<strong>Décision :</strong> ${d.numDecision}` : '<span style="color: #999;">Décision : —</span>'}
            </td>
            <td style="font-size: 8.5px;">
              ${d.refEngagement ? `<span style="color: #3730a3;">Eng . ${d.refEngagement}</span><br/>` : ''}
              ${d.numMandat ? `Mandat . <strong>${d.numMandat}</strong><br/>` : ''}
              <strong style="color: #065f46;">${montantAffiche} Ar</strong>
            </td>
            <td style="font-size: 8.5px;">
              <strong>${statutBadge}</strong>
              ${d.motifRetourCf ? `<br/><span style="color: #b45309; font-size: 8px;">Obs : ${d.motifRetourCf}</span>` : ''}
              ${d.motifRejet ? `<br/><span style="color: #b91c1c; font-size: 8px;">Rejet : ${d.motifRejet}</span>` : ''}
            </td>
          </tr>
        `;
      })
      .join('');

    const montantTotal = dossiers.reduce((acc, d) => acc + (d.montantMandat || d.montantSecours || 500000), 0);
    const montantTotalStr = montantTotal.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    const totalMandates = dossiers.filter((d) => d.statut === 'MANDATE').length;
    const totalVisas = dossiers.filter((d) => d.statut === 'VALIDE_CF' || d.statut === 'ENGAGE' || d.statut === 'MANDATE' || !!d.numVisaCf).length;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>REGISTRE OFFICIEL NORMALISÉ — DIRECTION DES PENSIONS ET DE LA SOLDE</title>
        <meta charset="utf-8" />
        <style>
          @page {
            size: A4 landscape;
            margin: 10mm;
          }
          body {
            font-family: Arial, Helvetica, sans-serif;
            color: #0f172a;
            margin: 0;
            padding: 0;
            font-size: 10px;
          }
          .header-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 12px;
          }
          .header-table td {
            vertical-align: top;
          }
          .title-box {
            border: 1.5px solid #1e293b;
            background: #f8fafc;
            padding: 8px 12px;
            text-align: center;
            border-radius: 4px;
            margin-bottom: 12px;
          }
          .title-box h1 {
            margin: 0;
            font-size: 14px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            color: #0f172a;
          }
          .title-box p {
            margin: 4px 0 0 0;
            font-size: 9px;
            color: #475569;
          }
          .main-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 9px;
          }
          .main-table th {
            background: #1e293b;
            color: #ffffff;
            font-weight: bold;
            padding: 6px 4px;
            border: 1px solid #0f172a;
            text-align: center;
            font-size: 8.5px;
          }
          .main-table td {
            border: 1px solid #cbd5e1;
            padding: 5px 4px;
            vertical-align: middle;
          }
          .main-table tr:nth-child(even) {
            background: #f8fafc;
          }
          .summary-box {
            margin-top: 10px;
            padding: 6px;
            background: #f1f5f9;
            border: 1px solid #cbd5e1;
            font-weight: bold;
            font-size: 9px;
            text-align: center;
            border-radius: 4px;
          }
          .signatures-table {
            width: 100%;
            margin-top: 18px;
            border-collapse: collapse;
            page-break-inside: avoid;
          }
          .signatures-table td {
            width: 33.33%;
            text-align: center;
            vertical-align: top;
            padding: 0 10px;
          }
          .sig-title {
            font-weight: bold;
            font-size: 9.5px;
            margin-bottom: 2px;
          }
          .sig-sub {
            font-style: italic;
            font-size: 8px;
            color: #64748b;
          }
          .sig-space {
            height: 45px;
          }
          @media print {
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          }
        </style>
      </head>
      <body>
        <table class="header-table">
          <tr>
            <td style="width: 35%;">
              <strong>MINISTÈRE DE L'ÉCONOMIE ET DES FINANCES</strong><br/>
              DIRECTION GÉNÉRALE DES OPÉRATIONS FINANCIÈRES<br/>
              <strong>DIRECTION DES PENSIONS ET DE LA SOLDE (DPS)</strong><br/>
              <span style="font-size: 8.5px; color: #555;">Service des Pensions et Secours au Décès</span>
            </td>
            <td style="width: 30%; text-align: center;">
              <strong style="font-size: 11px;">REPOBLIKAN'I MADAGASIKARA</strong><br/>
              <span style="font-style: italic; font-size: 9px;">Fitiavana - Tanindrazana - Fandrosoana</span><br/>
              <div style="width: 50px; height: 1px; background: #000; margin: 4px auto;"></div>
            </td>
            <td style="width: 35%; text-align: right;">
              <strong>Antananarivo, le ${dateStr}</strong><br/>
              <span style="font-size: 8.5px; color: #555;">Heure d'édition : ${timeStr}</span><br/>
              <strong>Réf. : DPS-MEF/REG-8COL/${today.getFullYear()}</strong><br/>
              <span style="font-size: 8.5px;">Nombre de dossiers : ${dossiers.length}</span>
            </td>
          </tr>
        </table>

        <div class="title-box">
          <h1>REGISTRE OFFICIEL NORMALISÉ DES DOSSIERS DE SECOURS AUX DÉCÈS</h1>
          <p>Suivi Réglementaire en 8 Colonnes — ${filtreActif ? `Filtre actif : ${filtreActif}` : 'Tous dossiers consignés'} — Direction des Pensions et de la Solde</p>
        </div>

        <table class="main-table">
          <thead>
            <tr>
              <th style="width: 9%;">1. N° DOSSIER<br/>ET ARRIVÉE</th>
              <th style="width: 17%;">2. AYANT DROIT<br/>DEMANDEUR</th>
              <th style="width: 17%;">3. AGENT DÉFUNT<br/>ET MINISTÈRE</th>
              <th style="width: 8%;">4. INDICE<br/>MATRICULE</th>
              <th style="width: 11%;">5. DATE ENVOI<br/>ET RETOUR CF</th>
              <th style="width: 14%;">6. VISA DU CF<br/>ET N° DÉCISION</th>
              <th style="width: 12%;">7. MANDATEMENT<br/>ET MONTANT (AR)</th>
              <th style="width: 12%;">8. STATUT ET<br/>OBSERVATIONS</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>

        <div class="summary-box">
          TOTAL DOSSIERS . ${dossiers.length} DOSSIERS &nbsp;|&nbsp; VISÉS CF . ${totalVisas} &nbsp;|&nbsp; MANDATÉS . ${totalMandates} &nbsp;|&nbsp; MONTANT TOTAL . ${montantTotalStr} ARIARY
        </div>

        <table class="signatures-table">
          <tr>
            <td>
              <div class="sig-title">L'Agent Instructeur . Enquêteur</div>
              <div class="sig-sub">(Signature . Date)</div>
              <div class="sig-space"></div>
            </td>
            <td>
              <div class="sig-title">Le Contrôleur Financier . CF</div>
              <div class="sig-sub">(Visa . Cachet . Date)</div>
              <div class="sig-space"></div>
            </td>
            <td>
              <div class="sig-title">Le Trésorier Général . Agent Comptable</div>
              <div class="sig-sub">(Prise en charge . Paiement Trésor)</div>
              <div class="sig-space"></div>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;

    const printWin = window.open('', '_blank', 'width=1100,height=800');
    if (printWin) {
      printWin.document.open();
      printWin.document.write(htmlContent);
      printWin.document.close();
      printWin.focus();
      setTimeout(() => {
        printWin.print();
      }, 350);
    }
  }
}
