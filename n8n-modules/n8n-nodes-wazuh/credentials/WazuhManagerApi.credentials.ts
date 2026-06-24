import type {
	ICredentialDataDecryptedObject,
	ICredentialTestRequest,
	ICredentialType,
	IExecuteFunctions,
	IExecuteSingleFunctions,
	Icon,
	IHookFunctions,
	IHttpRequestOptions,
	ILoadOptionsFunctions,
	INodeProperties,
} from 'n8n-workflow';

export const WAZUH_MANAGER_API_CREDENTIAL_NAME = 'wazuhManagerApi';

export interface WazuhManagerApiCredentials extends ICredentialDataDecryptedObject {
	baseUrl: string;
	port: number;
	username: string;
	password: string;
	allowUnauthorizedCerts: boolean;
}

type WazuhManagerApiContext =
	| IExecuteFunctions
	| IExecuteSingleFunctions
	| IHookFunctions
	| ILoadOptionsFunctions;

function assertRequiredString(value: unknown, fieldName: string): asserts value is string {
	if (typeof value !== 'string' || value.trim() === '') {
		throw new Error(`${fieldName} is required`);
	}
}

function assertRequiredPort(value: unknown): asserts value is number | string {
	if (value === undefined || value === null || value === '') {
		throw new Error('Port is required');
	}

	const port = Number(value);

	if (!Number.isInteger(port) || port < 1 || port > 65535) {
		throw new Error('Port must be a valid TCP port number');
	}
}

function normalizeBaseUrl(baseUrl: string): string {
	const trimmedBaseUrl = baseUrl.trim().replace(/\/+$/, '');

	if (!/^https?:\/\//i.test(trimmedBaseUrl)) {
		throw new Error('Base URL must include http:// or https://');
	}

	try {
		const url = new URL(trimmedBaseUrl);
		url.port = '';

		return url.toString().replace(/\/+$/, '');
	} catch {
		throw new Error('Base URL must be a valid HTTP or HTTPS URL');
	}
}

export function validateWazuhManagerApiCredentials(
	credentials: ICredentialDataDecryptedObject,
): WazuhManagerApiCredentials {
	assertRequiredString(credentials.host, 'Base URL');
	assertRequiredPort(credentials.port);
	assertRequiredString(credentials.username, 'Username');
	assertRequiredString(credentials.password, 'Password');

	return {
		baseUrl: normalizeBaseUrl(credentials.host),
		port: Number(credentials.port),
		username: credentials.username,
		password: credentials.password,
		allowUnauthorizedCerts: Boolean(credentials.allowUnauthorizedCerts),
	};
}

/**
 * Build the Wazuh Manager API base URL from the stored credential values.
 */
export function getBaseUrl(credentials: WazuhManagerApiCredentials): string {
	return `${credentials.baseUrl}:${credentials.port}`;
}

/**
 * Request a Wazuh Manager JWT token using HTTP Basic Authentication.
 */
export async function authenticate(this: WazuhManagerApiContext): Promise<string> {
	const credentials = validateWazuhManagerApiCredentials(
		await this.getCredentials(WAZUH_MANAGER_API_CREDENTIAL_NAME),
	);
	const baseUrl = getBaseUrl(credentials);

	const options: IHttpRequestOptions = {
		method: 'POST',
		url: `${baseUrl}/security/user/authenticate?raw=true`,
		auth: {
			username: credentials.username,
			password: credentials.password,
			},
			json: false,
			// n8n maps this to rejectUnauthorized = !allowUnauthorizedCerts.
			skipSslCertificateValidation: credentials.allowUnauthorizedCerts,
		};

	const token = await this.helpers.httpRequest.call(this, options);

	if (typeof token !== 'string' || token.trim() === '') {
		throw new Error('Wazuh Manager API authentication did not return a JWT token');
	}

	return token;
}

export class WazuhManagerApi implements ICredentialType {
	name = 'wazuhManagerApi';

	displayName = 'Wazuh Manager API';

	icon: Icon = 'file:../icons/boc.svg';

	documentationUrl = 'https://documentation.wazuh.com/current/user-manual/api/getting-started.html';

	properties: INodeProperties[] = [
		{
			displayName: 'Base URL',
			name: 'host',
			type: 'string',
			default: '',
			placeholder: 'https://wazuh.example.com',
			required: true,
			description:
				'Wazuh Manager API base URL including protocol, without port, for example https://wazuh.example.com or http://172.16.12.185.',
		},
		{
			displayName: 'Port',
			name: 'port',
			type: 'number',
			default: 55000,
			required: true,
			description: 'Port exposed by the Wazuh Manager API.',
		},
		{
			displayName: 'Username',
			name: 'username',
			type: 'string',
			default: '',
			required: true,
			description: 'Wazuh Manager API username used for Basic Authentication.',
		},
		{
			displayName: 'Password',
			name: 'password',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			required: true,
			description: 'Wazuh Manager API password used for Basic Authentication.',
		},
		// eslint-disable-next-line @n8n/community-nodes/credential-password-field
		{
			displayName: 'Allow Unauthorized Certs',
			name: 'allowUnauthorizedCerts',
			type: 'boolean',
			default: false,
			description: 'Allow self-signed or invalid SSL certificates',
		},
	];

	test: ICredentialTestRequest = {
		request: {
			method: 'POST',
			baseURL:
				'={{$credentials.host.replace(/\\/+$/, "").replace(/:\\d+$/, "") + ":" + $credentials.port}}',
			url: '/security/user/authenticate',
			auth: {
				username: '={{$credentials.username}}',
				password: '={{$credentials.password}}',
			},
			json: true,
			skipSslCertificateValidation: '={{$credentials.allowUnauthorizedCerts}}',
		},
		rules: [
			{
				type: 'responseSuccessBody',
				properties: {
					key: 'data.token',
					value: undefined,
					message: 'Wazuh Manager API authentication did not return a JWT token',
				},
			},
		],
	};
}
