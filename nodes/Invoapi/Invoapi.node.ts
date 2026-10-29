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
	{ name: 'Default for the Format', value: '' },
	{ name: 'UBL', value: 'ubl' },
	{ name: 'CII', value: 'cii' },
];

/** Operations that read a file from the incoming item. */
const FILE_INPUT = ['validate', 'parse', 'detect', 'convert'];

export class Invoapi implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'invoapi',
		name: 'invoapi',
		icon: { light: 'file:../../icons/invoapi.svg', dark: 'file:../../icons/invoapi.dark.svg' },
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Generate, validate, parse and convert e-invoices: XRechnung, ZUGFeRD, EN 16931, UBL, CII, Peppol',
		defaults: { name: 'invoapi' },
		inputs: ['main' as NodeConnectionType],
		outputs: ['main' as NodeConnectionType],
		usableAsTool: true,
		credentials: [{ name: 'invoapiApi', required: true }],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				default: 'invoice',
				options: [
					{
						name: 'Document',
						value: 'document',
						description: 'An existing e-invoice file (XML or ZUGFeRD PDF)',
					},
					{
						name: 'Invoice',
						value: 'invoice',
						description: 'Invoice data (JSON) to turn into an e-invoice',
					},
				],
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['invoice'] } },
				default: 'generate',
				options: [
					{
						name: 'Calculate Totals',
						value: 'calculate',
						action: 'Calculate invoice totals',
						description: 'Compute net, VAT and gross amounts (free of charge)',
					},
					{
						name: 'Generate',
						value: 'generate',
						action: 'Generate an e invoice',
						description: 'Create a validated e-invoice (XML or ZUGFeRD PDF) from invoice data',
					},
				],
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['document'] } },
				default: 'validate',
				options: [
					{
						name: 'Convert',
						value: 'convert',
						action: 'Convert an e invoice',
						description: 'Turn an e-invoice into another format, a PDF or HTML',
					},
					{
						name: 'Detect Format',
						value: 'detect',
						action: 'Detect the format of an e invoice',
						description: 'Identify the standard, syntax and version of a file',
					},
					{
						name: 'Parse',
						value: 'parse',
						action: 'Parse an e invoice',
						description: 'Read an e-invoice into structured data (JSON)',
					},
					{
						name: 'Validate',
						value: 'validate',
						action: 'Validate an e invoice',
						description: 'Check an XML or ZUGFeRD file against the official rule set',
					},
				],
			},

			// ---------------------------------------------------------- invoice input
			{
				displayName: 'Invoice Data',
				name: 'invoiceSource',
				type: 'options',
				default: 'item',
				displayOptions: { show: { operation: ['generate', 'calculate'] } },
				options: [
					{ name: 'JSON of the Incoming Item', value: 'item' },
					{ name: 'JSON Field', value: 'field' },
				],
				description: 'Where the invoice data comes from. Field reference: https://invoapi.de/docs.',
			},
			{
				displayName: 'Invoice (JSON)',
				name: 'invoiceJson',
				type: 'json',
				default: '{\n  "invoice_number": "RE-2026-0001",\n  "issue_date": "2026-10-28",\n  "currency": "EUR",\n  "seller": {},\n  "buyer": {},\n  "items": []\n}',
				displayOptions: { show: { operation: ['generate', 'calculate'], invoiceSource: ['field'] } },
			},

			// ---------------------------------------------------------- file input
			{
				displayName: 'Input Binary Field',
				name: 'inputBinaryProperty',
				type: 'string',
				default: 'data',
				required: true,
				displayOptions: { show: { operation: FILE_INPUT } },
				description: 'Name of the binary field holding the XML or PDF file, e.g. an e-mail attachment',
			},

			// ---------------------------------------------------------- generate / convert options
			{
				displayName: 'Target',
				name: 'target',
				type: 'options',
				default: 'xml',
				displayOptions: { show: { operation: ['convert'] } },
				options: [
					{ name: 'XML (E-Invoice)', value: 'xml' },
					{ name: 'PDF', value: 'pdf' },
					{ name: 'HTML (Readable)', value: 'html' },
					{ name: 'JSON (Invoice Data)', value: 'json' },
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
				displayName: 'Output',
				name: 'output',
				type: 'options',
				default: 'xml',
				displayOptions: { show: { operation: ['generate'] } },
				options: [
					{ name: 'XML', value: 'xml' },
					{ name: 'PDF (ZUGFeRD, PDF/A-3 with Embedded XML)', value: 'pdf' },
				],
			},
			{
				displayName: 'ZUGFeRD Profile',
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
				displayName: 'Validate with Official Validator',
				name: 'validateResult',
				type: 'boolean',
				default: true,
				displayOptions: { show: { operation: ['generate'] } },
			},
			{
				displayName: 'Stop on Invalid Invoice',
				name: 'failOnInvalid',
				type: 'boolean',
				default: false,
				displayOptions: { show: { operation: ['generate', 'validate'] } },
				description: 'Whether to stop the workflow with an error when the document is not valid, instead of passing the report on',
			},
			{
				displayName: 'Output Binary Field',
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
				headers: { 'User-Agent': 'n8n-nodes-invoapi/0.2.0' },
			})) as { statusCode: number; headers: IDataObject; body: IDataObject };
			if (response.statusCode >= 400) {
				// The API writes its messages for the person reading them; pass them on unchanged.
				const error = ((response.body ?? {}) as IDataObject).error as IDataObject | undefined;
				const message = String(error?.message ?? `invoapi answered with HTTP ${response.statusCode}.`);
				const retryAfter = response.headers?.['retry-after'];
				throw new NodeOperationError(this.getNode(), message, {
					itemIndex,
					description: [
						error?.code ? `Code: ${error.code}` : '',
						retryAfter ? `Try again in ${retryAfter} seconds.` : '',
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
					throw new NodeOperationError(this.getNode(), 'The invoice data is not valid JSON. Check the Invoice (JSON) field.', { itemIndex });
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
			const rest: IDataObject = { ...response };
			delete rest.document;
			return {
				json: { ...rest, filename: document.filename, mime_type: document.mime_type },
				binary: {
					[property]: await this.helpers.prepareBinaryData(bytes, String(document.filename ?? 'invoice'), String(document.mime_type ?? 'application/octet-stream')),
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
						throw new NodeOperationError(this.getNode(), 'The generated invoice does not pass the official validation. See the rules listed below.', {
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
						throw new NodeOperationError(this.getNode(), `The e-invoice ${fileName ?? ''} does not pass the official validation.`, {
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
				// An existing NodeOperationError is returned unchanged by its constructor.
				throw new NodeOperationError(this.getNode(), error as Error, { itemIndex: i });
			}
		}
		return [results];
	}
}

/** "BR-DE-15: … · …" — the first findings, for a message. */
function summarize(result: IDataObject | undefined): string {
	const issues = ((result?.issues ?? []) as IDataObject[]).filter((issue) => issue.severity === 'error');
	return issues
		.slice(0, 5)
		.map((issue) => `${issue.rule ?? ''}: ${issue.message ?? ''}`.trim())
		.join(' · ');
}
