# n8n-nodes-invoapi

n8n-Node für [invoapi.de](https://invoapi.de): E-Rechnungen im Workflow **erzeugen, prüfen, auslesen und umwandeln**. XRechnung, ZUGFeRD / Factur-X, EN 16931, UBL, CII und Peppol, geprüft mit den offiziellen Regelwerken (KoSIT).

## Installation

**In n8n (selbst betrieben):** *Settings → Community Nodes → Install* und als Paketnamen `n8n-nodes-invoapi` eintragen.

Oder im Terminal:

```bash
npm install n8n-nodes-invoapi
```

(im Ordner `~/.n8n/nodes`, danach n8n neu starten)

Danach unter **Credentials → Neu → invoapi API** den API-Schlüssel aus dem [invoapi-Dashboard](https://invoapi.de/dashboard) eintragen. Den Schlüssel prüft n8n beim Speichern; das kostet kein Kontingent.

## Operationen

| Operation | Eingabe | Ausgabe |
|---|---|---|
| **Rechnung erzeugen** | Rechnungsdaten als JSON | XML oder ZUGFeRD-PDF als Datei, plus Prüfergebnis |
| **E-Rechnung prüfen** | XML- oder PDF-Datei | gültig ja/nein, Fehler mit Regel und Erklärung |
| **Auslesen** | XML- oder PDF-Datei | Rechnungsdaten als JSON (Verkäufer, Käufer, Positionen, Summen) |
| **Format erkennen** | XML- oder PDF-Datei | Standard, Syntax, Version |
| **Umwandeln** | XML- oder PDF-Datei | anderes Format (z. B. XRechnung UBL → CII oder → ZUGFeRD-PDF), HTML oder JSON |
| **Summen berechnen** | Rechnungsdaten als JSON | Netto, USt, Brutto, kostenlos |

Dateien kommen und gehen als normale n8n-Binärdaten, zum Beispiel direkt aus einem E-Mail-Anhang (IMAP, Gmail, Outlook) oder in Google Drive, Dropbox und Co.

## Beispiel-Workflows

**Eingangsrechnungen automatisch prüfen**
E-Mail-Trigger (Anhang) → **invoapi: E-Rechnung prüfen** → IF `valid` → gültig: in den Buchhaltungsordner ablegen; ungültig: Rückfrage an den Absender mit den Fehlern aus `errors`.

**Rechnungen aus Shop oder CRM als XRechnung**
Webhook / Shop-Trigger → Set (Felder auf invoapi-Format bringen) → **invoapi: Rechnung erzeugen** → E-Mail mit Anhang an den Kunden.

**Ausgelesene Rechnungen in eine Tabelle**
Ordner-Trigger → **invoapi: Auslesen** → Google Sheets / Airtable: Rechnungsnummer, Datum, Lieferant, Brutto.

## Rechnungsdaten

Die Operationen *Rechnung erzeugen* und *Summen berechnen* nehmen die Rechnung entweder aus dem JSON des eingehenden Elements oder aus einem JSON-Feld. Das Format ist das der invoapi-API:

```json
{
  "invoice_number": "RE-2026-0001",
  "issue_date": "2026-10-28",
  "due_date": "2026-11-27",
  "currency": "EUR",
  "buyer_reference": "04011000-12345-34",
  "seller": { "name": "Muster GmbH", "street": "Musterstraße 1", "postal_code": "10115", "city": "Berlin",
              "country_code": "DE", "vat_id": "DE123456789", "email": "rechnung@muster.de", "phone": "+49 30 1234567" },
  "buyer":  { "name": "Beispiel GmbH", "street": "Teststraße 10", "postal_code": "20095", "city": "Hamburg",
              "country_code": "DE", "email": "kreditoren@beispiel.de" },
  "items":  [ { "name": "Beratung", "quantity": 8, "unit": "HUR", "unit_price": 145, "vat_rate": 19 } ],
  "payment": { "means_code": "58", "iban": "DE02120300000000202051" }
}
```

Alle Felder: [invoapi.de/docs](https://invoapi.de/docs).

## Fehler

Die Meldungen der API werden unverändert angezeigt, zum Beispiel „Der API-Schlüssel ist ungültig.“ oder „Ihr kostenloses Kontingent ist aufgebraucht …“. Mit **Bei ungültiger Rechnung abbrechen** stoppt der Workflow, wenn eine Rechnung die Prüfung nicht besteht; sonst läuft er weiter und Sie entscheiden per IF-Node anhand von `valid`.

## Lizenz

MIT

## English

n8n community node for [invoapi.de](https://invoapi.de), a REST API for European e-invoices. It **generates, validates, parses and converts** XRechnung, ZUGFeRD / Factur-X, EN 16931, UBL, CII and Peppol BIS documents. Validation runs the official rule sets (KoSIT validator, EN 16931 schematron), and every finding carries its rule ID and a plain-language explanation.

- **Install:** *Settings → Community Nodes → Install* → `n8n-nodes-invoapi`
- **Credentials:** an API key from the [invoapi dashboard](https://invoapi.de/dashboard); the free plan includes 100 invoices.
- **Operations:** generate an invoice (XML or ZUGFeRD PDF), validate a document, parse it to JSON, convert between formats.
- **Examples:** ready-made workflows in [`examples/`](examples/).

License: MIT
