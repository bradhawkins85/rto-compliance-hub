import express, { Application, Request, Response, NextFunction } from 'express';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import cors from 'cors';
import authRoutes from './routes/auth';
import usersRoutes from './routes/users';
import policiesRoutes from './routes/policies';
import standardsRoutes from './routes/standards';
import trainingProductsRoutes from './routes/trainingProducts';
import sopsRoutes from './routes/sops';
import pdRoutes from './routes/pd';
import credentialsRoutes from './routes/credentials';
import xeroSyncRoutes from './routes/xeroSync';
import { apiRateLimiter } from './middleware/rateLimit';
import { initializeScheduler } from './services/scheduler';
import webhooksRoutes from './routes/webhooks';
import accelerateSyncRoutes from './routes/accelerateSync';
import { apiRateLimiter } from './middleware/rateLimit';
import { initializeScheduler, stopAllScheduledJobs } from './services/scheduler';

// Load environment variables
const PORT = process.env.APP_PORT || 3000;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

// Create Express app
const app: Application = express();

// Security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:'],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
}));

// CORS configuration
app.use(cors({
  origin: FRONTEND_URL,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Body parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Cookie parser
app.use(cookieParser());

// Apply rate limiting to all API routes
app.use('/api', apiRateLimiter);

// Health check endpoint
app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
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

// 404 handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({
    type: 'https://tools.ietf.org/html/rfc7231#section-6.5.4',
    title: 'Not Found',
    status: 404,
    detail: 'The requested resource was not found',
  });
});

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
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 Frontend URL: ${FRONTEND_URL}`);
  console.log(`🏥 Health check: http://localhost:${PORT}/health`);
  
  // Initialize scheduled jobs
  initializeScheduler();
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  stopAllScheduledJobs();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT signal received: closing HTTP server');
  stopAllScheduledJobs();
  process.exit(0);
});

export default app;
