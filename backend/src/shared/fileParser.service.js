import fs from 'fs'
import path from 'path'
import { PDFParse } from 'pdf-parse'
import mammoth from 'mammoth'

const MAX_TEXT_LENGTH = 100000

export async function parseFile(filePath) {
  const absolutePath = path.resolve(filePath)

  if (!fs.existsSync(absolutePath)) {
    throw new Error(`File not found: ${absolutePath}`)
  }

  const ext = path.extname(absolutePath).toLowerCase()
  let extractedText = ''

  if (ext === '.pdf') {
    const buffer = fs.readFileSync(absolutePath)
    const parser = new PDFParse({ data: buffer })
    try {
      const data = await parser.getText()
      extractedText = data.text
    } finally {
      await parser.destroy()
    }
  } else if (ext === '.docx') {
    const result = await mammoth.extractRawText({ path: absolutePath })
    extractedText = result.value
  } else {
    throw new Error(`Unsupported file type: ${ext}. Only PDF and DOCX are supported.`)
  }

  if (!extractedText || extractedText.trim().length === 0) {
    throw new Error('File appears to be empty or contains no extractable text.')
  }

  if (extractedText.length > MAX_TEXT_LENGTH) {
    extractedText = extractedText.substring(0, MAX_TEXT_LENGTH)
  }

  return extractedText.trim()
}
