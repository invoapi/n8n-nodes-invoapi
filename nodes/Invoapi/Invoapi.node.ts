import {
	NodeOperationError,
	type IDataObject,
	type IExecuteFunctions,
	type IHttpRequestMethods,
	type INodeExecutionData,
	type INodeType,
	type INodeTypeDescription,
	type NodeConnectionType,
} from 'n8n-workflow';

const FORMATS = [
	{ name: 'XRechnung', value: 'xrechnung' },
	{ name: 'ZUGFeRD / Factur-X', value: 'zugferd' },
	{ name: 'EN 16931', value: 'en16931' },
	{ name: 'Peppol BIS Billing', value: 'peppol' },
	{ name: 'UBL', value: 'ubl' },
	{ name: 'CII', value: 'cii' },
];

const SYNTAXES = [
	{ name: 'Standard des Formats', value: '' },
	{ name: 'UBL', value: 'ubl' },
	{ name: 'CII', value: 'cii' },
];

/** Operations that read a file from the incoming item. */
const FILE_INPUT = ['validate', 'parse', 'detect', 'convert'];

export class Invoapi implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'invoapi',
		name: 'invoapi',
		icon: 'file:invoapi.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"]}}',
		description: 'E-Rechnungen erzeugen, prüfen, auslesen und umwandeln: XRechnung, ZUGFeRD, EN 16931, UBL, CII, Peppol',
		defaults: { name: 'invoapi' },
		inputs: ['main' as NodeConnectionType],
		outputs: ['main' as NodeConnectionType],
		usableAsTool: true,
		credentials: [{ name: 'invoapiApi', required: true }],
		properties: [
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				default: 'generate',
				options: [
					{
						name: 'Rechnung erzeugen',
						value: 'generate',
						action: 'Rechnung erzeugen',
						description: 'Aus Rechnungsdaten eine geprüfte E-Rechnung (XML oder ZUGFeRD-PDF) erstellen',
					},
					{
						name: 'E-Rechnung prüfen',
						value: 'validate',
						action: 'E-Rechnung prüfen',
						description: 'Eine XML- oder ZUGFeRD-Datei gegen das offizielle Regelwerk prüfen',
					},
					{
						name: 'Auslesen',
						value: 'parse',
						action: 'E-Rechnung auslesen',
						description: 'Eine E-Rechnung in strukturierte Daten (JSON) umwandeln',
					},
					{
						name: 'Format erkennen',
						value: 'detect',
						action: 'Format erkennen',
						description: 'Welcher Standard, welche Syntax und Version eine Datei ist',
					},
					{
						name: 'Umwandeln',
						value: 'convert',
						action: 'E-Rechnung umwandeln',
						description: 'Eine E-Rechnung in ein anderes Format oder als PDF/HTML ausgeben',
					},
					{
						name: 'Summen berechnen',
						value: 'calculate',
						action: 'Summen berechnen',
						description: 'Netto, Umsatzsteuer und Brutto berechnen (kostenlos)',
					},
				],
			},

			// ---------------------------------------------------------- invoice input
			{
				displayName: 'Rechnungsdaten',
				name: 'invoiceSource',
				type: 'options',
				default: 'item',
				displayOptions: { show: { operation: ['generate', 'calculate'] } },
				options: [
					{ name: 'JSON des eingehenden Elements', value: 'item' },
					{ name: 'Feld mit JSON', value: 'field' },
				],
				description: 'Woher die Rechnungsdaten kommen. Felder: siehe invoapi.de/docs.',
			},
			{
				displayName: 'Rechnung (JSON)',
				name: 'invoiceJson',
				type: 'json',
				default: '{\n  "invoice_number": "RE-2026-0001",\n  "issue_date": "2026-10-28",\n  "currency": "EUR",\n  "seller": {},\n  "buyer": {},\n  "items": []\n}',
				displayOptions: { show: { operation: ['generate', 'calculate'], invoiceSource: ['field'] } },
			},

			// ---------------------------------------------------------- file input
			{
				displayName: 'Binärfeld mit der Datei',
				name: 'inputBinaryProperty',
				type: 'string',
				default: 'data',
				required: true,
				displayOptions: { show: { operation: FILE_INPUT } },
				description: 'Name des Binärfelds, das die XML- oder PDF-Datei enthält, z. B. aus einem E-Mail-Anhang',
			},

			// ---------------------------------------------------------- generate / convert options
			{
				displayName: 'Ziel',
				name: 'target',
				type: 'options',
				default: 'xml',
				displayOptions: { show: { operation: ['convert'] } },
				options: [
					{ name: 'XML (E-Rechnung)', value: 'xml' },
					{ name: 'PDF', value: 'pdf' },
					{ name: 'HTML (Lesefassung)', value: 'html' },
					{ name: 'JSON (Rechnungsdaten)', value: 'json' },
				],
			},
			{
				displayName: 'Format',
				name: 'format',
				type: 'options',
				default: 'xrechnung',
				options: FORMATS,
				displayOptions: { show: { operation: ['generate', 'convert'] }, hide: { target: ['json', 'html'] } },
			},
			{
				displayName: 'Syntax',
				name: 'syntax',
				type: 'options',
				default: '',
				options: SYNTAXES,
				displayOptions: { show: { operation: ['generate', 'convert'], format: ['xrechnung', 'en16931'] }, hide: { target: ['json', 'html'] } },
			},
			{
				displayName: 'Ausgabe',
				name: 'output',
				type: 'options',
				default: 'xml',
				displayOptions: { show: { operation: ['generate'] } },
				options: [
					{ name: 'XML', value: 'xml' },
					{ name: 'PDF (ZUGFeRD, PDF/A-3 mit eingebettetem XML)', value: 'pdf' },
				],
			},
			{
				displayName: 'ZUGFeRD-Profil',
				name: 'profile',
				type: 'options',
				default: 'en16931',
				displayOptions: { show: { format: ['zugferd'], operation: ['generate', 'convert'] } },
				options: [
					{ name: 'EN 16931 (Comfort)', value: 'en16931' },
					{ name: 'Basic', value: 'basic' },
					{ name: 'Extended', value: 'extended' },
					{ name: 'XRechnung', value: 'xrechnung' },
				],
			},
			{
				displayName: 'Mit offiziellem Validator prüfen',
				name: 'validateResult',
				type: 'boolean',
				default: true,
				displayOptions: { show: { operation: ['generate'] } },
			},
			{
				displayName: 'Bei ungültiger Rechnung abbrechen',
				name: 'failOnInvalid',
				type: 'boolean',
				default: false,
				displayOptions: { show: { operation: ['generate', 'validate'] } },
				description: 'Whether to stop the workflow with an error when the document is not valid, instead of passing the report on',
			},
			{
				displayName: 'Binärfeld für das Ergebnis',
				name: 'outputBinaryProperty',
				type: 'string',
				default: 'data',
				displayOptions: { show: { operation: ['generate', 'convert'] }, hide: { target: ['json'] } },
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const results: INodeExecutionData[] = [];
		const credentials = await this.getCredentials('invoapiApi');
		const baseUrl = String(credentials.baseUrl || 'https://api.invoapi.de').replace(/\/$/, '');

		const call = async (itemIndex: number, method: IHttpRequestMethods, path: string, body?: IDataObject) => {
			const response = (await this.helpers.httpRequestWithAuthentication.call(this, 'invoapiApi', {
				method,
				url: `${baseUrl}${path}`,
				body,
				json: true,
				returnFullResponse: true,
				ignoreHttpStatusErrors: true,
				headers: { 'User-Agent': 'n8n-nodes-invoapi/0.1.0' },
			})) as { statusCode: number; headers: IDataObject; body: IDataObject };
			if (response.statusCode >= 400) {
				// The API writes its messages for the person reading them; pass them on unchanged.
				const error = ((response.body ?? {}) as IDataObject).error as IDataObject | undefined;
				const message = String(error?.message ?? `invoapi antwortete mit HTTP ${response.statusCode}.`);
				const retryAfter = response.headers?.['retry-after'];
				throw new NodeOperationError(this.getNode(), message, {
					itemIndex,
					description: [
						error?.code ? `Code: ${error.code}` : '',
						retryAfter ? `Erneut versuchen in ${retryAfter} Sekunden.` : '',
						error?.request_id ? `Request-ID: ${error.request_id}` : '',
					].filter(Boolean).join(' · '),
				});
			}
			return response.body;
		};

		const invoiceOf = (itemIndex: number): IDataObject => {
			if (this.getNodeParameter('invoiceSource', itemIndex) === 'item') {
				return items[itemIndex].json;
			}
			const raw = this.getNodeParameter('invoiceJson', itemIndex);
			if (typeof raw === 'string') {
				try {
					return JSON.parse(raw) as IDataObject;
				} catch {
					throw new NodeOperationError(this.getNode(), 'Die Rechnungsdaten sind kein gültiges JSON.', { itemIndex });
				}
			}
			return raw as IDataObject;
		};

		const fileOf = async (itemIndex: number) => {
			const property = this.getNodeParameter('inputBinaryProperty', itemIndex) as string;
			const binary = this.helpers.assertBinaryData(itemIndex, property);
			const buffer = await this.helpers.getBinaryDataBuffer(itemIndex, property);
			return { content_base64: buffer.toString('base64'), fileName: binary.fileName };
		};

		const withDocument = async (itemIndex: number, response: IDataObject): Promise<INodeExecutionData> => {
			const document = (response.document ?? {}) as IDataObject;
			const bytes = document.content_base64
				? Buffer.from(String(document.content_base64), 'base64')
				: Buffer.from(String(document.content ?? ''), 'utf8');
			const property = this.getNodeParameter('outputBinaryProperty', itemIndex) as string;
			const { document: _omit, ...rest } = response;
			return {
				json: { ...rest, filename: document.filename, mime_type: document.mime_type },
				binary: {
					[property]: await this.helpers.prepareBinaryData(bytes, String(document.filename ?? 'rechnung'), String(document.mime_type ?? 'application/octet-stream')),
				},
				pairedItem: { item: itemIndex },
			};
		};

		for (let i = 0; i < items.length; i++) {
			try {
				const operation = this.getNodeParameter('operation', i) as string;

				if (operation === 'generate') {
					const output = this.getNodeParameter('output', i) as string;
					const format = this.getNodeParameter('format', i) as string;
					const syntax = this.getNodeParameter('syntax', i, '') as string;
					const body: IDataObject = {
						format,
						output,
						validate: this.getNodeParameter('validateResult', i) as boolean,
						invoice: invoiceOf(i),
					};
					if (syntax) body.syntax = syntax;
					if (format === 'zugferd') body.profile = this.getNodeParameter('profile', i) as string;
					const response = await call(i, 'POST', '/api/v1/generate', body);
					if (this.getNodeParameter('failOnInvalid', i) && response.valid === false) {
						throw new NodeOperationError(this.getNode(), 'Die erzeugte Rechnung ist laut Validator nicht gültig.', {
							itemIndex: i,
							description: summarize(response.validation as IDataObject | undefined),
						});
					}
					results.push(await withDocument(i, response));
				} else if (operation === 'validate') {
					const { content_base64, fileName } = await fileOf(i);
					const response = await call(i, 'POST', '/api/v1/validate', { content_base64 });
					const result = (response.result ?? {}) as IDataObject;
					const issues = (result.issues ?? []) as IDataObject[];
					const report = {
						file: fileName,
						valid: response.valid,
						status: response.status,
						detected_format: response.detected_format,
						syntax: response.syntax,
						version: response.version,
						errors: issues.filter((issue) => issue.severity === 'error'),
						warnings: issues.filter((issue) => issue.severity === 'warning'),
						summary: result.summary,
						request_id: response.request_id,
					};
					if (this.getNodeParameter('failOnInvalid', i) && response.valid !== true) {
						throw new NodeOperationError(this.getNode(), `Die E-Rechnung ${fileName ?? ''} ist nicht gültig.`, {
							itemIndex: i,
							description: summarize(result),
						});
					}
					results.push({ json: report as IDataObject, pairedItem: { item: i } });
				} else if (operation === 'parse' || operation === 'detect') {
					const { content_base64 } = await fileOf(i);
					const response = await call(i, 'POST', `/api/v1/${operation}`, { content_base64 });
					results.push({ json: response, pairedItem: { item: i } });
				} else if (operation === 'convert') {
					const target = this.getNodeParameter('target', i) as string;
					const { content_base64 } = await fileOf(i);
					const body: IDataObject = { target, content_base64 };
					if (target === 'xml' || target === 'pdf') {
						const format = this.getNodeParameter('format', i) as string;
						body.format = format;
						const syntax = this.getNodeParameter('syntax', i, '') as string;
						if (syntax) body.syntax = syntax;
						if (format === 'zugferd') body.profile = this.getNodeParameter('profile', i) as string;
					}
					const response = await call(i, 'POST', '/api/v1/convert', body);
					results.push(target === 'json' ? { json: response, pairedItem: { item: i } } : await withDocument(i, response));
				} else if (operation === 'calculate') {
					const response = await call(i, 'POST', '/api/v1/calculate', { invoice: invoiceOf(i) });
					results.push({ json: response, pairedItem: { item: i } });
				}
			} catch (error) {
				if (this.continueOnFail()) {
					results.push({ json: { error: (error as Error).message }, pairedItem: { item: i } });
					continue;
				}
				throw error;
			}
		}
		return [results];
	}
}

/** "BR-DE-15: Leitweg-ID fehlt · …" — the first findings, for an error message. */
function summarize(result: IDataObject | undefined): string {
	const issues = ((result?.issues ?? []) as IDataObject[]).filter((issue) => issue.severity === 'error');
	return issues
		.slice(0, 5)
		.map((issue) => `${issue.rule ?? ''}: ${issue.message ?? ''}`.trim())
		.join(' · ');
}
