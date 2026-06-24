import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError, NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';

import { activeResponseDescription } from './ActiveResponseDescription';
import {
	buildActiveResponsePayload,
	parseCommaSeparatedList,
	parseJsonObjectParameter,
	wazuhManagerApiRequest,
} from './GenericFunctions';

export class WazuhManager implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Wazuh Manager',
		name: 'wazuhManager',
		icon: 'file:boc.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"]}}',
		description: 'Execute an Active Response command on one or more Wazuh agents',
		defaults: {
			name: 'Wazuh Manager',
		},
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		usableAsTool: true,
		credentials: [
			{
				name: 'wazuhManagerApi',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Active Response',
						value: 'activeResponse',
					},
				],
				default: 'activeResponse',
			},
			...activeResponseDescription,
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
			try {
				const resource = this.getNodeParameter('resource', itemIndex) as string;
				const operation = this.getNodeParameter('operation', itemIndex) as string;

				if (resource !== 'activeResponse' || operation !== 'runCommand') {
					throw new NodeOperationError(
						this.getNode(),
						`Unsupported operation "${operation}" for resource "${resource}"`,
						{ itemIndex },
					);
				}

				const command = this.getNodeParameter('command', itemIndex) as string;
				const agentsInput = this.getNodeParameter('agents', itemIndex) as string;
				const argumentsInput = this.getNodeParameter('arguments', itemIndex, '') as string;
				const alertDataInput = this.getNodeParameter('alertData', itemIndex, '{}') as
					| IDataObject
					| string;
				const waitForComplete = this.getNodeParameter(
					'waitForComplete',
					itemIndex,
					false,
				) as boolean;

				const agents = parseCommaSeparatedList(agentsInput);
				const commandArguments = parseCommaSeparatedList(argumentsInput);
				const alertData = parseJsonObjectParameter.call(
					this,
					alertDataInput,
					itemIndex,
					'Alert Data',
				);

				const qs: IDataObject = {
					wait_for_complete: waitForComplete,
				};

				if (agents.length > 0) {
					qs.agents_list = agents.join(',');
				}

				const payload = buildActiveResponsePayload(command, commandArguments, alertData);
				const response = await wazuhManagerApiRequest.call(
					this,
					'PUT',
					'/active-response',
					payload,
					qs,
					itemIndex,
				);

				returnData.push({
					json: response,
					pairedItem: {
						item: itemIndex,
					},
				});
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({
						json: {
							error: error instanceof Error ? error.message : String(error),
						},
						pairedItem: {
							item: itemIndex,
						},
					});
					continue;
				}

				if (error instanceof NodeApiError) {
					throw new NodeApiError(
						this.getNode(),
						{
							message: error.message,
						},
						{ itemIndex, httpCode: error.httpCode ?? undefined },
					);
				}

				if (error instanceof NodeOperationError) {
					throw new NodeOperationError(this.getNode(), error.message, {
						itemIndex,
					});
				}

				throw new NodeApiError(this.getNode(), error as JsonObject, { itemIndex });
			}
		}

		return [returnData];
	}
}
