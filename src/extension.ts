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
		let provider = await waitForSecret('provider');
		if (!provider) {
			await vscode.commands.executeCommand('wingman.setLLMProvider');
			provider = await waitForSecret('provider');
		}
		let model = await waitForSecret('model');
		if (!model) {
			await vscode.commands.executeCommand('wingman.setLLMModel');
			model = await waitForSecret('model');
		}
		let api_key = await waitForSecret(`${provider}_API_KEY`);
		if (!api_key) {
			await vscode.commands.executeCommand('wingman.setAPIKey');
			api_key = await waitForSecret(`${provider}_API_KEY`);
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

		const text = editor.document.getText(editor.selection);
		if (!text) {
			vscode.window.showWarningMessage('No text selected');
			updateStatusBar(WingmanState.Idle);
			return;
		}

		updateStatusBar(WingmanState.Thinking);

		try {
			const llm_req = await getLLMRequest();
			const payload: CodeWalkthroughRequest = {
				code: text,
				language: editor.document.languageId,
				llm_request: llm_req
			};

			const response = await axios.post<CodeWalkthroughResponse>(
				'https://wingman-chi.vercel.app/code-walkthrough',
				payload
			);
			const walkthrough = response.data.walkthrough;

			const panel = vscode.window.createWebviewPanel(
				'wingmanWalkthrough',
				'🧠 Wingman Walkthrough',
				vscode.ViewColumn.Beside,
				{ enableScripts: true }
			);

			let htmlContent = `
				<!DOCTYPE html>
				<html lang="en">
				<head>
					<meta charset="UTF-8">
					<meta name="viewport" content="width=device-width, initial-scale=1.0">
					<style>
						body {
							font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
							padding: 1rem 2rem;
							background-color: #1e1e1e;
							color: #d4d4d4;
						}
						h2 {
							color: #61dafb;
						}
						.code-cell {
							background-color: #2d2d2d;
							color: #dcdcdc;
							padding: 1rem;
							border-radius: 10px;
							font-family: Consolas, 'Courier New', monospace;
							font-size: 13px;
							white-space: pre-wrap;
							overflow-x: auto;
							margin-bottom: 1rem;
							box-shadow: 0 0 10px #00000066;
						}
						hr {
							border: none;
							border-top: 1px solid #555;
							margin: 2rem 0;
						}
					</style>
				</head>
				<body>
					<h2>🧠 Wingman Walkthrough</h2>
					<p><strong>Language:</strong> ${editor.document.languageId}</p>
					<hr>
			`;

			for (const { segment, step } of walkthrough) {
				htmlContent += `
					<div class="code-cell"><strong>🔹Code Segment:</strong>\n${segment.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</div>
					<div class="code-cell"><strong>🧠 Explanation:</strong>\n${step.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</div>
				`;
			}

			htmlContent += `
				<hr>
				<p>✨ End of Walkthrough</p>
				</body>
				</html>
			`;

			panel.webview.html = htmlContent;

		} catch (err: any) {
			vscode.window.showErrorMessage('❌ Wingman API failed: ' + err.message);
		}

		updateStatusBar(WingmanState.Idle);
	});

	////////////////////////////////// code walkthrough ///////////////////////////////////////////

	//////////////////////////////// generate_testcases ///////////////////////////////////////////
	const generateTestcases = vscode.commands.registerCommand('wingman.generateTestcases', async () => {
		updateStatusBar(WingmanState.Running);
		const editor = vscode.window.activeTextEditor;
		if (!editor) {
			vscode.window.showErrorMessage('No active editor found!');
			updateStatusBar(WingmanState.Idle);
			return;
		}

		const text = editor.document.getText(editor.selection);
		if (!text) {
			vscode.window.showWarningMessage('No text selected!');
			updateStatusBar(WingmanState.Idle);
			return;
		}

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
				return;
			}

			try {
				const llm_req = await getLLMRequest();
				const payload: GenerateTestCasesRequest = {
					code: text,
					num_testcases: n,
					language: editor.document.languageId,
					llm_request: llm_req
				};

				const response = await axios.post<GenerateTestCasesResponse>(
					'https://wingman-chi.vercel.app/generate-testcases',
					payload
				);

				const testcases = response.data.testcases;

				const panel = vscode.window.createWebviewPanel(
					'wingmanTestcases',
					'Wingman: Generated Testcases',
					vscode.ViewColumn.Two,
					{
						enableScripts: true,
						retainContextWhenHidden: true,
					}
				);

				const html = `
					<!DOCTYPE html>
					<html lang="en">
					<head>
						<meta charset="UTF-8">
						<style>
							body {
								font-family: Consolas, monospace;
								padding: 20px;
								background-color: #1e1e1e;
								color: #d4d4d4;
							}
							code, pre {
								background-color: #252526;
								padding: 1em;
								border-radius: 8px;
								display: block;
								white-space: pre-wrap;
								word-break: break-word;
							}
							.testcase {
								margin-bottom: 24px;
							}
							h2 {
								color: #569cd6;
							}
							.expl {
								color: #c586c0;
								margin-top: 0.5em;
							}
						</style>
					</head>
					<body>
						<h2>🧪 Generated Test Cases</h2>
						${testcases.map((testCase, idx) => `
							<div class="testcase">
								<h3>🔸 Test Case ${idx + 1}</h3>
								<pre><code><strong>Input:</strong> ${JSON.stringify(testCase.input, null, 4)}</code></pre>
								<pre><code><strong>Expected Output:</strong> ${testCase.expected_output}</code></pre>
								${testCase.explanation ? `<div class="expl">💬 ${testCase.explanation}</div>` : ''}
							</div>
						`).join('')}
					</body>
					</html>
				`;

				panel.webview.html = html;

			} catch (err: any) {
				const errorPanel = vscode.window.createWebviewPanel(
					'wingmanTestcaseError',
					'Wingman: Error',
					vscode.ViewColumn.Two,
					{}
				);
				errorPanel.webview.html = `<h3 style="color: red;">❌ API call failed:</h3><pre>${err.message}</pre>`;
			}

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

			const response = await axios.post<ExplainErrorsResponse>(
				'https://wingman-chi.vercel.app/explain-errors',
				payload
			);

			const explanation = response.data.explanation;
			const possibleFixes = response.data.possible_causes ?? [];

			const panel = vscode.window.createWebviewPanel(
				'wingmanExplainErrors',
				'Wingman – Error Explanation',
				vscode.ViewColumn.Beside,
				{ enableScripts: true }
			);

			const fixesHTML = possibleFixes.length > 0
				? `<ul>${possibleFixes.map(fix => `<li>${fix}</li>`).join('')}</ul>`
				: '<p>No possible fixes found.</p>';

			panel.webview.html = `
				<!DOCTYPE html>
				<html lang="en">
				<head>
					<meta charset="UTF-8">
					<meta name="viewport" content="width=device-width, initial-scale=1.0">
					<title>Wingman – Explanation</title>
					<style>
						body {
							font-family: "Segoe UI", sans-serif;
							padding: 20px;
							background-color: #1e1e1e;
							color: #d4d4d4;
						}
						h2, h3 {
							color: #4FC3F7;
						}
						code {
							background-color: #2d2d2d;
							padding: 4px 6px;
							border-radius: 4px;
						}
						ul {
							padding-left: 20px;
						}
						li {
							margin-bottom: 8px;
						}
					</style>
				</head>
				<body>
					<h2>🧠 Explanation</h2>
					<p>${explanation}</p>
					<h3>🛠️ Possible Fixes</h3>
					${fixesHTML}
					<hr/>
					<small>Wingman | AI-powered debugging assistant</small>
				</body>
				</html>
			`;

		} catch (err: any) {
			vscode.window.showErrorMessage('Wingman failed to explain the error: ' + err.message);
		} finally {
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
            'https://wingman-chi.vercel.app/suggest-fixes',
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
			htmlContent += `
				<h3>🛠️ Fixed Code:</h3>
				<div style="
					background-color: #1e1e1e;
					color: #d4d4d4;
					padding: 1em;
					border-radius: 8px;
					font-family: Consolas, 'Courier New', monospace;
					font-size: 13px;
					white-space: pre;
					overflow-x: auto;
					margin-bottom: 1em;
					position: relative;
					text-align: left;
				">
					<button onclick="copyFixedCode()" style="
						position: absolute;
						top: 10px;
						right: 10px;
						background-color: #007acc;
						color: white;
						border: none;
						border-radius: 4px;
						padding: 4px 8px;
						cursor: pointer;
						font-size: 12px;
					">📋 Copy</button>
					${fixed_code.replace(/</g, "&lt;").replace(/>/g, "&gt;")}
				</div>
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
					💾 Apply Wingman Fixes
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

					function copyFixedCode() {
						const codeText = \`${fixed_code.replace(/`/g, '\\`')}\`;
						navigator.clipboard.writeText(codeText).then(() => {
							alert('✅ Copied to clipboard!');
						}).catch(err => {
							alert('❌ Copy failed: ' + err);
						});
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

async function waitForSecret(key: string, maxAttempts = 5, delay = 500): Promise<string | undefined> {
	for (let i = 0; i < maxAttempts; i++) {
		const value = await context.secrets.get(key);
		if (value) {return value;}
		await new Promise(resolve => setTimeout(resolve, delay));
	}
	return undefined;
}


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
	let provider = await waitForSecret('provider');
	if (!provider){
		await vscode.commands.executeCommand('wingman.setLLMProvider');
		provider = await waitForSecret('provider');
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
	let provider = await waitForSecret('provider');
	if (!provider) {
		await vscode.commands.executeCommand('wingman.setLLMProvider');
		provider = await waitForSecret('provider');
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

const resetSecrets = vscode.commands.registerCommand("wingman.resetSecrets", async () => {
    const confirm = await vscode.window.showWarningMessage(
        "Are you sure you want to reset all Wingman secrets?",
        { modal: true },
        "Yes", "No"
    );
	if (confirm === "No") {
		return;
	}
	const keys = ['provider', 'model', 'GOOGLE_API_KEY', 'OPENAI_API_KEY', 'ANTHROPIC_API_KEY'];
    for (const key of keys) {
        await context.secrets.delete(key);
    }
    vscode.window.showInformationMessage("Wingman secrets have been reset.");
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
	context.subscriptions.push(resetSecrets);
}

export function deactivate() {}
