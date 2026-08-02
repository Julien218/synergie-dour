/**
 * Synergie Dour — Génération PDF
 * Côté serveur, déterministe, ADN visuel Synergie Dour
 * Conçu par Js-Innov.IA — www.jsinnovia.com
 */
import { createHash } from "crypto";
import { existsSync } from "node:fs";
import path from "node:path";
import PDFDocument from "pdfkit";

export interface PdfLineItem {
  description: string;
  quantity: string;
  unit: string;
  unitPriceCents: number;
  vatRate: string;
  lineTotalCents: number;
}

export interface PdfData {
  documentType: "quote" | "invoice" | "credit_note";
  number: string;
  issueDate: string;
  dueDate?: string;
  validUntil?: string;
  // Émetteur
  emitter: {
    legalName: string;
    address: string;
    bceNumber?: string;
    vatNumber?: string;
    vatExempt?: boolean;
    iban?: string;
    bic?: string;
    email: string;
    phone?: string;
    signatoryName?: string;
    signatoryRole?: string;
    legalMentions?: string;
  };
  // Client
  client: {
    name: string;
    address: string;
    vatNumber?: string;
  };
  // Lignes
  lines: PdfLineItem[];
  // Totaux (cents)
  subtotalCents: number;
  vatTotalCents: number;
  totalCents: number;
  currency: string;
  // Méta
  notes?: string;
  conditions?: string;
  structuredReference?: string;
  createdBy?: string;
}

const NAVY = "#001533";
const GOLD = "#D4AF37";

/** Génère le vrai fichier PDF joint aux emails et téléchargeable par le client. */
export function generatePdfBuffer(data: PdfData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: "A4",
      margin: 48,
      info: {
        Title: `${data.documentType} ${data.number}`,
        Author: "Synergie Dour ASBL",
        Subject: "Document de facturation",
      },
    });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const fontDirectory = path.join(
      process.cwd(),
      "node_modules",
      "katex",
      "dist",
      "fonts"
    );
    const regularFontPath = path.join(
      fontDirectory,
      "KaTeX_SansSerif-Regular.ttf"
    );
    const boldFontPath = path.join(fontDirectory, "KaTeX_SansSerif-Bold.ttf");
    const regularFont = existsSync(regularFontPath)
      ? "SynergieSans"
      : "Helvetica";
    const boldFont = existsSync(boldFontPath)
      ? "SynergieSansBold"
      : "Helvetica-Bold";
    if (regularFont === "SynergieSans") {
      doc.registerFont(regularFont, regularFontPath);
    }
    if (boldFont === "SynergieSansBold") {
      doc.registerFont(boldFont, boldFontPath);
    }

    const title =
      data.documentType === "quote"
        ? "DEVIS"
        : data.documentType === "credit_note"
          ? "NOTE DE CRÉDIT"
          : "FACTURE";
    const euro = (cents: number) =>
      new Intl.NumberFormat("fr-BE", {
        style: "currency",
        currency: data.currency || "EUR",
      }).format(cents / 100);

    const logoPath = path.join(
      process.cwd(),
      "client",
      "public",
      "logo-sd-transparent.png"
    );
    if (existsSync(logoPath)) {
      doc.image(logoPath, 48, 40, { fit: [76, 76] });
    }

    doc
      .fillColor(NAVY)
      .font(boldFont)
      .fontSize(18)
      .text("SYNERGIE DOUR", 134, 49)
      .font(regularFont)
      .fontSize(9)
      .fillColor("#555555")
      .text(data.emitter.legalName, 134, 73)
      .text(data.emitter.address, 134, 87)
      .text(`N° d'entreprise : ${data.emitter.bceNumber || "1036.801.623"}`, 134, 101);

    doc
      .font(boldFont)
      .fontSize(24)
      .fillColor(NAVY)
      .text(title, 360, 48, { width: 187, align: "right" })
      .fontSize(11)
      .fillColor(GOLD)
      .text(data.number, 360, 78, { width: 187, align: "right" })
      .font(regularFont)
      .fillColor("#555555")
      .fontSize(9)
      .text(`Date : ${data.issueDate}`, 360, 98, {
        width: 187,
        align: "right",
      });
    const secondaryDate = data.dueDate
      ? `Échéance : ${data.dueDate}`
      : data.validUntil
        ? `Valable jusqu'au : ${data.validUntil}`
        : "";
    if (secondaryDate) {
      doc.text(secondaryDate, 360, 112, { width: 187, align: "right" });
    }

    doc
      .moveTo(48, 128)
      .lineTo(547, 128)
      .lineWidth(2)
      .strokeColor(NAVY)
      .stroke();

    doc
      .font(boldFont)
      .fontSize(9)
      .fillColor("#777777")
      .text("DESTINATAIRE", 48, 148)
      .fontSize(12)
      .fillColor(NAVY)
      .text(data.client.name, 48, 164)
      .font(regularFont)
      .fontSize(9)
      .fillColor("#333333")
      .text(data.client.address, 48, 182, { width: 230 });
    if (data.client.vatNumber) {
      doc.text(`TVA : ${data.client.vatNumber}`, 48, 207);
    }

    const tableTop = 242;
    const columns = {
      description: 48,
      quantity: 322,
      unitPrice: 375,
      vat: 451,
      total: 492,
    };
    const drawTableHeader = (top: number) => {
      doc
        .rect(48, top, 499, 24)
        .fill(NAVY)
        .fillColor(GOLD)
        .font(boldFont)
        .fontSize(8)
        .text("DESCRIPTION", columns.description + 6, top + 8)
        .text("QTÉ", columns.quantity, top + 8, { width: 42, align: "center" })
        .text("PRIX U.", columns.unitPrice, top + 8, {
          width: 66,
          align: "right",
        })
        .text("TVA", columns.vat, top + 8, { width: 34, align: "center" })
        .text("TOTAL HT", columns.total, top + 8, {
          width: 49,
          align: "right",
        });
    };
    drawTableHeader(tableTop);

    let y = tableTop + 32;
    for (const line of data.lines) {
      if (y > 650) {
        doc.addPage();
        drawTableHeader(48);
        y = 80;
      }
      doc
        .font(regularFont)
        .fontSize(8.5)
        .fillColor("#333333")
        .text(line.description, columns.description + 6, y, {
          width: 258,
          height: 30,
          ellipsis: true,
        })
        .text(String(line.quantity), columns.quantity, y, {
          width: 42,
          align: "center",
        })
        .text(euro(line.unitPriceCents), columns.unitPrice, y, {
          width: 66,
          align: "right",
        })
        .text(`${line.vatRate}%`, columns.vat, y, {
          width: 34,
          align: "center",
        })
        .text(euro(line.lineTotalCents), columns.total, y, {
          width: 49,
          align: "right",
        });
      doc
        .moveTo(48, y + 26)
        .lineTo(547, y + 26)
        .lineWidth(0.5)
        .strokeColor("#DDDDDD")
        .stroke();
      y += 34;
    }

    if (y > 560) {
      doc.addPage();
      y = 58;
    } else {
      y = Math.max(y + 12, 370);
    }
    const totalsX = 350;
    doc
      .font(regularFont)
      .fontSize(9)
      .fillColor("#333333")
      .text("Sous-total HT", totalsX, y, { width: 105 })
      .text(euro(data.subtotalCents), 455, y, { width: 92, align: "right" })
      .text("TVA", totalsX, y + 18, { width: 105 })
      .text(euro(data.vatTotalCents), 455, y + 18, {
        width: 92,
        align: "right",
      });
    doc
      .moveTo(totalsX, y + 39)
      .lineTo(547, y + 39)
      .lineWidth(1.5)
      .strokeColor(NAVY)
      .stroke()
      .font(boldFont)
      .fontSize(11)
      .fillColor(NAVY)
      .text("TOTAL", totalsX, y + 48, { width: 105 })
      .text(euro(data.totalCents), 455, y + 48, {
        width: 92,
        align: "right",
      });

    const paymentY = y + 88;
    if (data.structuredReference || data.emitter.iban) {
      doc
        .roundedRect(48, paymentY, 499, 58, 5)
        .fill("#F4F6F9")
        .fillColor(NAVY)
        .font(boldFont)
        .fontSize(9)
        .text("INFORMATIONS DE PAIEMENT", 62, paymentY + 10)
        .font(regularFont)
        .fillColor("#333333")
        .text(
          [
            data.emitter.iban ? `IBAN : ${data.emitter.iban}` : "",
            data.emitter.bic ? `BIC : ${data.emitter.bic}` : "",
            data.structuredReference
              ? `Communication : ${data.structuredReference}`
              : "",
          ]
            .filter(Boolean)
            .join("   ·   "),
          62,
          paymentY + 30,
          { width: 470 }
        );
    }

    const legalY = Math.min(paymentY + 82, 735);
    doc
      .font(regularFont)
      .fontSize(7.5)
      .fillColor("#666666")
      .text(
        data.emitter.legalMentions ||
          "Synergie Dour ASBL — Grand'Place 9, 7370 Dour — N° d'entreprise 1036.801.623",
        48,
        legalY,
        { width: 499, align: "center" }
      );
    doc.end();
  });
}

/** Génère un PDF en HTML simple pour rendu via puppeteer ou similaire */
export function generatePdfHtml(data: PdfData): string {
  const docTitle = data.documentType === "quote"
    ? "DEVIS"
    : data.documentType === "credit_note"
    ? "NOTE DE CRÉDIT"
    : "FACTURE";

  const formatEuro = (cents: number) =>
    new Intl.NumberFormat("fr-BE", { style: "currency", currency: "EUR" }).format(cents / 100);

  const linesHtml = data.lines.map((line, i) => `
    <tr>
      <td>${i + 1}</td>
      <td>${escapeHtml(line.description)}</td>
      <td style="text-align:center">${line.quantity}</td>
      <td style="text-align:center">${escapeHtml(line.unit)}</td>
      <td style="text-align:right">${formatEuro(line.unitPriceCents)}</td>
      <td style="text-align:center">${line.vatRate}%</td>
      <td style="text-align:right">${formatEuro(line.lineTotalCents)}</td>
    </tr>`).join("");

  const vatMention = data.emitter.vatExempt
    ? "TVA non applicable — régime à confirmer par le comptable"
    : data.emitter.vatNumber
    ? `TVA: ${data.emitter.vatNumber}`
    : "";

  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<title>${docTitle} ${data.number}</title>
<style>
  @page { size: A4; margin: 2cm; }
  body { font-family: 'Helvetica', sans-serif; color: #333; font-size: 11px; }
  .header { display: flex; justify-content: space-between; margin-bottom: 30px; border-bottom: 3px solid #001533; padding-bottom: 15px; }
  .logo { font-size: 24px; font-weight: bold; color: #001533; }
  .logo span { color: #E8C547; }
  .doc-title { font-size: 28px; font-weight: bold; color: #001533; text-align: right; }
  .doc-number { font-size: 14px; color: #E8C547; font-weight: bold; }
  .parties { display: flex; justify-content: space-between; margin-bottom: 25px; }
  .party { width: 48%; }
  .party-label { font-size: 9px; color: #999; text-transform: uppercase; margin-bottom: 5px; }
  .party-content { font-size: 11px; line-height: 1.5; }
  .party-content strong { color: #001533; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
  th { background: #001533; color: #E8C547; padding: 8px; font-size: 10px; text-transform: uppercase; }
  td { padding: 8px; border-bottom: 1px solid #ddd; }
  .totals { margin-left: auto; width: 300px; margin-bottom: 20px; }
  .totals td { padding: 5px; border: none; }
  .totals .total-row { font-weight: bold; border-top: 2px solid #001533; padding-top: 8px; color: #001533; }
  .payment-info { background: #f8f8f8; padding: 15px; border-left: 3px solid #E8C547; margin-bottom: 15px; }
  .payment-info strong { color: #001533; }
  .legal-mentions { font-size: 9px; color: #666; margin-top: 20px; border-top: 1px solid #ddd; padding-top: 10px; }
  .signature-area { margin-top: 30px; display: flex; justify-content: space-between; }
  .signature-box { width: 45%; border: 1px solid #ddd; padding: 10px; text-align: center; }
  .doc-hash { font-size: 8px; color: #999; margin-top: 15px; }
  .footer { position: fixed; bottom: 1cm; left: 2cm; right: 2cm; border-top: 1px solid #ddd; padding-top: 5px; font-size: 9px; color: #666; display: flex; justify-content: space-between; }
</style>
</head>
<body>
  <div class="header">
    <div>
      <div class="logo">Synergie <span>Dour</span></div>
      <div style="font-size:10px;color:#666;margin-top:5px">${escapeHtml(data.emitter.legalName)}</div>
      <div style="font-size:10px;color:#666">${escapeHtml(data.emitter.address)}</div>
      ${data.emitter.phone ? `<div style="font-size:10px;color:#666">Tél: ${escapeHtml(data.emitter.phone)}</div>` : ""}
      <div style="font-size:10px;color:#666">${escapeHtml(data.emitter.email)}</div>
      ${vatMention ? `<div style="font-size:10px;color:#666">${escapeHtml(vatMention)}</div>` : ""}
    </div>
    <div>
      <div class="doc-title">${docTitle}</div>
      <div class="doc-number">${data.number}</div>
      <div style="font-size:10px;color:#666;margin-top:5px">Date: ${data.issueDate}</div>
      ${data.dueDate ? `<div style="font-size:10px;color:#666">Échéance: ${data.dueDate}</div>` : ""}
      ${data.validUntil ? `<div style="font-size:10px;color:#666">Valide jusqu'au: ${data.validUntil}</div>` : ""}
    </div>
  </div>

  <div class="parties">
    <div class="party">
      <div class="party-label">Émetteur</div>
      <div class="party-content">
        <strong>${escapeHtml(data.emitter.legalName)}</strong><br>
        ${escapeHtml(data.emitter.address)}<br>
        ${data.emitter.vatNumber ? `TVA: ${escapeHtml(data.emitter.vatNumber)}<br>` : ""}
        ${data.emitter.iban ? `IBAN: ${escapeHtml(data.emitter.iban)}<br>` : ""}
        ${data.emitter.bic ? `BIC: ${escapeHtml(data.emitter.bic)}<br>` : ""}
      </div>
    </div>
    <div class="party">
      <div class="party-label">Destinataire</div>
      <div class="party-content">
        <strong>${escapeHtml(data.client.name)}</strong><br>
        ${escapeHtml(data.client.address)}<br>
        ${data.client.vatNumber ? `TVA: ${escapeHtml(data.client.vatNumber)}<br>` : ""}
      </div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>#</th><th>Description</th><th>Qté</th><th>Unité</th><th>P.U.</th><th>TVA</th><th>Total HT</th>
      </tr>
    </thead>
    <tbody>${linesHtml}</tbody>
  </table>

  <table class="totals">
    <tr><td>Sous-total HT</td><td style="text-align:right">${formatEuro(data.subtotalCents)}</td></tr>
    <tr><td>TVA</td><td style="text-align:right">${formatEuro(data.vatTotalCents)}</td></tr>
    <tr class="total-row"><td>Total TTC</td><td style="text-align:right">${formatEuro(data.totalCents)}</td></tr>
  </table>

  ${data.structuredReference ? `
  <div class="payment-info">
    <strong>Communication de paiement:</strong> ${data.structuredReference}<br>
    <strong>IBAN:</strong> ${data.emitter.iban || "N/A"}<br>
    <strong>BIC:</strong> ${data.emitter.bic || "N/A"}
  </div>` : ""}

  ${data.notes ? `<div><strong>Notes:</strong><br>${escapeHtml(data.notes)}</div>` : ""}
  ${data.conditions ? `<div style="margin-top:10px"><strong>Conditions:</strong><br>${escapeHtml(data.conditions)}</div>` : ""}

  <div class="signature-area">
    <div class="signature-box">
      <div style="font-size:10px;color:#999;margin-bottom:15px">Pour ${escapeHtml(data.emitter.legalName)}</div>
      ${data.emitter.signatoryName ? `<div style="font-weight:bold">${escapeHtml(data.emitter.signatoryName)}</div>` : ""}
      ${data.emitter.signatoryRole ? `<div style="font-size:10px">${escapeHtml(data.emitter.signatoryRole)}</div>` : ""}
      <div style="margin-top:20px;font-size:9px;color:#999">Date et signature</div>
    </div>
    <div class="signature-box">
      <div style="font-size:10px;color:#999;margin-bottom:15px">Bon pour accord</div>
      <div style="margin-top:20px;font-size:9px;color:#999">Date, nom et signature</div>
    </div>
  </div>

  ${data.emitter.legalMentions ? `<div class="legal-mentions">${escapeHtml(data.emitter.legalMentions)}</div>` : ""}

  <div class="doc-hash">
    Hash: ${createHash("sha256").update(JSON.stringify(data)).digest("hex").substring(0, 16)}... |
    Généré par: ${data.createdBy || "Système"} |
    ${new Date().toISOString()}
  </div>

  <div class="footer">
    <div>${escapeHtml(data.emitter.legalName)} — ${escapeHtml(data.emitter.address)}</div>
    <div>Page 1/1</div>
  </div>
</body>
</html>`;
}

/** Génère le XML UBL pour Peppol (EN 16931) */
export function generateUblXml(data: PdfData): string {
  const vatNote = data.emitter.vatExempt
    ? "Non assujetti à la TVA"
    : "";

  const linesXml = data.lines.map((line, i) => `    <cac:InvoiceLine>
      <cbc:ID>${i + 1}</cbc:ID>
      <cbc:InvoicedQuantity unitQuantityCode="${escapeXml(line.unit)}">${line.quantity}</cbc:InvoicedQuantity>
      <cbc:LineExtensionAmount currencyID="${data.currency}">${(line.lineTotalCents / 100).toFixed(2)}</cbc:LineExtensionAmount>
      <cac:Item>
        <cbc:Description>${escapeXml(line.description)}</cbc:Description>
        <cbc:Name>${escapeXml(line.description.substring(0, 60))}</cbc:Name>
        <cac:ClassifiedTaxCategory>
          <cbc:ID>${line.vatRate === "0" ? "Z" : "S"}</cbc:ID>
          <cbc:Percent>${line.vatRate}</cbc:Percent>
          <cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme>
        </cac:ClassifiedTaxCategory>
      </cac:Item>
      <cac:Price>
        <cbc:PriceAmount currencyID="${data.currency}">${(line.unitPriceCents / 100).toFixed(2)}</cbc:PriceAmount>
      </cac:Price>
    </cac:InvoiceLine>`).join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"
         xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
         xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">
  <cbc:CustomizationID>urn:cen.eu:en16931:2017</cbc:CustomizationID>
  <cbc:ProfileID>urn:fdc:peppol.eu:2017:poaccbilling:01:1.0</cbc:ProfileID>
  <cbc:ID>${escapeXml(data.number)}</cbc:ID>
  <cbc:IssueDate>${data.issueDate}</cbc:IssueDate>
  ${data.dueDate ? `<cbc:DueDate>${data.dueDate}</cbc:DueDate>` : ""}
  <cbc:InvoiceTypeCode>380</cbc:InvoiceTypeCode>
  <cbc:DocumentCurrencyCode>${data.currency}</cbc:DocumentCurrencyCode>
  <cac:AccountingSupplierParty>
    <cac:Party>
      <cac:PartyName><cbc:Name>${escapeXml(data.emitter.legalName)}</cbc:Name></cac:PartyName>
      <cac:PostalAddress>
        <cbc:StreetName>${escapeXml(data.emitter.address)}</cbc:StreetName>
        <cbc:Country><cbc:IdentificationCode>BE</cbc:IdentificationCode></cbc:Country>
      </cac:PostalAddress>
      <cac:PartyTaxScheme>
        <cbc:CompanyID>${escapeXml(data.emitter.vatNumber || "")}</cbc:CompanyID>
        <cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme>
      </cac:PartyTaxScheme>
    </cac:Party>
  </cac:AccountingSupplierParty>
  <cac:AccountingCustomerParty>
    <cac:Party>
      <cac:PartyName><cbc:Name>${escapeXml(data.client.name)}</cbc:Name></cac:PartyName>
      <cac:PostalAddress>
        <cbc:StreetName>${escapeXml(data.client.address)}</cbc:StreetName>
        <cbc:Country><cbc:IdentificationCode>BE</cbc:IdentificationCode></cbc:Country>
      </cac:PostalAddress>
      ${data.client.vatNumber ? `<cac:PartyTaxScheme><cbc:CompanyID>${escapeXml(data.client.vatNumber)}</cbc:CompanyID><cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme></cac:PartyTaxScheme>` : ""}
    </cac:Party>
  </cac:AccountingCustomerParty>
  <cac:LegalMonetaryTotal>
    <cbc:LineExtensionAmount currencyID="${data.currency}">${(data.subtotalCents / 100).toFixed(2)}</cbc:LineExtensionAmount>
    <cbc:TaxExclusiveAmount currencyID="${data.currency}">${(data.subtotalCents / 100).toFixed(2)}</cbc:TaxExclusiveAmount>
    <cbc:TaxInclusiveAmount currencyID="${data.currency}">${(data.totalCents / 100).toFixed(2)}</cbc:TaxInclusiveAmount>
    <cbc:PayableAmount currencyID="${data.currency}">${(data.totalCents / 100).toFixed(2)}</cbc:PayableAmount>
  </cac:LegalMonetaryTotal>
${linesXml}
</Invoice>`;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}
function escapeXml(s: string): string {
  return s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&apos;");
}
