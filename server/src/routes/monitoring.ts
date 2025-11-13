/**
 * Monitoring Routes
 * 
 * Routes for metrics, health checks, and monitoring endpoints
 */

import express from 'express';
import {
  getMetrics,
  getDetailedHealth,
  getMetricsJSON,
  getSystemStatus,
  getAlertStatus,
} from '../controllers/monitoring';

const router = express.Router();

/**
 * @route   GET /api/v1/monitoring/health
 * @desc    Get detailed health check with component status
 * @access  Public
 */
router.get('/health', getDetailedHealth);

/**
 * @route   GET /api/v1/monitoring/metrics
 * @desc    Get application metrics in JSON format
 * @access  Public
 */
router.get('/metrics', getMetricsJSON);

/**
 * @route   GET /api/v1/monitoring/status
 * @desc    Get system status for status page
 * @access  Public
 */
router.get('/status', getSystemStatus);

/**
 * @route   GET /api/v1/monitoring/alerts
 * @desc    Get current alert status
 * @access  Public
 */
router.get('/alerts', getAlertStatus);

export default router;
