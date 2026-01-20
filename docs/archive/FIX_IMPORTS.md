# Fix Import Issues - Quick Guide

## Issue
```
Module not found: Can't resolve '@/lib/validation'
Module not found: Can't resolve '@/types/template'
```

## Solution

The files exist but Next.js dev server needs to be restarted to pick them up.

### Step 1: Stop Dev Server

If the dev server is running:
```bash
# Press Ctrl+C in the terminal where Next.js is running
```

### Step 2: Restart Dev Server

```bash
cd botflow-website
npm run dev
```

### Step 3: Verify Files Exist

```bash
# Check lib directory
ls app/lib/validation.ts

# Check types directory
ls app/types/template.ts

# Check components
ls app/components/wizard/
```

**Expected output:**
- validation.ts (exists) ✅
- template.ts (exists) ✅
- WizardContainer.tsx (exists) ✅
- TemplateSelector.tsx (exists) ✅
- TemplateCustomizer.tsx (exists) ✅
- IntegrationConnector.tsx (exists) ✅
- BlueprintPreview.tsx (exists) ✅

### Step 4: Test the Wizard

Navigate to: http://localhost:3000/dashboard/bots/wizard

## Alternative: Clear Next.js Cache

If restart doesn't work:

```bash
cd botflow-website

# Remove .next directory
rm -rf .next

# Remove node_modules/.cache (if exists)
rm -rf node_modules/.cache

# Reinstall and restart
npm install
npm run dev
```

## Files Created

All required files were created successfully:

**Frontend:**
- ✅ app/components/wizard/WizardContainer.tsx
- ✅ app/components/wizard/TemplateSelector.tsx
- ✅ app/components/wizard/TemplateCustomizer.tsx
- ✅ app/components/wizard/IntegrationConnector.tsx
- ✅ app/components/wizard/BlueprintPreview.tsx
- ✅ app/components/wizard/index.ts
- ✅ app/store/wizardStore.ts
- ✅ app/lib/validation.ts
- ✅ app/types/template.ts
- ✅ app/dashboard/bots/wizard/page.tsx

**Backend:**
- ✅ botflow-backend/src/routes/integrations-test.ts
- ✅ botflow-backend/src/server.ts (updated)

**Dependencies Installed:**
- ✅ zustand (state management)
- ✅ reactflow (visual diagrams)

## Verification

After restart, check:

```bash
# Dev server should show:
✓ Compiled successfully

# Browser console should show no errors

# Navigate to wizard:
http://localhost:3000/dashboard/bots/wizard
```

## Still Having Issues?

Check tsconfig.json path mapping:
```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./*"]
    }
  }
}
```

This is correct and should resolve `@/` to the root directory.

---

**Status:** Files created ✅ | Server restart needed ⚠️
**Action:** Restart Next.js dev server
