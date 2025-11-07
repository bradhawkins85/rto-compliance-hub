# RTO Compliance Hub - Backend Server

This directory contains the Express.js backend API server for the RTO Compliance Hub platform.

## Features

### Authentication & Authorization
- ✅ JWT-based authentication with access and refresh tokens
- ✅ Bcrypt password hashing (10 rounds)
- ✅ Role-Based Access Control (RBAC)
- ✅ Permission-based authorization
- ✅ HTTP-only cookies for token storage
- ✅ Token refresh mechanism
- ✅ Password change and reset flows

### Security
- ✅ Rate limiting for login attempts (5 per 15 minutes)
- ✅ Rate limiting for password reset (3 per hour)
- ✅ Security headers with Helmet
- ✅ CORS configuration
- ✅ Audit logging for authentication events
- ✅ Input validation

### API Endpoints

#### Authentication (`/api/v1/auth`)
- `POST /login` - User authentication
- `POST /logout` - Session termination
- `POST /refresh` - Token refresh
- `POST /change-password` - Change password (authenticated)
- `POST /reset-password` - Password reset flow

## Development

### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- npm or yarn

### Setup

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Configure environment**:
   - Copy `.env.example` to `.env`
   - Update `DATABASE_URL` with your PostgreSQL credentials
   - Update JWT secrets (generate with: `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"`)

3. **Generate Prisma client**:
   ```bash
   npm run db:generate
   ```

4. **Run database migrations**:
   ```bash
   npm run db:migrate
   ```

5. **Seed the database**:
   ```bash
   npm run db:seed
   ```

### Running the Server

**Development mode** (with auto-reload):
```bash
npm run dev:server
```

**Build for production**:
```bash
npm run build:server
```

**Start production server**:
```bash
npm run server:start
```

**Run both frontend and backend**:
```bash
npm run dev:all
```

The server runs on `http://localhost:3000` by default.

## Project Structure

```
server/
├── src/
│   ├── controllers/     # Request handlers
│   │   └── auth.ts      # Authentication controller
│   ├── middleware/      # Express middleware
│   │   ├── auth.ts      # JWT authentication
│   │   ├── rbac.ts      # Role-based access control
│   │   ├── audit.ts     # Audit logging
│   │   └── rateLimit.ts # Rate limiting
│   ├── routes/          # API routes
│   │   └── auth.ts      # Auth routes
│   ├── utils/           # Utility functions
│   │   ├── jwt.ts       # JWT utilities
│   │   └── password.ts  # Password utilities
│   ├── types/           # TypeScript types
│   └── index.ts         # Server entry point
├── dist/                # Compiled JavaScript (gitignored)
└── tsconfig.json        # TypeScript configuration
```

## User Roles

The system supports the following roles:

- **SystemAdmin** - Full system access
- **ComplianceAdmin** - Compliance management and reporting
- **Manager** - Staff oversight and approvals
- **Trainer** - Training and professional development
- **Staff** - Limited self-service access

## Testing

Test the API with curl:

```bash
# Login
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@rto-compliance-hub.local","password":"YourPassword123!"}'

# Refresh token
curl -X POST http://localhost:3000/api/v1/auth/refresh \
  -H "Content-Type: application/json" \
  -H "Cookie: refreshToken=YOUR_REFRESH_TOKEN"

# Change password
curl -X POST http://localhost:3000/api/v1/auth/change-password \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{"currentPassword":"OldPass123!","newPassword":"NewPass123!"}'

# Logout
curl -X POST http://localhost:3000/api/v1/auth/logout \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

## Security Considerations

### Production Deployment
- Always use HTTPS
- Set strong, unique JWT secrets
- Use environment variables for sensitive data
- Enable CSRF protection
- Configure proper CORS origins
- Set up database connection pooling
- Use a reverse proxy (nginx, Apache)
- Enable logging and monitoring
- Implement IP whitelisting if needed

### Password Requirements
- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- At least one special character

### Token Expiration
- Access tokens: 15 minutes
- Refresh tokens: 7 days

## Environment Variables

See `.env.example` for all available configuration options:

- `DATABASE_URL` - PostgreSQL connection string
- `APP_PORT` - Server port (default: 3000)
- `JWT_SECRET` - Access token secret
- `JWT_REFRESH_SECRET` - Refresh token secret
- `JWT_ACCESS_EXPIRY` - Access token expiration (default: 15m)
- `JWT_REFRESH_EXPIRY` - Refresh token expiration (default: 7d)
- `BCRYPT_ROUNDS` - Bcrypt hashing rounds (default: 10)
- `RATE_LIMIT_WINDOW_MS` - Rate limit window (default: 900000 = 15 min)
- `RATE_LIMIT_MAX_REQUESTS` - Max requests per window (default: 5)

## API Documentation

### Error Responses

All errors follow RFC 7807 Problem Details format:

```json
{
  "type": "https://tools.ietf.org/html/rfc7235#section-3.1",
  "title": "Unauthorized",
  "status": 401,
  "detail": "Invalid email or password",
  "instance": "/api/v1/auth/login"
}
```

### Success Responses

#### Login
```json
{
  "access_token": "eyJhbGc...",
  "refresh_token": "eyJhbGc...",
  "expires_in": 900,
  "token_type": "Bearer",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "User Name",
    "department": "Training",
    "roles": ["Trainer"]
  }
}
```

## Support

For issues or questions, please refer to the main project README or create an issue in the GitHub repository.
