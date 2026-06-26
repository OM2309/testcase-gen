import multer from 'multer'
import path from 'path'
import fs from 'fs'
import { v4 as uuidv4 } from 'uuid'

const UPLOAD_DIR = './uploads'
const MAX_FILE_SIZE = 25 * 1024 * 1024

if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true })
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, UPLOAD_DIR)
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase()
    const uniqueName = `${uuidv4()}${ext}`
    cb(null, uniqueName)
  }
})

const fileFilter = (_req, file, cb) => {
  const allowedExtensions = ['.pdf', '.docx']
  const allowedMimeTypes = [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]

  const ext = path.extname(file.originalname).toLowerCase()
  const mime = file.mimetype

  if (allowedExtensions.includes(ext) && allowedMimeTypes.includes(mime)) {
    cb(null, true)
  } else {
    cb(new Error(`Invalid file type. Accepted formats: PDF, DOCX. Received: ${ext}`), false)
  }
}

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 1
  }
})

export default upload
