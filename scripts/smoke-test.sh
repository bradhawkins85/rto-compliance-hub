#!/bin/bash
set -e

# Configuration
BASE_URL=${BASE_URL:-"http://localhost:3000"}
MAX_RETRIES=${MAX_RETRIES:-30}
RETRY_DELAY=${RETRY_DELAY:-2}

echo "🧪 Running smoke tests against $BASE_URL"
echo ""

# Test 1: Health Check
echo "Test 1: Health Check Endpoint"
RETRY_COUNT=0
while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
  if curl -f -s "$BASE_URL/health" > /dev/null 2>&1; then
    echo "✅ Health check endpoint is responding"
    HEALTH_RESPONSE=$(curl -s "$BASE_URL/health")
    echo "   Response: $HEALTH_RESPONSE"
    
    # Verify health status
    if echo "$HEALTH_RESPONSE" | grep -q '"status":"healthy"'; then
      echo "✅ Application reports healthy status"
    else
      echo "❌ Application reports unhealthy status"
      exit 1
    fi
    
    # Verify database connectivity
    if echo "$HEALTH_RESPONSE" | grep -q '"database":"connected"'; then
      echo "✅ Database is connected"
    else
      echo "❌ Database is not connected"
      exit 1
    fi
    
    break
  else
    RETRY_COUNT=$((RETRY_COUNT + 1))
    if [ $RETRY_COUNT -lt $MAX_RETRIES ]; then
      echo "⏳ Waiting for application to be ready... (attempt $RETRY_COUNT/$MAX_RETRIES)"
      sleep $RETRY_DELAY
    else
      echo "❌ Health check endpoint is not responding after $MAX_RETRIES attempts"
      exit 1
    fi
  fi
done

echo ""

# Test 2: API Documentation/Root
echo "Test 2: API Root Endpoint"
if curl -f -s "$BASE_URL/api/v1" > /dev/null 2>&1; then
  echo "✅ API root endpoint is accessible"
else
  echo "⚠️  API root endpoint returned an error (this might be expected if no root handler exists)"
fi

echo ""

# Test 3: Authentication Endpoints
echo "Test 3: Authentication Endpoints"
if curl -f -s -X POST "$BASE_URL/api/v1/auth/login" -H "Content-Type: application/json" -d '{}' > /dev/null 2>&1; then
  echo "✅ Auth login endpoint is accessible"
else
  # Expected to fail with 400 or similar, but should not be 500 or unreachable
  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/api/v1/auth/login" -H "Content-Type: application/json" -d '{}')
  if [ "$HTTP_CODE" = "400" ] || [ "$HTTP_CODE" = "401" ] || [ "$HTTP_CODE" = "422" ]; then
    echo "✅ Auth login endpoint is accessible (returned expected error code: $HTTP_CODE)"
  else
    echo "❌ Auth login endpoint returned unexpected status code: $HTTP_CODE"
    exit 1
  fi
fi

echo ""

# Test 4: Standards Endpoint (public read)
echo "Test 4: Standards Endpoint"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/v1/standards")
if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "401" ]; then
  echo "✅ Standards endpoint is accessible (status: $HTTP_CODE)"
else
  echo "❌ Standards endpoint returned unexpected status code: $HTTP_CODE"
  exit 1
fi

echo ""
echo "✅ All smoke tests passed!"
echo ""
echo "Summary:"
echo "  - Health check: ✅"
echo "  - Database connectivity: ✅"
echo "  - API endpoints: ✅"
echo "  - Authentication: ✅"
echo ""
echo "🎉 Deployment verification successful!"
