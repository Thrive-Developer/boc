import type { IDataObject, IExecuteFunctions, IHttpRequestOptions, JsonObject } from 'n8n-workflow';
import { NodeApiError, NodeOperationError } from 'n8n-workflow';

import {
	authenticate,
	getBaseUrl,
	validateWazuhManagerApiCredentials,
	WAZUH_MANAGER_API_CREDENTIAL_NAME,
} from '../../credentials/WazuhManagerApi.credentials';

export interface WazuhActiveResponsePayload extends IDataObject {
	command: string;
	arguments?: string[];
	alert?: {
		data: IDataObject;
	};
}

interface WazuhHttpResponse extends IDataObject {
	statusCode?: number;
	statusMessage?: string;
	body?: IDataObject | IDataObject[] | string;
}

export function parseCommaSeparatedList(value: string): string[] {
	return value
		.split(',')
		.map((entry) => entry.trim())
		.filter((entry) => entry !== '');
}

export function parseJsonObjectParameter(
	this: IExecuteFunctions,
	value: IDataObject | string,
	itemIndex: number,
	fieldName: string,
): IDataObject {
	if (typeof value !== 'string') {
		if (Array.isArray(value)) {
			throw new NodeOperationError(this.getNode(), `${fieldName} must be a JSON object`, {
				itemIndex,
			});
		}

		return value;
	}

	const trimmedValue = value.trim();

	if (trimmedValue === '') {
		return {};
	}

	try {
		const parsedValue = JSON.parse(trimmedValue) as unknown;

		if (
			typeof parsedValue !== 'object' ||
			parsedValue === null ||
			Array.isArray(parsedValue)
		) {
			throw new Error(`${fieldName} must be a JSON object`);
		}

		return parsedValue as IDataObject;
	} catch (error) {
		throw new NodeOperationError(this.getNode(), `Invalid JSON in ${fieldName}`, {
			itemIndex,
			description: error instanceof Error ? error.message : undefined,
		});
	}
}

export function buildActiveResponsePayload(
	command: string,
	commandArguments: string[],
	alertData: IDataObject,
): WazuhActiveResponsePayload {
	const payload: WazuhActiveResponsePayload = {
		command,
	};

	if (commandArguments.length > 0) {
		payload.arguments = commandArguments;
	}

	if (Object.keys(alertData).length > 0) {
		payload.alert = {
			data: alertData,
		};
	}

	return payload;
}

export async function wazuhManagerApiRequest(
	this: IExecuteFunctions,
	method: IHttpRequestOptions['method'],
	endpoint: string,
	body: IDataObject,
	qs: IDataObject,
	itemIndex: number,
): Promise<WazuhHttpResponse> {
	const token = await authenticate.call(this);
	const credentials = validateWazuhManagerApiCredentials(
		await this.getCredentials(WAZUH_MANAGER_API_CREDENTIAL_NAME),
	);
	const baseUrl = getBaseUrl(credentials);

	const options: IHttpRequestOptions = {
		method,
		url: `${baseUrl}${endpoint}`,
		headers: {
			Authorization: `Bearer ${token}`,
			Accept: 'application/json',
		},
		qs,
		body,
		json: true,
		returnFullResponse: true,
		ignoreHttpStatusErrors: true,
		// n8n maps this to rejectUnauthorized = !allowUnauthorizedCerts.
		skipSslCertificateValidation: credentials.allowUnauthorizedCerts,
	};

	const response = (await this.helpers.httpRequest.call(this, options)) as WazuhHttpResponse;
	const statusCode = Number(response.statusCode);

	if (Number.isInteger(statusCode) && (statusCode < 200 || statusCode >= 300)) {
		throw new NodeApiError(
			this.getNode(),
			{
				message: response.statusMessage ?? 'Wazuh Manager API request failed',
				statusCode,
				response: response.body as JsonObject,
			},
			{
				itemIndex,
				httpCode: String(statusCode),
			},
		);
	}

	return response;
}
