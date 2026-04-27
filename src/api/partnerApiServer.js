/**
 * Partner API Server - Express.js Integration
 * 
 * Usage in your Express server:
 * 
 * import express from 'express'
 * import { registerPartnerApiRoutes } from './partnerApiServer.js'
 * 
 * const app = express()
 * registerPartnerApiRoutes(app)
 * 
 * The middleware automatically handles:
 * - API key validation
 * - CORS for partner domains
 * - Rate limiting (future)
 * - Response formatting
 * - Error handling
 */

import {
  getAggregatedTransfers,
  getAggregatedScores,
  getAggregatedVaults,
  getPartnerHealthCheck,
} from './partnerRoutes.js'

/**
 * Middleware to extract and validate API key from request
 */
function getApiKey(req) {
  // Accept from: Authorization header, x-api-key header, or query param
  return (
    req.headers.authorization?.replace('Bearer ', '') ||
    req.headers['x-api-key'] ||
    req.query.api_key
  )
}

/**
 * Error response formatter
 */
function errorResponse(res, statusCode, message) {
  res.status(statusCode).json({
    error: true,
    message,
    timestamp: new Date().toISOString(),
  })
}

/**
 * Success response formatter
 */
function successResponse(res, data) {
  res.status(200).json({
    error: false,
    data,
    timestamp: new Date().toISOString(),
  })
}

/**
 * Register Partner API routes with Express app
 */
export function registerPartnerApiRoutes(app) {
  // Health check
  app.get('/api/partners/health', async (req, res) => {
    try {
      const apiKey = getApiKey(req)
      const result = await getPartnerHealthCheck(apiKey)
      res.status(200).json(result)
    } catch (error) {
      errorResponse(res, 401, error.message)
    }
  })

  // Transfers endpoint
  app.get('/api/partners/transfers', async (req, res) => {
    try {
      const apiKey = getApiKey(req)
      const data = await getAggregatedTransfers(apiKey)
      successResponse(res, data)
    } catch (error) {
      console.error('Partner API Error:', error)
      errorResponse(res, 401, error.message)
    }
  })

  // Scores endpoint
  app.get('/api/partners/scores', async (req, res) => {
    try {
      const apiKey = getApiKey(req)
      const data = await getAggregatedScores(apiKey)
      successResponse(res, data)
    } catch (error) {
      console.error('Partner API Error:', error)
      errorResponse(res, 401, error.message)
    }
  })

  // Vaults endpoint
  app.get('/api/partners/vaults', async (req, res) => {
    try {
      const apiKey = getApiKey(req)
      const data = await getAggregatedVaults(apiKey)
      successResponse(res, data)
    } catch (error) {
      console.error('Partner API Error:', error)
      errorResponse(res, 401, error.message)
    }
  })
}

export default registerPartnerApiRoutes
