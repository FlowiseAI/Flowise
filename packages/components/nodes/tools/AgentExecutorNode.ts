// --- File: packages/components/nodes/tools/AgentExecutorNode.ts ---

import { INode, INodeData, INodeParams, ICommonObject } from '../../../src/Interface';
import { getBaseClasses } from '../../../src/utils';
import { StructuredTool, ToolParams } from '@langchain/core/tools';
import { z } from 'zod';

// Import our backend libraries
import { execa, ExecaChildProcess } from 'execa';
import fs from 'fs-extra';
import Docker from 'dockerode'; // Default export from dockerode
import { Client as SSHClient, ClientChannel } from 'ssh2'; // Named exports

// 1. Define the Zod schema for the input to the Langchain tool's _call method
const agentExecutorSchema = z.object({
    actionType: z.enum(["filesystem", "executeCommand", "docker", "ssh", "pythonScript"]),
    actionParams: z.any().describe("Parameters specific to the action type")
});

// 2. Define the parameters for our Langchain tool constructor
interface AgentExecutorToolParams extends ToolParams {
    // No specific params needed for constructor for now
}

// 3. Create the Langchain Tool class
class AgentExecutorLangchainTool extends StructuredTool<typeof agentExecutorSchema> {
    static lc_name() {
        return 'AgentExecutorLangchainTool';
    }

    name = "agentExecutor"; // Internal name for the Langchain tool
    description = "Executes advanced system commands, interacts with Docker/SSH, and runs Python scripts.";
    schema = agentExecutorSchema;

    constructor(params?: AgentExecutorToolParams) {
        super(params);
    }

    async _call(inputs: z.infer<typeof agentExecutorSchema>): Promise<string> {
        const { actionType, actionParams } = inputs;
        let result: any;

        try {
            switch (actionType) {
                case 'filesystem':
                    result = await this.handleFilesystem(actionParams);
                    break;
                case 'executeCommand':
                    result = await this.handleExecuteCommand(actionParams);
                    break;
                case 'docker':
                    result = await this.handleDocker(actionParams);
                    break;
                case 'ssh':
                    result = await this.handleSsh(actionParams);
                    break;
                case 'pythonScript':
                    result = await this.handlePythonScript(actionParams);
                    break;
                default:
                    throw new Error(`Unsupported actionType: ${actionType}`);
            }
            return JSON.stringify(result, null, 2);
        } catch (error: any) {
            console.error(`Error in AgentExecutorLangchainTool (${actionType}):`, error);
            return JSON.stringify({ error: error.message, details: error.stack }, null, 2);
        }
    }

    private async handleExecuteCommand(params: any): Promise<any> {
        if (!params.command) {
            throw new Error('Missing "command" parameter for executeCommand');
        }
        const { command, args = [], options = {} } = params;
        const execaOptions = { ...options, windowsHide: true };

        try {
            const { stdout, stderr, exitCode, failed, timedOut, isCanceled } = await execa(command, args, execaOptions);
            return { stdout, stderr, exitCode, failed, timedOut, isCanceled };
        } catch (error: any) {
            return {
                stdout: error.stdout,
                stderr: error.stderr,
                exitCode: error.exitCode,
                failed: error.failed,
                timedOut: error.timedOut,
                isCanceled: error.isCanceled,
                error: error.message
            };
        }
    }

    private async handleFilesystem(params: any): Promise<any> {
        const { operation, path, content, encoding = 'utf8' } = params;
        if (!operation || !path) {
            throw new Error('Missing "operation" or "path" for filesystem action');
        }

        switch (operation) {
            case 'readFile':
                return fs.readFile(path, encoding);
            case 'writeFile':
                if (content === undefined) throw new Error('Missing "content" for writeFile');
                await fs.writeFile(path, content, encoding);
                return { success: true, path };
            case 'deleteFile': // fs-extra's remove handles files and directories
                await fs.remove(path);
                return { success: true, path };
            case 'listDir':
                return fs.readdir(path);
            case 'pathExists':
                return { exists: await fs.pathExists(path) };
            default:
                throw new Error(`Unsupported filesystem operation: ${operation}`);
        }
    }

    private async handleDocker(params: any): Promise<any> {
        const docker = new Docker(); // Assumes Docker socket is at /var/run/docker.sock
        const { operation, containerId, command, options = {} } = params;

        if (!operation) throw new Error('Missing "operation" for docker action');

        switch(operation) {
            case 'listContainers':
                return docker.listContainers({ all: params.all || false });
            case 'inspectContainer':
                if (!containerId) throw new Error('Missing "containerId" for inspectContainer');
                return docker.getContainer(containerId).inspect();
            case 'execInContainer':
                if (!containerId || !command) throw new Error('Missing "containerId" or "command" for execInContainer');
                const container = docker.getContainer(containerId);
                const exec = await container.exec({
                    Cmd: Array.isArray(command) ? command : command.split(' '),
                    AttachStdout: true,
                    AttachStderr: true,
                    ...options
                });
                return new Promise((resolve, reject) => {
                    exec.start({ hijack: true, stdin: false }, (err, stream) => {
                        if (err) return reject(err);
                        let output = '';
                        // Using docker.modem.demuxStream might be more robust for separate stdout/stderr
                        stream?.on('data', (chunk) => output += chunk.toString('utf8'));
                        stream?.on('end', () => resolve({ output: output.trim() }));
                        stream?.on('error', (errStream) => reject(errStream));
                    });
                });
            default:
                throw new Error(`Unsupported docker operation: ${operation}`);
        }
    }

    private async handleSsh(params: any): Promise<any> {
        const { host, port = 22, username, password, privateKey, command } = params;
        if (!host || !username || (!password && !privateKey) || !command) {
            throw new Error('Missing required SSH parameters (host, username, auth, command)');
        }

        return new Promise((resolve, reject) => {
            const conn = new SSHClient();
            conn.on('ready', () => {
                conn.exec(command, (err: Error | undefined, stream: ClientChannel) => {
                    if (err) {
                        conn.end();
                        return reject(err);
                    }
                    let output = '';
                    let stderrOutput = '';
                    stream.on('close', (code: number | null, signal: string | undefined) => {
                        conn.end();
                        resolve({ output: output.trim(), stderr: stderrOutput.trim(), code, signal });
                    }).on('data', (data: Buffer) => {
                        output += data.toString();
                    }).stderr.on('data', (data: Buffer) => {
                        stderrOutput += data.toString();
                    });
                });
            }).on('error', (err: Error) => {
                reject(err);
            }).connect({ host, port, username, password, privateKey: privateKey ? Buffer.from(privateKey) : undefined });
        });
    }
    
    private async handlePythonScript(params: any): Promise<any> {
        const { script, scriptPath, args = [] } = params;
        let finalScriptPath = scriptPath;
        let tempScriptWritten = false;

        if (script) {
            finalScriptPath = `/tmp/flowise_python_script_${Date.now()}.py`;
            await fs.writeFile(finalScriptPath, script);
            tempScriptWritten = true;
        }

        if (!finalScriptPath) {
            throw new Error('Missing "script" or "scriptPath" for pythonScript action');
        }

        try {
            const { stdout, stderr, exitCode } = await execa('python3', [finalScriptPath, ...args]);
            return { stdout, stderr, exitCode };
        } catch (error: any) {
            return { 
                stdout: error.stdout, 
                stderr: error.stderr, 
                exitCode: error.exitCode, 
                error: error.message 
            };
        } finally {
            if (tempScriptWritten && finalScriptPath) {
                await fs.remove(finalScriptPath).catch(e => console.error("Failed to cleanup temp python script:", e));
            }
        }
    }
}

// 4. Create the Flowise Node class
class AgentExecutorNode_FlowiseWrapper implements INode {
    label: string;
    name: string;
    version: number;
    description: string;
    type: string;
    icon: string;
    category: string;
    baseClasses: string[];
    inputs: INodeParams[];

    constructor() {
        this.label = 'Agent Executor';
        this.name = 'agentExecutorNode'; 
        this.version = 1.0;
        this.type = 'AgentExecutor'; 
        this.icon = 'customtool.svg'; 
        this.category = 'Tools';
        this.description = 'A powerful node to execute various system-level actions like file operations, commands, Docker/SSH interaction, and Python scripts. Input parameters as JSON.';
        this.baseClasses = [this.type, 'Tool', ...getBaseClasses(AgentExecutorLangchainTool)];

        this.inputs = [
            {
                label: 'Action Type',
                name: 'actionType',
                type: 'options',
                options: [
                    { label: 'Filesystem', name: 'filesystem' },
                    { label: 'Execute Command', name: 'executeCommand' },
                    { label: 'Docker Operation', name: 'docker' },
                    { label: 'SSH Command', name: 'ssh' },
                    { label: 'Python Script', name: 'pythonScript' }
                ],
                description: 'The type of action to perform.'
            },
            {
                label: 'Action Parameters (JSON)',
                name: 'actionParams',
                type: 'json',
                placeholder: '{\n  "command": "ls",\n  "args": ["-la"]\n}',
                description: 'JSON object containing parameters for the selected action type. Refer to documentation for specific structures for each action type.',
                optional: false 
            }
        ];
    }

    async init(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {
        const actionType = nodeData.inputs?.actionType as string;
        const actionParamsRaw = nodeData.inputs?.actionParams as string;

        let actionParams: any;
        try {
            actionParams = JSON.parse(actionParamsRaw);
        } catch (e) {
            throw new Error(`Invalid JSON in Action Parameters: ${e.message}`);
        }
        
        // The init method in Flowise is expected to return a Langchain tool instance.
        // The tool's _call method will then be invoked by Langchain/Flowise with the combined inputs.
        // However, the standard Langchain tool schema expects all inputs to be passed to _call in one object.
        // The Flowise UI separates actionType and actionParams. We need to ensure they are passed correctly
        // to the AgentExecutorLangchainTool's _call method, which expects a single object.

        // We will instantiate the tool and it will be called by the Flowise runtime.
        // The runtime will need to map the UI inputs ("actionType", "actionParams")
        // to the schema of AgentExecutorLangchainTool ({ actionType: ..., actionParams: ... }).
        // This mapping is usually handled by Flowise if the tool's input schema matches the node's inputs.

        // Let's adjust the tool schema slightly and how we pass params in init.
        // The tool itself will receive { actionType, actionParams } via its schema.
        // The Flowise node inputs are also named actionType and actionParams.
        // Flowise should be able to map these directly if the tool's `schema` (zod object)
        // has top-level fields matching these input names.

        // Our current agentExecutorSchema is:
        // z.object({
        // actionType: z.enum(...),
        // actionParams: z.any()
        // })
        // This matches the names of the input fields in AgentExecutorNode_FlowiseWrapper.
        // So, Flowise should correctly pass these to the _call method.

        return new AgentExecutorLangchainTool({});
    }
}

module.exports = { nodeClass: AgentExecutorNode_FlowiseWrapper };
