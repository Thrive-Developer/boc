import type { INodeProperties } from 'n8n-workflow';

const showOnlyForActiveResponseRunCommand = {
	resource: ['activeResponse'],
	operation: ['runCommand'],
};

export const activeResponseDescription: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['activeResponse'],
			},
		},
		options: [
			{
				name: 'Run Command',
				value: 'runCommand',
				description: 'Execute an Active Response command on one or more Wazuh agents',
				action: 'Run an active response command',
			},
		],
		default: 'runCommand',
	},
	{
		displayName: 'Command',
		name: 'command',
		type: 'string',
		default: '',
		required: true,
		placeholder: '!firewall-drop',
		displayOptions: {
			show: showOnlyForActiveResponseRunCommand,
		},
		description: 'Active Response command name',
	},
	{
		displayName: 'Agents',
		name: 'agents',
		type: 'string',
		default: '',
		placeholder: '001,002,003',
		displayOptions: {
			show: showOnlyForActiveResponseRunCommand,
		},
		description:
			'Comma-separated list of agent IDs. Leave empty to run the command on all agents.',
	},
	{
		displayName: 'Arguments',
		name: 'arguments',
		type: 'string',
		default: '',
		placeholder: '1.2.3.4',
		displayOptions: {
			show: showOnlyForActiveResponseRunCommand,
		},
		description: 'Comma-separated arguments passed to the command',
	},
	{
		displayName: 'Alert Data',
		name: 'alertData',
		type: 'json',
		default: '{}',
		displayOptions: {
			show: showOnlyForActiveResponseRunCommand,
		},
		description: 'Alert data object sent as alert.data in the Wazuh Active Response request',
	},
	{
		displayName: 'Wait for Complete',
		name: 'waitForComplete',
		type: 'boolean',
		default: false,
		displayOptions: {
			show: showOnlyForActiveResponseRunCommand,
		},
		description: 'Whether to disable the Wazuh API timeout response',
	},
];
