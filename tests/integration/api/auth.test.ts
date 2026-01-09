import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import express, { Express } from 'express';
import { PrismaClient } from '@prisma/client';
import authRoutes from '@server/routes/auth';
import { hashPassword } from '@server/utils/password';

// Mock Prisma client
const prisma = new PrismaClient();

// Create test app
function createTestApp(): Express {
  const app = express();
  app.use(express.json());
  app.use('/api/v1/auth', authRoutes);
  return app;
}

describe('Auth API Integration Tests', () => {
  let app: Express;
  let testUser: any;

  beforeAll(async () => {
    app = createTestApp();
    
    // Clean up test users
    await prisma.user.deleteMany({
      where: {
        email: {
          contains: 'auth-test-',
        },
      },
    });
  });

  beforeEach(async () => {
    // Create a test user for each test
    const hashedPassword = await hashPassword('TestPassword123!');
    testUser = await prisma.user.create({
      data: {
        email: `auth-test-${Date.now()}@example.com`,
        name: 'Auth Test User',
        password: hashedPassword,
        department: 'Training',
        status: 'Active',
      },
    });
  });

  afterAll(async () => {
    // Clean up test users
    await prisma.user.deleteMany({
      where: {
        email: {
          contains: 'auth-test-',
        },
      },
    });
    await prisma.$disconnect();
  });

  describe('POST /api/v1/auth/login', () => {
    it('should login with valid credentials', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: testUser.email,
          password: 'TestPassword123!',
        })
        .expect(200);

      expect(response.body).toHaveProperty('access_token');
      expect(response.body).toHaveProperty('refresh_token');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user.email).toBe(testUser.email);
    });

    it('should reject login with invalid email', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'TestPassword123!',
        })
        .expect(401);

      expect(response.body).toHaveProperty('title', 'Unauthorized');
      expect(response.body).toHaveProperty('detail');
    });

    it('should reject login with invalid password', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: testUser.email,
          password: 'WrongPassword123!',
        })
        .expect(401);

      expect(response.body).toHaveProperty('title', 'Unauthorized');
    });

    it('should reject login with missing email', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          password: 'TestPassword123!',
        })
        .expect(400);

      expect(response.body).toHaveProperty('title', 'Bad Request');
    });

    it('should reject login with missing password', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: testUser.email,
        })
        .expect(400);

      expect(response.body).toHaveProperty('title', 'Bad Request');
    });

    it('should reject login for inactive user', async () => {
      // Update user to inactive
      await prisma.user.update({
        where: { id: testUser.id },
        data: { status: 'Inactive' },
      });

      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: testUser.email,
          password: 'TestPassword123!',
        })
        .expect(401);

      expect(response.body).toHaveProperty('detail');
    });
  });

  describe('POST /api/v1/auth/logout', () => {
    it('should logout authenticated user', async () => {
      // First login to get token
      const loginResponse = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: testUser.email,
          password: 'TestPassword123!',
        });

      const token = loginResponse.body.access_token;

      // Then logout
      const response = await request(app)
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body).toHaveProperty('message');
    });

    it('should reject logout without token', async () => {
      await request(app)
        .post('/api/v1/auth/logout')
        .expect(401);
    });

    it('should reject logout with invalid token', async () => {
      await request(app)
        .post('/api/v1/auth/logout')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });
  });

  describe('POST /api/v1/auth/refresh', () => {
    it('should refresh access token with valid refresh token', async () => {
      // First login to get tokens
      const loginResponse = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: testUser.email,
          password: 'TestPassword123!',
        });

      const refreshToken = loginResponse.body.refresh_token;

      // Then refresh
      const response = await request(app)
        .post('/api/v1/auth/refresh')
        .send({
          refreshToken,
        })
        .expect(200);

      expect(response.body).toHaveProperty('access_token');
      expect(response.body.access_token).not.toBe(loginResponse.body.access_token);
    });

    it('should reject refresh with invalid token', async () => {
      await request(app)
        .post('/api/v1/auth/refresh')
        .send({
          refreshToken: 'invalid-token',
        })
        .expect(401);
    });

    it('should reject refresh without token', async () => {
      await request(app)
        .post('/api/v1/auth/refresh')
        .send({})
        .expect(400);
    });
  });

  describe('POST /api/v1/auth/change-password', () => {
    it('should change password for authenticated user', async () => {
      // First login to get token
      const loginResponse = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: testUser.email,
          password: 'TestPassword123!',
        });

      const token = loginResponse.body.access_token;

      // Then change password
      const response = await request(app)
        .post('/api/v1/auth/change-password')
        .set('Authorization', `Bearer ${token}`)
        .send({
          currentPassword: 'TestPassword123!',
          newPassword: 'NewPassword123!',
        })
        .expect(200);

      expect(response.body).toHaveProperty('message');

      // Verify new password works
      const newLoginResponse = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: testUser.email,
          password: 'NewPassword123!',
        })
        .expect(200);

      expect(newLoginResponse.body).toHaveProperty('access_token');
    });

    it('should reject password change with wrong current password', async () => {
      const loginResponse = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: testUser.email,
          password: 'TestPassword123!',
        });

      const token = loginResponse.body.access_token;

      await request(app)
        .post('/api/v1/auth/change-password')
        .set('Authorization', `Bearer ${token}`)
        .send({
          currentPassword: 'WrongPassword123!',
          newPassword: 'NewPassword123!',
        })
        .expect(401);
    });

    it('should reject weak new password', async () => {
      const loginResponse = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: testUser.email,
          password: 'TestPassword123!',
        });

      const token = loginResponse.body.access_token;

      await request(app)
        .post('/api/v1/auth/change-password')
        .set('Authorization', `Bearer ${token}`)
        .send({
          currentPassword: 'TestPassword123!',
          newPassword: 'weak',
        })
        .expect(400);
    });
  });
});
