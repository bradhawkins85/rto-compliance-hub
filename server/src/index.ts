import express, { Application, Request, Response, NextFunction } from 'express';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import cors from 'cors';
import swaggerUi from 'swagger-ui-express';
import YAML from 'yaml';
import fs from 'fs';
import path from 'path';
import { PrismaClient } from '@prisma/client';
import authRoutes from './routes/auth';
import usersRoutes from './routes/users';
import policiesRoutes from './routes/policies';
import standardsRoutes from './routes/standards';
import trainingProductsRoutes from './routes/trainingProducts';
import sopsRoutes from './routes/sops';
import pdRoutes from './routes/pd';
import credentialsRoutes from './routes/credentials';
import xeroSyncRoutes from './routes/xeroSync';
import webhooksRoutes from './routes/webhooks';
import accelerateSyncRoutes from './routes/accelerateSync';
import googleDriveRoutes from './routes/googleDrive';
import feedbackRoutes from './routes/feedback';
import emailRoutes from './routes/email';
import assetsRoutes from './routes/assets';
import complaintsRoutes from './routes/complaints';
import onboardingRoutes from './routes/onboarding';
import reportsRoutes from './routes/reports';
import jobsRoutes from './routes/jobs';
import auditLogsRoutes from './routes/auditLogs';
import monitoringRoutes from './routes/monitoring';
import { apiRateLimiter } from './middleware/rateLimit';
import { monitoringMiddleware, errorTrackingMiddleware } from './middleware/monitoring';
import { initializeScheduler, stopAllScheduledJobs } from './services/scheduler';
import { getMetrics } from './controllers/monitoring';
import { 
  getSecurityHeadersConfig, 
  permissionsPolicy, 
  additionalSecurityHeaders,
  enforceHttps,
  validateTlsVersion 
} from './middleware/securityHeaders';
import { xssProtection, pathTraversalProtection } from './middleware/sanitization';
import { csrfTokenGenerator, getCsrfToken } from './middleware/csrf';
// Import job worker to start it
import './services/jobWorker';

// Load environment variables
const PORT = process.env.APP_PORT || 3000;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

// Create Prisma client for health checks
const prisma = new PrismaClient();

// Create Express app
const app: Application = express();

// Enforce HTTPS in production
if (process.env.NODE_ENV === 'production') {
  app.use(enforceHttps);
  app.use(validateTlsVersion);
}

// Enhanced security headers with comprehensive configuration
app.use(helmet(getSecurityHeadersConfig()));

// Additional security headers not covered by Helmet
app.use(additionalSecurityHeaders);

// Permissions Policy
app.use(permissionsPolicy);

// CORS configuration
app.use(cors({
  origin: FRONTEND_URL,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
  exposedHeaders: ['X-CSRF-Token'],
}));

// Body parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Cookie parser (must be before CSRF)
app.use(cookieParser());

// XSS Protection - Sanitize all inputs
app.use(xssProtection);

// Path traversal protection
app.use(pathTraversalProtection);

// Monitoring middleware (before routes to track all requests)
app.use(monitoringMiddleware);

// Apply rate limiting to all API routes
app.use('/api', apiRateLimiter);

// Prometheus metrics endpoint (no authentication required for scraping)
app.get('/metrics', getMetrics);

// CSRF token endpoint - generates and returns CSRF token
app.get('/api/v1/csrf-token', csrfTokenGenerator, getCsrfToken);

// Load OpenAPI specification
const openApiPath = path.join(__dirname, '../../openapi.yaml');
let swaggerDocument: any = {};
try {
  const fileContents = fs.readFileSync(openApiPath, 'utf8');
  swaggerDocument = YAML.parse(fileContents);
  console.log('✅ OpenAPI specification loaded successfully');
} catch (error) {
  console.error('⚠️  Failed to load OpenAPI specification:', error);
}

// Swagger UI options
const swaggerOptions = {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'RTO Compliance Hub API Documentation',
  customfavIcon: '/favicon.ico'
};

// Serve OpenAPI/Swagger documentation at /api/docs
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument, swaggerOptions));

// Serve raw OpenAPI spec as JSON
app.get('/api/openapi.json', (_req: Request, res: Response) => {
  res.json(swaggerDocument);
});

// Serve raw OpenAPI spec as YAML
app.get('/api/openapi.yaml', (_req: Request, res: Response) => {
  res.type('text/yaml');
  try {
    const fileContents = fs.readFileSync(openApiPath, 'utf8');
    res.send(fileContents);
  } catch (error) {
    res.status(500).json({ error: 'Failed to load OpenAPI specification' });
  }
});

// Health check endpoint
app.get('/health', async (_req: Request, res: Response) => {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    database: 'connected',
    version: process.env.npm_package_version || '1.0.0',
  };

  try {
    // Check database connectivity
    await prisma.$queryRaw`SELECT 1`;
  } catch (error) {
    health.status = 'unhealthy';
    health.database = 'disconnected';
    return res.status(503).json(health);
  }

  res.status(200).json(health);
});

// API routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', usersRoutes);
app.use('/api/v1/policies', policiesRoutes);
app.use('/api/v1/standards', standardsRoutes);
app.use('/api/v1/training-products', trainingProductsRoutes);
app.use('/api/v1/sops', sopsRoutes);
app.use('/api/v1/pd', pdRoutes);
app.use('/api/v1/credentials', credentialsRoutes);
app.use('/api/v1/sync/xero', xeroSyncRoutes);
app.use('/api/v1/webhooks', webhooksRoutes);
app.use('/api/v1/sync/accelerate', accelerateSyncRoutes);
app.use('/api/v1/files/google-drive', googleDriveRoutes);
app.use('/api/v1/feedback', feedbackRoutes);
app.use('/api/v1/email', emailRoutes);
app.use('/api/v1/assets', assetsRoutes);
app.use('/api/v1/complaints', complaintsRoutes);
app.use('/api/v1/onboarding', onboardingRoutes);
app.use('/api/v1/reports', reportsRoutes);
app.use('/api/v1/jobs', jobsRoutes);
app.use('/api/v1/audit-logs', auditLogsRoutes);
app.use('/api/v1/monitoring', monitoringRoutes);

// 404 handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({
    type: 'https://tools.ietf.org/html/rfc7231#section-6.5.4',
    title: 'Not Found',
    status: 404,
    detail: 'The requested resource was not found',
  });
});

// Error tracking middleware
app.use(errorTrackingMiddleware);

// Error handler
app.use((err: Error, req: Request, res: Response, _next: NextFunction) => {
  console.error('Error:', err);

  res.status(500).json({
    type: 'https://tools.ietf.org/html/rfc7231#section-6.6.1',
    title: 'Internal Server Error',
    status: 500,
    detail: process.env.NODE_ENV === 'development' ? err.message : 'An unexpected error occurred',
    instance: req.path,
  });
});

// Start server
const server = app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 Frontend URL: ${FRONTEND_URL}`);
  console.log(`🏥 Health check: http://localhost:${PORT}/health`);
  console.log(`📚 API Documentation: http://localhost:${PORT}/api/docs`);
  
  // Initialize scheduled jobs
  initializeScheduler();
});

// Graceful shutdown
const shutdown = async () => {
  console.log('Shutting down gracefully...');
  
  // Stop accepting new connections
  server.close(() => {
    console.log('HTTP server closed');
  });
  
  // Stop scheduled jobs
  stopAllScheduledJobs();
  
  // Close database connections
  await prisma.$disconnect();
  console.log('Database connections closed');
  
  process.exit(0);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);


process.on('SIGINT', () => {
  console.log('SIGINT signal received: closing HTTP server');
  stopAllScheduledJobs();
  process.exit(0);
});

export default app;
