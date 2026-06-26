import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { createRequire } from 'module'
import { sanitizeFileName } from './sanitizer.js'

const require = createRequire(import.meta.url)
const archiver = require('archiver')

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const PUBLIC_ROOT = path.join(__dirname, '..', '..', 'public')

export function getPublicRoot() {
  return PUBLIC_ROOT
}

export function buildFolderName(projectName, projectId) {
  const safeName = sanitizeFileName(projectName || 'Untitled_Project')
  const shortId = projectId.toString().slice(-6)
  return `${safeName}_${shortId}`
}

export function getProjectDirByFolder(folderName) {
  return path.join(PUBLIC_ROOT, folderName)
}

export function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true })
  }
  return dirPath
}

export function writeFile(filePath, content) {
  fs.writeFileSync(filePath, content, 'utf-8')
  return fs.statSync(filePath)
}

export function readDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    return []
  }
  return fs.readdirSync(dirPath)
}

export function getFileInfo(dirPath, fileName) {
  const filePath = path.join(dirPath, fileName)
  const stats = fs.statSync(filePath)
  return {
    fileName,
    filePath,
    fileSizeBytes: stats.size,
    createdAt: stats.birthtime,
    modifiedAt: stats.mtime
  }
}

export function listProjectFiles(folderName) {
  const dir = getProjectDirByFolder(folderName)
  const fileNames = readDir(dir)

  return fileNames
    .filter(f => f.endsWith('.test.js'))
    .map(fileName => {
      const info = getFileInfo(dir, fileName)
      return {
        ...info,
        publicUrl: `/public/${folderName}/${fileName}`
      }
    })
    .sort((a, b) => a.fileName.localeCompare(b.fileName))
}

export function deleteProjectDir(folderName) {
  if (!folderName) return
  const dir = getProjectDirByFolder(folderName)
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true })
  }
}

export function zipProjectDir(folderName, outputStream) {
  return new Promise((resolve, reject) => {
    const dir = getProjectDirByFolder(folderName)

    if (!fs.existsSync(dir)) {
      return reject(new Error(`Project folder not found: ${folderName}`))
    }

    const files = readDir(dir).filter(f => f.endsWith('.test.js'))

    if (files.length === 0) {
      return reject(new Error('No generated test files found in project folder.'))
    }

    const archive = archiver('zip', { zlib: { level: 9 } })

    archive.on('error', (err) => reject(err))
    archive.on('end', () => resolve())

    archive.pipe(outputStream)

    archive.directory(dir, folderName)

    archive.finalize()
  })
}
