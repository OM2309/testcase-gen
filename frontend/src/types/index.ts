export interface SrsDocument {
  _id: string
  originalFileName: string
  filePath: string
  parsedText: string
  uploadedAt: string
}

export interface Project {
  _id: string
  projectName: string
  projectDescription: string
  documentName: string
  originalFileName: string
  status: 'created' | 'uploaded' | 'analyzing' | 'analyzed' | 'tests_generated' | 'failed'
  errorMessage?: string
  createdAt: string
  processingCompletedAt?: string
  hasTestSuite?: boolean
  testCasesCount?: number
  parsedText?: string
  srsDocuments?: SrsDocument[]
  assignedUsers?: any[]
  jiraHost?: string
  jiraEmail?: string
  jiraProjectKey?: string
  jiraConnected?: boolean
}

export interface Agent0Feedback {
  score?: number
  summary: string
  strengths: string[]
  missing_details: string[]
  ambiguities: string[]
  recommendations: string[]
}

export interface SuggestedTestCase {
  id: string
  title: string
  description: string
  module: string
  feature: string
  priority: string
  scenario_type: string
  preconditions: string[]
  steps: Step[]
  expected_result: string
  tags: string[]
}

export interface GapFillItem {
  id: string
  original_issue: string
  category: 'missing_detail' | 'ambiguity'
  ai_filled_detail: string
  confidence: 'high' | 'medium' | 'low'
  suggested_test_cases: SuggestedTestCase[]
}

export interface GapFillData {
  filled_gaps: GapFillItem[]
}

export interface RequirementAnalysis {
  _id: string
  projectId: string
  srsDocumentId: string | null
  analyzedData: any
  status: string
  agent0Score?: number | null
  agent0Feedback?: Agent0Feedback | string | null
  agent0Status?: 'pending' | 'completed' | 'failed' | null
  gapFillData?: GapFillData | null
  gapFillStatus?: 'pending' | 'completed' | 'failed' | null
}

export interface TestSuiteData {
  _id: string
  projectId: string
  srsDocumentId: string | null
  suiteName: string
  projectName: string
  testCases: TestCase[]
}

export interface ProjectDetail {
  project: Project
  requirementAnalyses: RequirementAnalysis[]
  testSuites: TestSuiteData[]
}

export interface Step {
  step_number: number
  action: string
  target: string
  value: string
  description: string
  expected: string
  expected_url?: string
  expected_text?: string
}

export interface TestCase {
  id: string
  title: string
  description: string
  module: string
  feature: string
  priority: string
  severity?: string
  type: string
  isRegressive?: boolean
  scenario_type?: string
  tags: string[]
  preconditions: string[]
  test_data: any
  steps: Step[]
  expected_result: string
  cleanup_steps: string[]
  source_requirements: any[]
}

/* ----------------------------- Execution (Agent 3) ----------------------------- */

export type RunStatus = 'queued' | 'running' | 'completed' | 'failed'
export type TestCaseStatus = 'pending' | 'running' | 'passed' | 'failed' | 'skipped'
export type StepStatus = 'pending' | 'running' | 'passed' | 'failed'
export type LogLevel = 'info' | 'success' | 'error'

export interface StepResult {
  stepNumber: number
  action: string
  target: string
  value: string
  expectedUrl?: string
  expectedText?: string
  status: StepStatus
  startedAt?: string | null
  completedAt?: string | null
  durationMs: number
  errorMessage?: string
}

export interface TestCaseResult {
  testCaseId: string
  title: string
  module: string
  feature: string
  status: TestCaseStatus
  startedAt?: string | null
  completedAt?: string | null
  durationMs: number
  failedStepNumber?: number | null
  errorMessage?: string
  screenshotPath?: string
  stepResults: StepResult[]
}

export interface ExecutionLog {
  timestamp: string
  level: LogLevel
  type: string
  message: string
  testCaseId?: string
  stepNumber?: number | null
}

export interface TestRun {
  _id: string
  projectId: string
  testSuiteId: string
  suiteName: string
  projectName: string
  status: RunStatus
  startedAt?: string | null
  completedAt?: string | null
  totalTests: number
  passedTests: number
  failedTests: number
  skippedTests: number
  runConfig: {
    baseUrl: string
    headless: boolean
  }
  currentTestCaseId?: string
  currentTestCaseTitle?: string
  currentStepNumber?: number
  currentStepAction?: string
  testCaseResults: TestCaseResult[]
  executionLogs: ExecutionLog[]
  createdAt: string
  updatedAt: string
}

export interface StartExecutionParams {
  projectId: string
  testSuiteId: string
  baseUrl: string
  headless: boolean
  testCaseIds?: string[]
}
