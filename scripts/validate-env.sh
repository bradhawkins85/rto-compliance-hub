#!/bin/bash
set -e

echo "🔍 Validating environment variables..."

REQUIRED_VARS=(
  "DATABASE_URL"
  "JWT_SECRET"
  "JWT_REFRESH_SECRET"
  "NODE_ENV"
)

MISSING_VARS=()

# Check required variables
for var in "${REQUIRED_VARS[@]}"; do
  if [ -z "${!var}" ]; then
    MISSING_VARS+=("$var")
    echo "❌ Missing required environment variable: $var"
  else
    echo "✅ $var is set"
  fi
done

# Check optional but recommended variables
RECOMMENDED_VARS=(
  "APP_PORT"
  "FRONTEND_URL"
  "REDIS_URL"
)

echo ""
echo "📋 Checking recommended variables:"
for var in "${RECOMMENDED_VARS[@]}"; do
  if [ -z "${!var}" ]; then
    echo "⚠️  Optional variable not set: $var (will use default)"
  else
    echo "✅ $var is set"
  fi
done

# Exit with error if any required variables are missing
if [ ${#MISSING_VARS[@]} -ne 0 ]; then
  echo ""
  echo "❌ Validation failed: ${#MISSING_VARS[@]} required variable(s) missing"
  exit 1
fi

echo ""
echo "✅ Environment validation passed"
exit 0
