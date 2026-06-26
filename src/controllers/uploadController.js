import { parseFile } from '../utils/fileParser.js'
import { sendSuccess, sendError } from '../utils/responseHelper.js'
import Project from '../models/Project.js'
import { runPipeline } from '../pipeline.js'

export async function uploadSRS(req, res) {
  try {
    if (!req.file) {
      return sendError(res, 'No file uploaded. Send a PDF or DOCX file with field name "srs".', 400)
    }

    const srsText = await parseFile(req.file.path)

    const project = await Project.create({
      originalFileName: req.file.originalname,
      filePath: req.file.path,
      status: 'uploaded'
    })

    runPipeline(project._id, srsText).catch((err) => {
      console.error(`[UPLOAD] Pipeline failed for project ${project._id}:`, err.message)
    })

    return sendSuccess(res, {
      message: 'SRS uploaded successfully. Processing has started.',
      data: {
        projectId: project._id,
        fileName: req.file.originalname,
        statusEndpoint: `/api/project/${project._id}/status`
      }
    }, 202)

  } catch (err) {
    console.error('[UPLOAD] Error:', err.message)

    if (err.message.includes('Invalid file type')) {
      return sendError(res, err.message, 415)
    }

    if (err.message.includes('empty')) {
      return sendError(res, err.message, 422)
    }

    return sendError(res, 'Internal server error during upload.')
  }
}
