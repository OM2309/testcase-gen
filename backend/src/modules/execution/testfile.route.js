import express from 'express'
import multer from 'multer'
import path from 'path'
import fs from 'fs'
import { v4 as uuidv4 } from 'uuid'

const router = express.Router()

const UPLOAD_DIR = './uploads/test-files'

if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true })
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, UPLOAD_DIR)
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase()
    const safeBaseName = path.basename(file.originalname, ext).replace(/[^a-z0-9_-]/gi, '_')
    const uniqueName = `${uuidv4().substring(0, 8)}-${safeBaseName}${ext}`
    cb(null, uniqueName)
  }
})

const upload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB max file size
  }
})

router.post('/upload/test-file', upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' })
    }
    return res.json({
      success: true,
      data: {
        filename: req.file.filename,
        originalName: req.file.originalname
      }
    })
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message })
  }
})

export default router
