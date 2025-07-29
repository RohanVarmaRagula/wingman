# Wingman

Meet **Wingman** — the AI that assists, not insists. Wingman is your sidekick that debugs, explains, and tests… only when summoned.  
Forget copy-pasting into ChatGPT or losing focus jumping between tabs. Wingman lives in your editor, ready to break down errors, suggest smart fixes, or whip up test cases — without taking the wheel.  

Because real devs don’t want AI writing their code — they want AI helping them write better code.

---

## ✨ Features

### 1. Code Walkthrough  
Understand what a piece of code is doing, step by step. Select the code you want explained — Wingman reads your selection and breaks it down in plain language, helping you grasp logic, flow, and potential pitfalls.  
<video controls src="https://raw.githubusercontent.com/RohanVarmaRagula/wingman/main/assets/codewalkthrough.mp4" title="Code Walkthrough"></video>

### 2. Generate Testcases  
Wingman generates sample test cases for your functions or selected code — right in your editor.  
Support for edge cases and property-based testing is coming soon.  
<video controls src="https://raw.githubusercontent.com/RohanVarmaRagula/wingman/main/assets/generatetestcases.mp4" title="Generate Testcases"></video>

### 3. Explain Errors  
Wingman reads your terminal output, stack traces, or compile-time errors and explains what went wrong — in English.  
<video controls src="https://raw.githubusercontent.com/RohanVarmaRagula/wingman/main/assets/explainerrors.mp4" title="Explain Errors"></video>

### 4. Suggest Fixes  
Wingman analyzes your code and its errors to suggest contextual, intelligent fixes — and teaches you *why* it works.  
<video controls src="https://raw.githubusercontent.com/RohanVarmaRagula/wingman/main/assets/suggestfixes.mp4" title="Suggest Fixes"></video>

---

## ⚙️ Setup & Configuration

Wingman supports **multiple LLM providers**. You can choose the one that works best for you:

### 1. Select Your LLM Provider  
For now we only have **Google**. Will bring others and **Ollama** in future versions.

### 2. Choose the Model  
Pick your preferred model like `gemini-1.5-pro`, `gemini-1.5-flash`, etc. Wingman lets you switch models anytime based on your needs and budget.

### 3. Set Your API Key  
On first run (or when using a new provider), Wingman will prompt you to enter your API key.  
These keys are stored securely using VS Code’s Secrets API.

You can set/change them from the command palette:  
**`Wingman: Set API Key`**

### 4. Reset All Secrets  
Want a fresh start? Use the command:  
**`Wingman: Reset Secrets`**  
This will clear all stored keys and provider/model settings.

---

## 🔧 Requirements

None yet — Wingman runs out of the box!  


**Enjoy.** 🛩️
