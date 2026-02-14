# 🚀 Fleet Care SaaS - Deployment Guide

## 📋 Pre-Deployment Checklist

### 1. Environment Verification

- [ ] **Local environment variables** are working (test with `npm run dev`)
- [ ] **Vercel environment variables** are configured:
  - `DATABASE_URL` with `?pgbouncer=true`
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `UPLOADTHING_TOKEN`
  - `UPLOADTHING_SECRET`

### 2. Code Quality Checks

- [ ] All TypeScript errors resolved
- [ ] ESLint passes (`npm run lint`)
- [ ] Local build succeeds (`npm run build`)
- [ ] No console errors in browser

### 3. Package Manager Consistency

- [ ] Using `pnpm` consistently (check `vercel.json`)
- [ ] Lock file is up to date (`pnpm-lock.yaml`)
- [ ] No conflicting lock files (`package-lock.json` removed)

---

## 🔧 Automated Deployment Script

Create and run this script before each deployment:

```bash
#!/bin/bash
# deployment-check.sh

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

echo "✅ All checks passed! Ready for deployment."
echo ""
echo "Next steps:"
echo "1. git add ."
echo "2. git commit -m 'ready for deployment'"
echo "3. git push origin main"
```

---

## 🏃‍♂️ Quick Deployment Commands

### Standard Deployment

```bash
# Run the automated check
bash deployment-check.sh

# If all checks pass, deploy:
git add .
git commit -m "deployment: $(date '+%Y-%m-%d %H:%M')"
git push origin main
```

### Emergency Fix Deployment

```bash
# Skip pre-commit hooks if needed (use sparingly!)
git commit --no-verify -m "hotfix: description"
git push origin main
```

### Force Cache Invalidation

```bash
# If Vercel is using old cached files
touch src/cache-buster-$(date +%s).txt
git add .
git commit -m "force cache invalidation"
git push origin main
```

---

## ⚠️ Common Issues & Solutions

### Issue 1: "npm ci can only install with existing package-lock.json"

**Solution:**

```bash
rm package-lock.json
# Ensure vercel.json has: "installCommand": "pnpm install"
git add vercel.json
git commit -m "fix: use pnpm in vercel"
git push origin main
```

### Issue 2: TypeScript compilation errors

**Solution:**

```bash
# Fix types first
npx tsc --noEmit
# Fix errors, then:
npm run build
```

### Issue 3: ESLint blocking deployment

**Solution:**

```bash
# Quick fix: relax rules in package.json
"lint-staged": {
  "*.{ts,tsx,js,jsx}": [
    "eslint --fix --max-warnings=10"
  ]
}

# Or skip hooks temporarily:
git commit --no-verify -m "bypass lint for deployment"
```

### Issue 4: Vercel registry errors (ERR_INVALID_THIS)

**Solution:**

```bash
# Generate fresh lock file
rm pnpm-lock.yaml
pnpm install
git add pnpm-lock.yaml
git commit -m "update pnpm lock file"
git push origin main
```

---

## 📱 Vercel Dashboard Settings

### Build & Development Settings

```
Install Command: pnpm install
Build Command: pnpm run build
Output Directory: .next (default)
```

### Environment Variables

```
DATABASE_URL=postgresql://[user]:[pass]@[host]:6543/postgres?pgbouncer=true
NEXT_PUBLIC_SUPABASE_URL=https://[project].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[anon-key]
UPLOADTHING_TOKEN=[token]
UPLOADTHING_SECRET=[secret]
```

---

## 🎯 Deployment Success Verification

After deployment, verify:

1. **Build Status:** ✅ Green in Vercel dashboard
2. **Application Loads:** Visit the production URL
3. **Authentication:** Login/logout works
4. **Database Connection:** Can view data (vehicles, maintenance, etc.)
5. **File Uploads:** UploadThing functionality works
6. **Navigation:** All sidebar routes accessible
7. **Maintenance Module:** Templates, categories, items all functional

---

## 📞 Emergency Rollback

If deployment fails catastrophically:

1. **Vercel Dashboard → Deployments**
2. **Find last working deployment**
3. **Click "..." → "Promote to Production"**
4. **Fix issues locally, then redeploy**

---

## 🤝 Team Collaboration

### Before pushing to main:

```bash
# Always sync first
git pull origin main

# Run deployment check
bash deployment-check.sh

# Then deploy
git push origin main
```

### For feature branches:

```bash
# Test deployment readiness before merging
git checkout feature/new-feature
bash deployment-check.sh
# Only merge if all checks pass
```

---

_Last updated: $(date '+%Y-%m-%d')_
_Team: Fleet Care Development_

---

**Remember:**

- 🟢 Green builds = Happy deployments
- 🔴 Red builds = Fix before proceeding
- 🧪 Always test locally first
- 📱 Verify in production after deploy
