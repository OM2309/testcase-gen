import { runAnalyzerAgent } from './agents/analyzerAgent.js'
import { runTestCaseAgent } from './agents/testCaseAgent.js'
import { runTestCodeAgent } from './agents/testCodeAgent.js'
import Project from './models/Project.js'
import TestCase from './models/TestCase.js'
import { sanitizeFileName, formatElapsed } from './utils/sanitizer.js'
import { buildFolderName, getProjectDirByFolder, ensureDir, writeFile } from './utils/fileSystem.js'
import path from 'path'

async function updateProjectStatus(projectId, status, extra = {}) {
  return Project.findByIdAndUpdate(projectId, { status, ...extra }, { returnDocument: 'after' })
}

export async function runPipeline(projectId, srsText) {
  const startTime = Date.now()

  try {
    await updateProjectStatus(projectId, 'analyzing', {
      processingStartedAt: new Date()
    })

    console.log(`[PIPELINE] [${projectId}] Agent 1: Analyzing SRS...`)
    const analyzedData = await runAnalyzerAgent(srsText)

    const moduleCount = analyzedData.modules?.length || 0
    const frCount = analyzedData.functionalRequirements?.length || 0
    const projectName = analyzedData.projectName || 'Untitled Project'
    const folderName = buildFolderName(projectName, projectId)

    console.log(`[PIPELINE] [${projectId}] Analysis complete — ${moduleCount} modules, ${frCount} functional requirements`)
    console.log(`[PIPELINE] [${projectId}] Output folder: ${folderName}`)

    await updateProjectStatus(projectId, 'generating_tests', {
      analyzedData,
      projectName,
      projectDescription: analyzedData.projectDescription || '',
      totalModules: moduleCount,
      folderName
    })

    console.log(`[PIPELINE] [${projectId}] Agent 2: Generating test cases...`)
    const testCases = await runTestCaseAgent(analyzedData)

    console.log(`[PIPELINE] [${projectId}] Generated ${testCases.length} test cases`)

    const testCaseDocs = testCases.map(tc => ({
      ...tc,
      projectId,
      edgeCaseNote: tc.edgeCaseNote || null
    }))

    await TestCase.insertMany(testCaseDocs, { ordered: false })

    await updateProjectStatus(projectId, 'generating_code', {
      totalTestCases: testCases.length
    })

    console.log(`[PIPELINE] [${projectId}] Agent 3: Generating test code...`)

    const publicDir = getProjectDirByFolder(folderName)
    ensureDir(publicDir)

    const modules = analyzedData.modules || []
    let generatedFileCount = 0

    for (const mod of modules) {
      const moduleCases = testCases.filter(tc => tc.moduleId === mod.moduleId)

      if (moduleCases.length === 0) {
        console.log(`[PIPELINE] [${projectId}] Skipping module ${mod.moduleId} — no test cases`)
        continue
      }

      console.log(`[PIPELINE] [${projectId}] Generating code for ${mod.moduleName} (${moduleCases.length} test cases)...`)

      const code = await runTestCodeAgent(mod, moduleCases)

      const safeName = sanitizeFileName(mod.moduleName)
      const fileName = `${mod.moduleId}-${safeName}.test.js`
      const filePath = path.join(publicDir, fileName)

      writeFile(filePath, code)
      generatedFileCount++
    }

    const elapsed = formatElapsed(startTime)

    await updateProjectStatus(projectId, 'completed', {
      processingCompletedAt: new Date()
    })

    console.log(`[PIPELINE] [${projectId}] Completed — ${generatedFileCount} files generated in ${elapsed}s`)

  } catch (err) {
    const elapsed = formatElapsed(startTime)
    console.error(`[PIPELINE] [${projectId}] Failed after ${elapsed}s:`, err.message)

    await updateProjectStatus(projectId, 'failed', {
      errorMessage: err.message,
      processingCompletedAt: new Date()
    })
  }
}
