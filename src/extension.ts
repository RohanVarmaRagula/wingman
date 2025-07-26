import * as vscode from 'vscode';
import axios from 'axios';
import {LLMRequest, CodeWalkthroughRequest, CodeWalkthroughResponse, GenerateTestCasesRequest, GenerateTestCasesResponse ,ExplainErrorsRequest, ExplainErrorsResponse,SuggestFixesRequest, SuggestFixesResponse} from './schemas';
import * as path from 'path';
import { exec } from 'child_process';
import * as util from 'util';

export function activate(context: vscode.ExtensionContext) {
	console.log('Congratulations, your extension "wingman" is now active!');

	//////////////////////////////// getLLMRequest /////////////////////////////////////////////
	async function getLLMRequest(): Promise<LLMRequest> {
		let provider = await context.secrets.get('provider');
		if (!provider) {
			await vscode.commands.executeCommand('wingman.setLLMProvider');
			provider = await context.secrets.get('provider');
		}
		let model = await context.secrets.get('model');
		if (!model) {
			await vscode.commands.executeCommand('wingman.setLLMModel');
			model = await context.secrets.get('model');
		}
		let api_key = await context.secrets.get(`${provider}_API_KEY`);
		if (!api_key) {
			await vscode.commands.executeCommand('wingman.setAPIKey');
			api_key = await context.secrets.get(`${provider}_API_KEY`);
		}
		if (!provider || !model || !api_key) {
			throw new Error("Incomplete LLM configuration. Please set provider, model, and API key.");
		}
		const req: LLMRequest = {
			provider,
			model,
			api_key
		};
		return req;
	}

	//////////////////////////////// getLLMRequest /////////////////////////////////////////////

	/////////////////////////////////   STATUS BAR   ///////////////////////////////////////////
	const statusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
	statusBar.command = 'wingman.helloWorld';
	statusBar.tooltip = "Click to say hello to wingman!";
	enum WingmanState {
		Idle = 'Idle',
		Thinking = 'Thinking ...',
		Running = 'Running ...'
	}

	function updateStatusBar(state: WingmanState) {
		statusBar.text = `$(zap) Wingman's ${state}`;
	}
	updateStatusBar(WingmanState.Idle);
	statusBar.show();
	/////////////////////////////////   STATUS BAR   ///////////////////////////////////////////

	///////////////////////////////// run user code /////////////////////////////////////////////
	
	const execPromise = util.promisify(exec);
	async function runUserCode(editor: vscode.TextEditor): Promise<[string, string, string]> {
		if (!editor) {
			vscode.window.showErrorMessage('No active editor found');
			updateStatusBar(WingmanState.Idle);
			return ["", "", ""];
		}

		const text = editor.document.getText();
		if (!text) {
			vscode.window.showWarningMessage('No code in current file');
			updateStatusBar(WingmanState.Idle);
			return ["", "", ""];
		}

		const filePath = editor.document.fileName;
		const fileExt = path.extname(filePath); 

		let command = "";
		switch (fileExt) {
			case ".py":
				command = `python "${filePath}"`;
				break;
			case ".cpp":
				const execName = process.platform === "win32" ? "wingman.exe" : "./wingman";
				command = `g++ "${filePath}" -o wingman && ${execName}`;
				break;
			default:
				vscode.window.showWarningMessage(`Unsupported extension: ${fileExt}`);
				updateStatusBar(WingmanState.Idle);
				return ["", "", ""];
		}

		try {
			const { stdout, stderr } = await execPromise(command, { timeout: 5000 });
			return ["", stdout, stderr];
		} catch (error: any) {
			const errorMessage = error.message || JSON.stringify(error);
			const exitCode = error.code ?? "unknown";
			return [`Runtime error (exit code ${exitCode})`, error.stdout || "", error.stderr || ""];
		}
	}
	///////////////////////////////// run user code /////////////////////////////////////////////
	
	///////////////////////////// code walkthrough //////////////////////////////////////////////
	const askWingman = vscode.commands.registerCommand('wingman.askWingman', async () => {
		updateStatusBar(WingmanState.Running);
		const editor = vscode.window.activeTextEditor;
		if (!editor) {
			vscode.window.showErrorMessage('No active editor found');
			updateStatusBar(WingmanState.Idle);
			return;
		}
		const text = editor?.document.getText(editor.selection);
		if (!text) {
			vscode.window.showWarningMessage('No text selected');
			updateStatusBar(WingmanState.Idle);
			return;
		}
		updateStatusBar(WingmanState.Thinking);
		const output = vscode.window.createOutputChannel('Wingman');
		output.appendLine(`Selected Text:\n ${text}`);
		output.appendLine('🚀 Sending your code to Wingman...\n');
		output.show();

		try {
			const llm_req = await getLLMRequest();
			const payload: CodeWalkthroughRequest = {
				code: text,
				language: editor.document.languageId,
				llm_request: llm_req
			};
			output.appendLine(payload.llm_request.model);
			output.appendLine(payload.llm_request.provider);
			output.appendLine(payload.llm_request.api_key);
			const response = await axios.post<CodeWalkthroughResponse>(
				'http://127.0.0.1:8000/code-walkthrough', 
				payload
			);
			const walkthrough = response.data.walkthrough;
			
			for (const {segment, step} of walkthrough) {
				output.appendLine(`🔹Code Segement:\n${segment}\n`);
				output.appendLine(`🧠Explanation:\n${step}\n`);
			}
		} catch (err: any) {
			output.appendLine('❌ API call failed: ' + err.message);
		}
		output.appendLine('-----------------------------------------------------------------');
		updateStatusBar(WingmanState.Idle);
	});
	////////////////////////////////// code walkthrough ///////////////////////////////////////////

	//////////////////////////////// generate_testcases ///////////////////////////////////////////
	const generateTestcases = vscode.commands.registerCommand('wingman.generateTestcases', async () => {
		updateStatusBar(WingmanState.Running);
		const editor = vscode.window.activeTextEditor;
		if (!editor) {
			vscode.window.showErrorMessage('No active error found!');
			updateStatusBar(WingmanState.Idle);
			return;
		}
		const text = editor.document.getText(editor.selection);
		if (!text) {
			vscode.window.showWarningMessage('No text selected!');
			updateStatusBar(WingmanState.Idle);
			return;
		}
		const output = vscode.window.createOutputChannel('Wingman');
		output.show();
		setTimeout(async () => {
			const n = await vscode.window.showQuickPick(
				['1', '2', '3', '4', '5'],
				{
					title: 'Select the number of testcases to be generated.',
					placeHolder: 'Choose number of testcases'
				}
			);
			if (!n) {
				vscode.window.showWarningMessage('Cancelled test case generation.');
				updateStatusBar(WingmanState.Idle);
				return ;
			}
			output.appendLine('🚀 Sending your code to wingman!');
			try {
				const llm_req = await getLLMRequest();
				const payload: GenerateTestCasesRequest = {
					code: text,
					num_testcases: n,
					language: editor.document.languageId,
					llm_request: llm_req
				};

				const response = await axios.post<GenerateTestCasesResponse>(
					'http://127.0.0.1:8000/generate-testcases',
					payload
				);

				const testcases = response.data.testcases;
				output.appendLine('🧪 Generated Test Cases:\n');

				for (const [index, testCase] of testcases.entries()) {
					output.appendLine(`🔸 Test Case ${index + 1}`);
					output.appendLine(`   ➤ Input: ${JSON.stringify(testCase.input, null, 4)}`);
					output.appendLine(`   ➤ Expected Output: ${testCase.expected_output}`);
					if (testCase.explanation) {
						output.appendLine(`   💬 Explanation: ${testCase.explanation}`);
					}
					output.appendLine('\n');
				}
			} catch(err: any){
				output.appendLine('❌ API call failed: ' + err.message);
			}
			output.appendLine('-----------------------------------------------------------------');
			updateStatusBar(WingmanState.Idle);
		}, 100);
	});
	//////////////////////////////// generate_testcases ///////////////////////////////////////////
	
	///////////////////////////////  expalin errors ///////////////////////////////////////////////
	const explainErrors = vscode.commands.registerCommand('wingman.explainErrors', async () => {
		updateStatusBar(WingmanState.Running);
		const editor = vscode.window.activeTextEditor;

		if (!editor) {
			vscode.window.showErrorMessage('No active editor found!');
			updateStatusBar(WingmanState.Idle);
			return;
		}

		const text = editor.document.getText();
		if (!text) {
			vscode.window.showWarningMessage('No text found!');
			updateStatusBar(WingmanState.Idle);
			return;
		}

		const userChoice = await vscode.window.showInformationMessage(
			"Do you want Wingman to run your code to check for errors?",
			{ modal: true },
			"Yes", "No"
		);

		if (userChoice !== "Yes") {
			vscode.window.showInformationMessage("Wingman cancelled the check.");
			updateStatusBar(WingmanState.Idle);
			return;
		}

		const output = vscode.window.createOutputChannel('Wingman');
		output.show(true);
		output.appendLine(`🧪 Running your code: ...`);

		const [errorMessage, stdoutMessage, stderrMessage] = await runUserCode(editor);
		if (!(errorMessage?.trim() || stderrMessage?.trim())) {
			vscode.window.showInformationMessage('✅ Your code is already perfect.');
			updateStatusBar(WingmanState.Idle);
			return;
		}
		try {
			const llm_req = await getLLMRequest();
			const payload: ExplainErrorsRequest = {
				code: text,
				error_message: errorMessage || stderrMessage || stdoutMessage,
				language: editor.document.languageId,
				llm_request: llm_req
			};

			output.appendLine('🚀 Sending your code and errors to Wingman...');

			const response = await axios.post<ExplainErrorsResponse>(
				'http://127.0.0.1:8000/explain-errors',
				payload
			);

			const explain = response.data.explanation;
			const possible_fixes = response.data.possible_causes ?? [];

			output.appendLine(`🧠 Explanation:\n${explain}`);
			output.appendLine('🛠️ Possible Fixes:');
			for (const fix of possible_fixes) {
				output.appendLine(`- ${fix}`);
			}
		} catch (err: any) {
			output.appendLine('❌ API call failed: ' + err.message);
		} finally {
			output.appendLine('---------------------------------------------');
			updateStatusBar(WingmanState.Idle);
		}
	});

/////////////////////////////// explain errors ////////////////////////////////////////////////

/////////////////////////////// suggest fixes ////////////////////////////////////////////////
const suggestFixes = vscode.commands.registerCommand('wingman.suggestFixes', async () => {
	updateStatusBar(WingmanState.Running);
    const editor = vscode.window.activeTextEditor;

    if (!editor) {
        vscode.window.showErrorMessage('No active editor found!');
        updateStatusBar(WingmanState.Idle);
        return;
    }

    const text = editor.document.getText();
    if (!text) {
        vscode.window.showWarningMessage('No text found!');
        updateStatusBar(WingmanState.Idle);
        return;
    }

    const userChoice = await vscode.window.showInformationMessage(
        "Do you want Wingman to run your code to check for errors?",
        { modal: true },
        "Yes", "No"
    );

    if (userChoice !== "Yes") {
        vscode.window.showInformationMessage("Wingman cancelled the check.");
        updateStatusBar(WingmanState.Idle);
        return;
    }

    const panel = vscode.window.createWebviewPanel(
        'wingmanFixes',
        'Wingman Fix Suggestions',
        vscode.ViewColumn.Beside,
        { enableScripts: true }
    );

    panel.webview.html = '<html><body><h3>🧪 Running your code...</h3></body></html>';

    const [errorMessage, stdoutMessage, stderrMessage] = await runUserCode(editor);

    let initialMessage = '<h3>✅ Your code is free of errors.</h3>';
    if (errorMessage?.trim() || stderrMessage?.trim()) {
        initialMessage = `<h3>⚠️ Detected Issues</h3><pre>${errorMessage || stderrMessage || stdoutMessage}</pre>`;
    }
	panel.webview.html = `<html><body>${initialMessage}<h3>🚀 Sending your code to Wingman for further analysis...</h3></body></html>`;

    const prompt = await vscode.window.showInputBox({
        prompt: 'Tell Wingman what is wrong with your code (optional if detected errors)',
        placeHolder: 'e.g., Should have printed 42 but it printed 0',
    });
	if (!prompt) {
		vscode.window.showInformationMessage("Wingman cancelled the check.");
        updateStatusBar(WingmanState.Idle);
        return;
	}

    try {
		const llm_req = await getLLMRequest();
        const payload: SuggestFixesRequest = {
            code: text,
            error_message: errorMessage || stderrMessage || stdoutMessage,
            user_request: prompt || "",
            language: editor.document.languageId,
			llm_request: llm_req
        };

        const response = await axios.post<SuggestFixesResponse>(
            'http://127.0.0.1:8000/suggest-fixes',
            payload
        );

        const fixed_code = response.data.fixed_code;
        const fixes = response.data.fixes ?? [];
        const differences = response.data.differences ?? [];

        let htmlContent = `${initialMessage}`;
        if (fixes.length > 0) {
            htmlContent += '<h3>🧠 Suggested Fixes:</h3><ul>' + fixes.map(fix => `<li>${fix}</li>`).join('') + '</ul>';
        }
		if (fixed_code.length > 0) {
			htmlContent += '<h3> Fixed Code:</h3><pre><code>' + fixed_code + '</code></pre>';
		}
        if (differences.length > 0) {
            htmlContent += '<h3>🧾 Differences:</h3><ul>' + differences.map(diff => `<li>${diff}</li>`).join('') + '</ul>';
        }

        if (fixed_code) {
			htmlContent += `
				<h3>🔧 Apply Fix:</h3>
				<button onclick="applyFix()" style="
					background-color: #007acc;
					color: white;
					padding: 10px 16px;
					border: none;
					border-radius: 6px;
					cursor: pointer;
					font-size: 14px;
					margin-top: 10px;
					transition: background-color 0.3s ease;
				" onmouseover="this.style.backgroundColor='#005a9e'"
				onmouseout="this.style.backgroundColor='#007acc'">
					💾 Apply wingman fixes
				</button>`;
		}


        panel.webview.html = `
            <html>
            <body>
                ${htmlContent}
                <script>
                    const vscode = acquireVsCodeApi();
                    function applyFix() {
                        vscode.postMessage({ command: 'applyFix' });
                    }
                </script>
            </body>
            </html>
        `;

        panel.webview.onDidReceiveMessage(async message => {
            if (message.command === 'applyFix' && fixed_code) {
                const edit = new vscode.WorkspaceEdit();
                const fullRange = new vscode.Range(
                    editor.document.positionAt(0),
                    editor.document.positionAt(text.length)
                );
                edit.replace(editor.document.uri, fullRange, fixed_code);
                await vscode.workspace.applyEdit(edit);
                vscode.window.showInformationMessage("✅ Wingman's fix applied!");
            }
        }, undefined, undefined);

    } catch (err: any) {
        panel.webview.html = `<html><body><h3>❌ API call failed: ${err.message}</h3></body></html>`;
    } finally {
        updateStatusBar(WingmanState.Idle);
    }
});

const setLLMProvider = vscode.commands.registerCommand('wingman.setLLMProvider', async() => {
	const providers = ['GOOGLE'];
	const provider = await vscode.window.showQuickPick(
        providers,
        {
            title: 'Choose an LLM Provider',
            placeHolder: 'Choose an LLM Provider'
        }
    );
	if (!provider) {
		vscode.window.showWarningMessage('No provider selected!');
		return;
	}
	await context.secrets.store('provider', provider);
});
const setLLMModel = vscode.commands.registerCommand('wingman.setLLMModel', async() => {
	let models: string[] = [];
	let provider = await context.secrets.get('provider');
	if (!provider){
		await vscode.commands.executeCommand('wingman.setLLMProvider');
		provider = await context.secrets.get('provider');
	}
	if (provider === 'GOOGLE') {
		models = [
			'gemini-2.5-pro', 
			'gemini-2.5-flash',
			'gemini-2.5-flash-lite', 
			'gemini-2.0-flash', 
			'gemini-2.0-flash-lite', 
			'gemma-3', 
			'gemini-1.5-flash', 
			'gemini-1.5-pro'
		];
	}
	const model = await vscode.window.showQuickPick(
		models,
		{
			title: `Choose a ${provider} model`,
			placeHolder: `Choose a ${provider} model`
		}
	);
	if (!model) {
		vscode.window.showWarningMessage('No model selected!');
		return;
	}
	await context.secrets.store('model', model);
});

const setAPIKey = vscode.commands.registerCommand('wingman.setAPIKey', async() => {
	let provider = await context.secrets.get('provider');
	if (!provider) {
		await vscode.commands.executeCommand('wingman.setLLMProvider');
		provider = await context.secrets.get('provider');
	}
	const api_key = await vscode.window.showInputBox({
		prompt: `Enter your ${provider}_API_KEY`,
		ignoreFocusOut: true,
		password: true
	});
	if (!api_key) {
        vscode.window.showErrorMessage('API Key is required!');
        return;
    }
	await context.secrets.store(`${provider}_API_KEY`, api_key);
});

/////////////////////////////// suggest fixes ////////////////////////////////////////////////

	context.subscriptions.push(statusBar);
	context.subscriptions.push(askWingman);
	context.subscriptions.push(generateTestcases);
	context.subscriptions.push(explainErrors);
	context.subscriptions.push(suggestFixes);
	context.subscriptions.push(setAPIKey);
	context.subscriptions.push(setLLMModel);
	context.subscriptions.push(setLLMProvider);
}

export function deactivate() {}
