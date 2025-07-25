import * as vscode from 'vscode';
import axios, { create } from 'axios';
import {CodeWalkthroughRequest, CodeWalkthroughResponse, GenerateTestCasesRequest, GenerateTestCasesResponse ,ExplainErrorsRequest, ExplainErrorsResponse,SuggestFixesRequest, SuggestFixesResponse} from './schemas';
import * as path from 'path';
import { exec } from 'child_process';
import * as util from 'util';


export function activate(context: vscode.ExtensionContext) {
	console.log('Congratulations, your extension "wingman" is now active!');

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
			const payload: CodeWalkthroughRequest = {
				code: text,
				language: editor.document.languageId
			};
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
				const payload: GenerateTestCasesRequest = {
					code: text,
					num_testcases: n,
					language: editor.document.languageId
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
		output.appendLine('Error :' + errorMessage) ;
		output.appendLine('Stderr :' + stderrMessage);
		output.appendLine('Stdout : ' + stdoutMessage);
		if (!(errorMessage?.trim() || stderrMessage?.trim())) {
			vscode.window.showInformationMessage('✅ Your code is already perfect.');
			updateStatusBar(WingmanState.Idle);
			return;
		}
		try {
			const payload: SuggestFixesRequest = {
				code: text,
				error_message: errorMessage || stderrMessage || stdoutMessage,
				language: editor.document.languageId
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
	
	context.subscriptions.push(statusBar);
	context.subscriptions.push(askWingman);
	context.subscriptions.push(generateTestcases);
	context.subscriptions.push(explainErrors);
}

export function deactivate() {}
