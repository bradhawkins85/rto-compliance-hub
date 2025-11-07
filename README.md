# RTO Compliance Hub

A comprehensive compliance management platform for Registered Training Organizations (RTOs), demonstrating professional UI patterns for tracking standards, policies, training products, and staff credentials.

## 🚀 Quick Start

### Frontend Only
```bash
npm install
npm run dev
```

Visit `http://localhost:5173` to see the application.

### With Database (Recommended)

1. **Install PostgreSQL 14+** (see [DATABASE.md](./DATABASE.md) for details)

2. **Setup database**:
```bash
# Install dependencies
npm install

# Setup environment variables
cp .env.example .env
# Edit .env and update DATABASE_URL with your PostgreSQL credentials

# Generate Prisma client
npm run db:generate

# Run migrations
npm run db:migrate

# Seed the database with RTO standards and default data
npm run db:seed
```

3. **Start the application**:
```bash
npm run dev
```

## 📚 Documentation

### Database & Backend
- **[DATABASE.md](./DATABASE.md)** - Complete database setup and usage guide
- **[prisma/README.md](./prisma/README.md)** - Database schema documentation

### Overview & Status
- **[INVENTORY_INDEX.md](./INVENTORY_INDEX.md)** - Start here for documentation navigation
- **[FEATURE_SUMMARY.md](./FEATURE_SUMMARY.md)** - Quick reference of implemented features
- **[IMPLEMENTATION_INVENTORY.md](./IMPLEMENTATION_INVENTORY.md)** - Comprehensive technical documentation

### Planning & Requirements
- **[PRD.md](./PRD.md)** - Product requirements and design specifications
- **[GAP_ANALYSIS.md](./GAP_ANALYSIS.md)** - Detailed gap analysis of missing functions (32KB)
- **[MISSING_FUNCTIONS_SUMMARY.md](./MISSING_FUNCTIONS_SUMMARY.md)** - Quick reference for sub-task creation (25 tasks)

### Issue Creation & Tracking
- **[ISSUES_TO_CREATE.md](./ISSUES_TO_CREATE.md)** - Complete definitions for 25 GitHub issues
- **[HOW_TO_CREATE_ISSUES.md](./HOW_TO_CREATE_ISSUES.md)** - Guide for creating issues (automated & manual methods)
- **[scripts/README.md](./scripts/README.md)** - Automation script documentation

## 🎯 Current Status

**Frontend Prototype**: 85% Complete ✅
- 5 main views (Overview, Standards, Policies, Training, Staff)
- 51 components (4 custom + 47 UI library)
- Responsive design with TailwindCSS
- Mock data structure

**Backend Infrastructure**: 30% In Progress 🚧
- ✅ PostgreSQL database setup
- ✅ Prisma ORM with 22+ tables
- ✅ Database migrations and seeding
- ✅ 29+ RTO standards
- ✅ Role-based access control (RBAC) schema
- ❌ API layer (not started)
- ❌ Authentication system (not started)
- ❌ Integration layer (not started)

**Overall Platform Completion**: ~25-30%

See [INVENTORY_INDEX.md](./INVENTORY_INDEX.md) for detailed status.

## 🛠️ Tech Stack

### Frontend
- React 19 + TypeScript 5.7
- Vite 6.3 (build tool)
- TailwindCSS 4.1 (styling)
- Radix UI (component library)
- Phosphor Icons
- React Hook Form + Zod

### Backend
- PostgreSQL 14+ (database)
- Prisma ORM (database toolkit)
- TypeScript (type safety)

## 🧹 Development Commands

### Application
```bash
npm run dev      # Start dev server
npm run build    # Production build
npm run preview  # Preview production build
npm run lint     # Run ESLint
```

### Database
```bash
npm run db:generate       # Generate Prisma client
npm run db:migrate        # Create and apply migrations
npm run db:migrate:deploy # Apply migrations (production)
npm run db:push           # Push schema changes (dev only)
npm run db:seed           # Seed database with initial data
npm run db:reset          # Reset database (WARNING: deletes all data)
npm run db:studio         # Open Prisma Studio (database GUI)
```

## 📄 License

The Spark Template files and resources from GitHub are licensed under the terms of the MIT license, Copyright GitHub, Inc.
