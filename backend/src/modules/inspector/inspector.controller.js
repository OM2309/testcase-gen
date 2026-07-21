import { inspectorService } from '../../services/inspector.service.js'
import { sendSuccess } from '../../utils/responseHelper.js'

export async function startInspector(req, res, next) {
  try {
    const result = await inspectorService.inspectPage(req.body.url)
    return sendSuccess(res, 'Element inspected successfully.', result)
  } catch (err) {
    next(err)
  }
}
