/**
 * Prompt templates for AI-powered single test case generation from plain English.
 */

export const aiGenerateSystemPrompt = `
You are an expert QA test designer. You generate a SINGLE machine-readable automated test case from a plain-English requirement description.

The test case must be suitable for execution by a deterministic Playwright-based test runner.

Target rules (VERY IMPORTANT for the executor):
- Use semantic targets in the form "type:label" where label is the VISIBLE text/label a real user sees.
  - "input:Email", "input:Password", "input:Confirm Password"
  - "button:Create Account", "button:Sign In", "button:Add Task"
  - "link:Forgot Password"
  - "text:Invalid credentials", "toast:Success"
  - "table:Tasks", "checkbox:Remember me", "select:Country"
- For buttons/links, prefer the ACTUAL button text implied by the requirement.
- Do NOT invent random CSS selectors.
- If there are multiple similar elements, use the container syntax: "button:Choose file | container:Section label"

Navigation ("goto") rules:
- ALWAYS set "action": "goto" and "target": "" (empty).
- Put a REAL, conventional relative route in "value". Infer it from the feature:
  - Registration -> "/register"   Login -> "/login"   Home -> "/"
  - Dashboard -> "/dashboard"   Task list -> "/tasks"   Profile -> "/profile"   Settings -> "/settings"
- Use a leading slash.

Structured expectations (per step, optional but strongly encouraged):
- "expected_url": if this step should cause navigation, put the relative path the app should be on AFTER the step.
- "expected_text": a visible text/message that should appear after the step.

Allowed actions:
- goto, click, fill, select, check, uncheck, hover, press, upload
- waitFor, assertText, assertVisible, assertHidden, assertURLContains
- assertValue, assertCount, screenshot

Output must be valid JSON only matching the schema below.
Do not include markdown code block wrappers or other text.
`;

export function buildAiGenerateUserPrompt({ requirement, module, priority }) {
  return `
Generate a single test case from the following plain-English requirement.

Output schema:
{
  "id": "TC-<timestamp>",
  "title": "<concise test case title>",
  "description": "<brief description>",
  "module": "${module || 'General'}",
  "feature": "",
  "priority": "${priority || 'Medium'}",
  "severity": "Major",
  "type": "functional",
  "scenario_type": "positive",
  "tags": [],
  "preconditions": [],
  "test_data": {},
  "steps": [
    {
      "step_number": 1,
      "action": "goto",
      "target": "",
      "value": "/login",
      "description": "Navigate to the login page",
      "expected": "",
      "expected_url": "/login",
      "expected_text": ""
    }
  ],
  "expected_result": "<what should happen when the test passes>",
  "cleanup_steps": [],
  "source_requirements": []
}

Rules:
- Generate exactly ONE test case.
- Include all necessary steps to complete the scenario described.
- Use semantic "type:VisibleLabel" targets (e.g. "button:Create Account", "input:Email").
- For "goto", put a real relative route in "value" (e.g. "/login").
- Set "expected_url" / "expected_text" on steps that cause navigation or show a message.
- Add assertText or assertURLContains steps after important submits to verify the outcome.
- Use realistic but generic test data (e.g. "john@example.com", "Password123!").
- The id should be "TC-" followed by a unique number.

User requirement:
${requirement}
`;
}
