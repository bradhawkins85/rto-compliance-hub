# API Integration Guide

This document describes the API integration implemented for the RTO Compliance Hub frontend.

## Overview

All frontend views have been migrated from mock data to real API calls using:
- **Axios** - HTTP client with interceptors
- **React Query** - Data fetching, caching, and state management
- **TypeScript** - Type-safe API contracts

## Architecture

### API Client (`src/lib/api/client.ts`)
- Axios instance configured with base URL and credentials
- Request/response interceptors for logging (development only)
- Automatic token refresh on 401 Unauthorized
- Error handling with RFC 7807 Problem Details format

### API Services (`src/lib/api/*.ts`)
Service modules for each domain:
- `auth.ts` - Authentication (login, logout, refresh, change password)
- `standards.ts` - RTO standards and mappings
- `policies.ts` - Policy management and versioning
- `trainingProducts.ts` - Training product CRUD operations
- `users.ts` - User/staff management and credentials
- `dashboard.ts` - Aggregated metrics

### React Query Hooks (`src/hooks/api/*.ts`)
Custom hooks wrapping React Query for:
- `useStandards` / `useStandard` - Standards list and details
- `usePolicies` / `usePolicy` - Policies list and details
- `useTrainingProducts` / `useTrainingProduct` - Training products
- `useUsers` / `useUser` - Staff/users with credentials
- `useDashboardMetrics` - Overview dashboard metrics

### UI Components
- `Loading` & `Spinner` - Loading indicators
- `Skeleton` components - Content placeholders during load
- `ErrorDisplay` - User-friendly error messages with retry

## Configuration

### Environment Variables

Create a `.env` file in the root directory:

```bash
# API Base URL (defaults to http://localhost:3000/api/v1)
VITE_API_URL=http://localhost:3000/api/v1
```

### Backend Requirements

The frontend expects the backend server to be running with:
- Base URL: `http://localhost:3000/api/v1`
- CORS enabled for `http://localhost:5173`
- JWT authentication via httpOnly cookies
- Endpoints matching the OpenAPI spec in the PRD

## Usage Examples

### Fetching Data with Hooks

```typescript
import { useStandards } from '@/hooks/api'

function MyComponent() {
  const { data, isLoading, error, refetch } = useStandards({ perPage: 50 })
  
  if (isLoading) return <Loading />
  if (error) return <ErrorDisplay error={error} onRetry={refetch} />
  
  const standards = data?.data || []
  return (
    <div>
      {standards.map(s => <div key={s.id}>{s.title}</div>)}
    </div>
  )
}
```

### Making API Calls Directly

```typescript
import { standardsApi } from '@/lib/api'

async function fetchStandard(id: string) {
  try {
    const standard = await standardsApi.getById(id)
    console.log(standard)
  } catch (error) {
    console.error('Failed to fetch standard:', error)
  }
}
```

### Mutations (Create/Update)

```typescript
import { useUpdatePolicy } from '@/hooks/api'

function PolicyEditor({ policyId }) {
  const updatePolicy = useUpdatePolicy()
  
  const handleSave = async (data) => {
    try {
      await updatePolicy.mutateAsync({ id: policyId, data })
      toast.success('Policy updated')
    } catch (error) {
      toast.error('Failed to update policy')
    }
  }
  
  return <form onSubmit={handleSave}>...</form>
}
```

## Testing

### Manual Testing

1. Start the backend server:
   ```bash
   npm run dev:server
   ```

2. Start the frontend:
   ```bash
   npm run dev
   ```

3. Open browser to `http://localhost:5173`

4. Check browser console for API requests/responses (development mode)

### Testing Without Backend

The app will show loading states and then error states when the backend is not available. Error displays include retry buttons.

## Authentication Flow

### Current Implementation
- Token stored in httpOnly cookies by backend
- Automatic token refresh on 401 responses
- Redirect to `/login` when refresh fails

### TODO
- [ ] Implement login page/modal
- [ ] Add protected route wrapper
- [ ] Store user state in context
- [ ] Add logout button

## Known Limitations

1. **Credentials on Staff List**: The basic user list API doesn't include credentials. Need to fetch individual users or enhance backend response.

2. **Training Product Completeness**: List API doesn't include SOP/assessment/validation flags. Need individual product fetches or backend enhancement.

3. **Standards Mapping Counts**: Standards list doesn't include mapped policy/evidence counts. Need to call mappings endpoint or enhance backend.

4. **Dashboard Metrics**: Currently computed client-side from multiple API calls. Backend should provide dedicated `/dashboard/metrics` endpoint.

## Migration from Mock Data

### Before (Mock Data)
```typescript
import { mockStandards } from '@/lib/mockData'

export function StandardsView() {
  const standards = mockStandards
  return <div>{standards.map(...)}</div>
}
```

### After (API Integration)
```typescript
import { useStandards } from '@/hooks/api'
import { ListSkeleton } from '@/components/ui/skeleton'
import { ErrorDisplay } from '@/components/ui/error'

export function StandardsView() {
  const { data, isLoading, error, refetch } = useStandards()
  
  if (isLoading) return <ListSkeleton />
  if (error) return <ErrorDisplay error={error} onRetry={refetch} />
  
  const standards = data?.data || []
  return <div>{standards.map(...)}</div>
}
```

## Troubleshooting

### API requests failing with CORS errors
- Ensure backend CORS is configured to allow `http://localhost:5173`
- Check `FRONTEND_URL` in backend `.env` file

### 401 Unauthorized errors
- Verify JWT tokens are being sent in httpOnly cookies
- Check token expiration times in backend config
- Ensure `/auth/refresh` endpoint is working

### Data not refreshing
- React Query caches data for 5 minutes by default
- Use `refetch()` to manually refresh
- Check React Query DevTools (can be added to debug)

### Type errors
- Ensure API types in `src/lib/api/types.ts` match backend responses
- Update types if backend schema changes

## Future Enhancements

1. **Optimistic Updates**: Update UI immediately before API confirms
2. **Infinite Scroll**: Use React Query's `useInfiniteQuery` for large lists
3. **WebSocket Support**: Real-time updates for compliance status
4. **Offline Support**: Cache API responses for offline viewing
5. **Request Cancellation**: Cancel in-flight requests on unmount
6. **Retry Strategies**: Exponential backoff for failed requests
