// 0. Greet
export interface Greet{
    message:string
}

//1. Explain Errors
export interface ExplainErrorsRequest{
    code: string,
    error_message: string,
    language?: string;
}

export interface ExplainErrorsResponse{
    explanation: string,
    possible_causes?: string[]
}

//2. Suggest Fixes
export interface SuggestFixesRequest{
    code: string,
    error_message: string,
    language?: string
}

export interface SuggestFixesResponse{
    fixed_code: string,
    fixes?: string[],
    differences?: string[]
}

//3. Generate Testcases
export interface GenerateTestCasesRequest{
    code: string,
    code_explanation?: string,
    num_testcases: string,
    language?: string
}

export interface TestCase{
    input: Record<string, any>,
    expected_output: string,
    explanation?: string
}

export interface GenerateTestCasesResponse{
    testcases: TestCase[]
}

//4. Code Walkthrough
export interface CodeWalkthroughRequest{
    code: string,
    focus_on?: string,
    language?: string
}

export interface CodeSegmentExplanation{
    segment: string,
    step: string
}

export interface CodeWalkthroughResponse{
    walkthrough: CodeSegmentExplanation[]
}