import type {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class InvoapiApi implements ICredentialType {
	name = 'invoapiApi';

	displayName = 'invoapi API';

	documentationUrl = 'https://invoapi.de/docs';

	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			required: true,
			description: 'Im invoapi-Dashboard unter API-Schlüssel',
		},
		{
			displayName: 'Base URL',
			name: 'baseUrl',
			type: 'string',
			default: 'https://api.invoapi.de',
			description: 'Nur ändern, wenn Sie eine eigene invoapi-Instanz betreiben',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				Authorization: '=Bearer {{$credentials.apiKey}}',
			},
		},
	};

	// `calculate` needs a valid key but costs no allowance, so testing the
	// credential never spends an invoice.
	test: ICredentialTestRequest = {
		request: {
			baseURL: '={{$credentials.baseUrl}}',
			url: '/api/v1/calculate',
			method: 'POST',
			body: {
				invoice: {
					invoice_number: 'TEST-1',
					issue_date: '2026-01-01',
					currency: 'EUR',
					seller: { name: 'Test', country_code: 'DE' },
					buyer: { name: 'Test', country_code: 'DE' },
					items: [{ name: 'Test', quantity: 1, unit_price: 1, vat_rate: 19 }],
				},
			},
		},
	};
}
