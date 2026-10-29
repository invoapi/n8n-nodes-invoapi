# n8n-nodes-invoapi

n8n community node for [invoapi.de](https://invoapi.de), a REST API for European e-invoices. It **generates, validates, parses and converts** XRechnung, ZUGFeRD / Factur-X, EN 16931, UBL, CII and Peppol BIS documents. Validation runs the official rule sets (KoSIT validator, EN 16931 schematron), and every finding carries its rule ID and a plain-language explanation.

## Installation

**In n8n:** *Settings → Community Nodes → Install*, then enter `n8n-nodes-invoapi`.

Or manually, in `~/.n8n/nodes`:

```bash
npm install n8n-nodes-invoapi
```

Restart n8n afterwards. See the [n8n community nodes guide](https://docs.n8n.io/integrations/community-nodes/installation/) for details.

## Credentials

Create an API key in the [invoapi dashboard](https://invoapi.de/dashboard) (the free plan includes 100 invoices). In n8n, add a new **Invoapi API** credential and paste the key. n8n tests the key when you save it; the test does not count against your quota.

## Operations

| Resource | Operation | Input | Output |
|---|---|---|---|
| Invoice | **Generate** | Invoice data as JSON | XML or ZUGFeRD PDF as a binary file, plus the validation result |
| Invoice | **Calculate Totals** | Invoice data as JSON | Net, VAT and gross totals (free, no quota used) |
| Document | **Validate** | XML or PDF file | `valid` true/false, errors and warnings with rule and explanation |
| Document | **Parse** | XML or PDF file | Invoice data as JSON (seller, buyer, lines, totals) |
| Document | **Detect Format** | XML or PDF file | Standard, syntax and version |
| Document | **Convert** | XML or PDF file | Another format (e.g. XRechnung UBL → CII, or → ZUGFeRD PDF), HTML or JSON |

Files go in and out as regular n8n binary data, for example straight from an email attachment (IMAP, Gmail, Outlook) or to Google Drive and Dropbox.

## Example workflows

Import these from [`examples/`](examples/):

- **Validate incoming e-invoices:** Email trigger (attachment) → **Validate** → IF `valid` → file valid invoices, ask the sender about invalid ones using `errors`.
- **Generate and validate an XRechnung:** Manual trigger → sample invoice data → **Generate** → **Validate**.

Other common setups: a shop or CRM webhook → Set (map fields) → **Generate** → email the invoice to the customer; or a folder trigger → **Parse** → Google Sheets / Airtable.

## Invoice data

**Generate** and **Calculate Totals** read the invoice either from the incoming item's JSON or from a JSON field. The format is the invoapi API format:

```json
{
  "invoice_number": "RE-2026-0001",
  "issue_date": "2026-10-28",
  "due_date": "2026-11-27",
  "currency": "EUR",
  "buyer_reference": "04011000-12345-34",
  "seller": { "name": "Muster GmbH", "street": "Musterstrasse 1", "postal_code": "10115", "city": "Berlin",
              "country_code": "DE", "vat_id": "DE123456789", "email": "invoice@muster.de", "phone": "+49 30 1234567" },
  "buyer":  { "name": "Beispiel GmbH", "street": "Teststrasse 10", "postal_code": "20095", "city": "Hamburg",
              "country_code": "DE", "email": "payables@beispiel.de" },
  "items":  [ { "name": "Consulting", "quantity": 8, "unit": "HUR", "unit_price": 145, "vat_rate": 19 } ],
  "payment": { "means_code": "58", "iban": "DE02120300000000202051" }
}
```

All fields are documented at [invoapi.de/docs](https://invoapi.de/docs).

## Errors

API errors (for example an invalid API key or an exhausted quota) are shown as the node's error message. With **Stop on Invalid Invoice** enabled, the workflow stops when a document fails validation; otherwise it continues and you can branch on `valid` with an IF node.

## Compatibility

Tested with the current n8n release (self-hosted, October 2026).

## License

[MIT](LICENSE)
