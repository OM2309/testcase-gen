import fs from 'fs'
import path from 'path'
import { PNG } from 'pngjs'
import pixelmatch from 'pixelmatch'
import { callOpenAI } from '../../shared/openai.service.js'
import { agent4SystemPrompt, buildAgent4UserPrompt } from './execution.prompt.js'

/**
 * Helper to resize a PNG buffer to custom dimensions using Nearest-Neighbor interpolation.
 * Eliminates native dependencies (like sharp) to ensure compatibility across environments.
 */
function resizePng(srcPng, targetWidth, targetHeight) {
  const dstPng = new PNG({ width: targetWidth, height: targetHeight })
  
  for (let y = 0; y < targetHeight; y++) {
    for (let x = 0; x < targetWidth; x++) {
      const srcX = Math.floor((x / targetWidth) * srcPng.width)
      const srcY = Math.floor((y / targetHeight) * srcPng.height)
      
      const srcIdx = (srcY * srcPng.width + srcX) * 4
      const dstIdx = (y * targetWidth + x) * 4
      
      dstPng.data[dstIdx] = srcPng.data[srcIdx]         // R
      dstPng.data[dstIdx + 1] = srcPng.data[srcIdx + 1] // G
      dstPng.data[dstIdx + 2] = srcPng.data[srcIdx + 2] // B
      dstPng.data[dstIdx + 3] = srcPng.data[srcIdx + 3] // A
    }
  }
  return dstPng
}

/**
 * Downloads image from a URL and returns a Buffer.
 */
async function fetchImageBuffer(url) {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Failed to download design image: ${response.statusText}`)
  }
  const arrayBuffer = await response.arrayBuffer()
  return Buffer.from(arrayBuffer)
}

/**
 * Performs design comparison between a Playwright screenshot and a synced Figma frame.
 * 
 * @param {object} params
 * @param {string} params.actualScreenshotPath - Local path to Playwright screenshot
 * @param {string} params.figmaFrameImageUrl - CDN URL of the synced Figma frame
 * @param {string} params.frameName - Optional name of the Figma frame
 * @param {string} params.outputDir - Directory where the diff overlay should be saved
 * @param {string} params.diffFilename - Filename for the diff image
 * @returns {Promise<object>} Comparison result: { status, similarityScore, visualDiffPath, discrepancies }
 */
export async function compareDesign({
  actualScreenshotPath,
  figmaFrameImageUrl,
  frameName = 'Design Screen',
  outputDir,
  diffFilename
}) {
  try {
    if (!actualScreenshotPath || !fs.existsSync(actualScreenshotPath)) {
      throw new Error(`Actual screenshot not found at: ${actualScreenshotPath}`)
    }

    if (!figmaFrameImageUrl) {
      throw new Error('Figma frame image URL is missing')
    }

    // 1. Load both images
    const actualBuffer = fs.readFileSync(actualScreenshotPath)
    const figmaBuffer = await fetchImageBuffer(figmaFrameImageUrl)

    const actualPng = PNG.sync.read(actualBuffer)
    const figmaPng = PNG.sync.read(figmaBuffer)

    // 2. Align dimensions (resize figma to match playwright screenshot viewport)
    const width = actualPng.width
    const height = actualPng.height
    
    let normalizedFigmaPng = figmaPng
    if (figmaPng.width !== width || figmaPng.height !== height) {
      normalizedFigmaPng = resizePng(figmaPng, width, height)
    }

    // 3. Compute pixel diff
    fs.mkdirSync(outputDir, { recursive: true })
    const diffPng = new PNG({ width, height })

    const mismatchedPixels = pixelmatch(
      actualPng.data,
      normalizedFigmaPng.data,
      diffPng.data,
      width,
      height,
      { threshold: 0.1 }
    )

    const totalPixels = width * height
    const mismatchPercent = (mismatchedPixels / totalPixels) * 100
    const pixelSimilarity = Math.max(0, Math.min(100, Math.round(100 - mismatchPercent)))

    // Save the diff image
    const relativeDiffPath = path.join(outputDir, diffFilename)
    fs.writeFileSync(relativeDiffPath, PNG.sync.write(diffPng))

    // 4. Run Multimodal AI visual check
    const base64Actual = `data:image/png;base64,${actualBuffer.toString('base64')}`
    const base64Figma = `data:image/png;base64,${figmaBuffer.toString('base64')}`

    const systemPrompt = agent4SystemPrompt
    const userPrompt = buildAgent4UserPrompt({ frameName })

    let aiResult = { status: 'match', similarityScore: pixelSimilarity, discrepancies: [] }
    try {
      const response = await callOpenAI({
        systemPrompt,
        userPrompt,
        temperature: 0.1,
        jsonMode: true,
        image: [base64Figma, base64Actual]
      })

      if (response && typeof response === 'object') {
        aiResult.status = response.status || (response.similarityScore >= 80 ? 'match' : 'mismatch')
        aiResult.similarityScore = typeof response.similarityScore === 'number' ? response.similarityScore : pixelSimilarity
        aiResult.discrepancies = Array.isArray(response.discrepancies) ? response.discrepancies : []
      }
    } catch (aiErr) {
      console.warn('[DESIGN MATCHER] Multimodal AI evaluation failed, falling back to pixelmatch result:', aiErr.message)
      aiResult.status = pixelSimilarity >= 90 ? 'match' : 'mismatch'
      aiResult.discrepancies = [`Pixel similarity check calculated score of ${pixelSimilarity}% (AI review failed to load)`]
    }

    return {
      status: aiResult.status,
      similarityScore: aiResult.similarityScore,
      visualDiffPath: relativeDiffPath,
      discrepancies: aiResult.discrepancies
    }
  } catch (error) {
    console.error('[DESIGN MATCHER] Error matching design:', error.message)
    return {
      status: 'error',
      similarityScore: 0,
      visualDiffPath: '',
      discrepancies: [`Design match error: ${error.message}`]
    }
  }
}
