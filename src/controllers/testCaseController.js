import mongoose from 'mongoose'
import { sendSuccess, sendError, sendPaginated, parsePagination } from '../utils/responseHelper.js'
import TestCase from '../models/TestCase.js'

function isValidObjectId(id) {
  return mongoose.Types.ObjectId.isValid(id)
}

export async function getTestCases(req, res) {
  try {
    if (!isValidObjectId(req.params.id)) {
      return sendError(res, 'Invalid project ID format.', 400)
    }

    const { type, priority, moduleId } = req.query
    const { page, limit, skip } = parsePagination(req.query)

    const filter = { projectId: req.params.id }
    if (type) filter.type = type
    if (priority) filter.priority = priority
    if (moduleId) filter.moduleId = moduleId

    const [testCases, total] = await Promise.all([
      TestCase.find(filter)
        .sort({ testCaseId: 1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      TestCase.countDocuments(filter)
    ])

    return sendPaginated(res, testCases, total, page, limit)

  } catch (err) {
    console.error('[TESTCASES] Error:', err.message)
    return sendError(res, 'Failed to fetch test cases.')
  }
}

export async function getTestCaseSummary(req, res) {
  try {
    if (!isValidObjectId(req.params.id)) {
      return sendError(res, 'Invalid project ID format.', 400)
    }

    const projectId = new mongoose.Types.ObjectId(req.params.id)

    const [byType, byPriority, byModule, total] = await Promise.all([
      TestCase.aggregate([
        { $match: { projectId } },
        { $group: { _id: '$type', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]),
      TestCase.aggregate([
        { $match: { projectId } },
        { $group: { _id: '$priority', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]),
      TestCase.aggregate([
        { $match: { projectId } },
        { $group: { _id: '$moduleId', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]),
      TestCase.countDocuments({ projectId })
    ])

    return sendSuccess(res, {
      data: {
        total,
        byType: byType.map(r => ({ type: r._id, count: r.count })),
        byPriority: byPriority.map(r => ({ priority: r._id, count: r.count })),
        byModule: byModule.map(r => ({ moduleId: r._id, count: r.count }))
      }
    })

  } catch (err) {
    console.error('[SUMMARY] Error:', err.message)
    return sendError(res, 'Failed to fetch test case summary.')
  }
}
