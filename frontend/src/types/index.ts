export interface Project {
  _id: string
  projectName: string
  projectDescription: string
  documentName: string
  originalFileName: string
  status: 'uploaded' | 'analyzing' | 'analyzed' | 'tests_generated' | 'failed'
  errorMessage?: string
  createdAt: string
  processingCompletedAt?: string
  hasTestSuite?: boolean
  testCasesCount?: number
  parsedText?: string
}

export interface ProjectDetail {
  project: Project
  requirementAnalysis: any | null
  testSuite: any | null
}

export interface Step {
  step_number: number
  action: string
  target: string
  value: string
  description: string
  expected: string
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
  scenario_type?: string
  tags: string[]
  preconditions: string[]
  test_data: any
  steps: Step[]
  expected_result: string
  cleanup_steps: string[]
  source_requirements: any[]
}
