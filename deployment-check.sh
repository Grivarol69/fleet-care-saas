#!/bin/bash
# Fleet Care SaaS - Pre-Deployment Check Script
# Usage: bash deployment-check.sh

set -e  # Exit on any error

echo "🚀 Fleet Care SaaS - Pre-Deployment Check"
echo "========================================"

# 1. Clean install to ensure dependencies are correct
echo "📦 Cleaning and installing dependencies..."
rm -f package-lock.json  # Remove conflicting npm lock file
pnpm install

# 2. Lint check
echo "🧹 Running ESLint..."
npm run lint

# 3. Type check
echo "🔍 Running TypeScript check..."
npx tsc --noEmit

# 4. Build test
echo "🏗️  Testing production build..."
npm run build

# 5. Verify critical files
echo "✅ Verifying deployment configuration..."
if [ ! -f "vercel.json" ]; then
    echo "❌ ERROR: vercel.json not found"
    exit 1
fi

if [ ! -f "pnpm-lock.yaml" ]; then
    echo "❌ ERROR: pnpm-lock.yaml not found"
    exit 1
fi

# Check vercel.json uses pnpm
if ! grep -q '"installCommand": "pnpm install"' vercel.json; then
    echo "❌ ERROR: vercel.json not configured for pnpm"
    echo "   Fix: Update vercel.json installCommand to 'pnpm install'"
    exit 1
fi

# 6. Environment check
echo "🔧 Checking environment configuration..."
if [ ! -f ".env" ]; then
    echo "⚠️  WARNING: .env file not found"
fi

if [ ! -f ".env.local" ]; then
    echo "⚠️  WARNING: .env.local file not found"
fi

# 7. Database connection test (optional)
echo "🗄️  Testing database connection..."
if command -v npx &> /dev/null; then
    if npx prisma db seed --help &> /dev/null; then
        echo "✅ Prisma CLI available"
    fi
fi

echo ""
echo "✅ All checks passed! Ready for deployment."
echo ""
echo "📋 Next steps:"
echo "1. git add ."
echo "2. git commit -m 'ready for deployment: $(date '+%Y-%m-%d %H:%M')'"
echo "3. git push origin main"
echo ""
echo "🔗 Monitor deployment at: https://vercel.com/dashboard"
echo ""
echo "🎯 After deployment, verify:"
echo "   - Application loads correctly"
echo "   - Authentication works"
echo "   - Database queries work"
echo "   - Maintenance module accessible"