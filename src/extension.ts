import * as vscode from 'vscode';
import axios from 'axios';
import { Greet } from './schemas';
import {CodeWalkthroughRequest, CodeWalkthroughResponse} from './schemas'
import { GenerateTestCasesRequest, GenerateTestCasesResponse } from './schemas';

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

	function updateStaturBar(state: WingmanState) {
		statusBar.text = `$(zap) Wingman's ${state}`;
	}
	updateStaturBar(WingmanState.Idle);
	statusBar.show();
	/////////////////////////////////   STATUS BAR   ///////////////////////////////////////////


	////////////////////////////////    helloWorld   ////////////////////////////////////////////
	const disposable = vscode.commands.registerCommand('wingman.helloWorld', () => {
		vscode.window.showInformationMessage("Wingman say's hello!");
	});
	////////////////////////////////    helloWorld   ////////////////////////////////////////////

	
	///////////////////////////// code walkthrough //////////////////////////////////////////////
	const askWingman = vscode.commands.registerCommand('wingman.askWingman', async () => {
		updateStaturBar(WingmanState.Running);
		const editor = vscode.window.activeTextEditor;
		if (!editor) {
			vscode.window.showErrorMessage('No active editor found');
			updateStaturBar(WingmanState.Idle);
			return;
		}
		const text = editor?.document.getText(editor.selection);
		if (!text) {
			vscode.window.showWarningMessage('No text selected');
			updateStaturBar(WingmanState.Idle);
			return;
		}
		updateStaturBar(WingmanState.Thinking);
		const output = vscode.window.createOutputChannel('Wingman');

		output.clear();
		output.appendLine(`Selected Text:\n ${text}`);
		output.appendLine('Sending your code to Wingman...\n');
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
			output.appendLine('API Call failed');
		}
		output.appendLine('-----------------------------------------------------------------');
		updateStaturBar(WingmanState.Idle);
	});
	////////////////////////////////// code walkthrough ///////////////////////////////////////////

	//////////////////////////////// generate_testcases ///////////////////////////////////////////
	const generateTestcases = vscode.commands.registerCommand('wingman.generateTestcases', async () => {
		updateStaturBar(WingmanState.Running);
		const editor = vscode.window.activeTextEditor;
		if (!editor) {
			vscode.window.showErrorMessage('No active error found!');
			updateStaturBar(WingmanState.Idle);
			return;
		}
		const text = editor.document.getText(editor.selection);
		if (!text) {
			vscode.window.showWarningMessage('No text selected!');
			updateStaturBar(WingmanState.Idle);
			return;
		}
		const output = vscode.window.createOutputChannel('Wingman');
		output.show();
		setTimeout(async () => {
			const n = await vscode.window.showQuickPick(
				['1', '2', '3', '4', '5'],
				{
					title: 'Select the number of testcases to be generated.',
					placeHolder: 'Choose 1-5 testcases'
				}
			);
			if (!n) {
				vscode.window.showWarningMessage('Cancelled test case generation.');
				updateStaturBar(WingmanState.Idle);
				return ;
			}
			output.appendLine('Sending your code to wingman!');
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
					output.appendLine(`   ➤ Input: ${JSON.stringify(testCase.input, null, 2)}`);
					output.appendLine(`   ➤ Expected Output: ${testCase.expected_output}`);
					if (testCase.explanation) {
						output.appendLine(`   💬 Explanation: ${testCase.explanation}`);
					}
					output.appendLine('\n');
				}
			} catch(err: any){
				output.appendLine('API Call failed');
			}
			output.appendLine('-----------------------------------------------------------------');
			updateStaturBar(WingmanState.Idle);
		}, 100);
	});
	//////////////////////////////// generate_testcases ///////////////////////////////////////////
	
	context.subscriptions.push(statusBar);
	context.subscriptions.push(disposable);
	context.subscriptions.push(askWingman);
	context.subscriptions.push(generateTestcases);
}

export function deactivate() {}
