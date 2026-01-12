# Week 12 - Complete System Check Guide

**Purpose**: Comprehensive checklist to verify all features work correctly
**Use this**: When starting a new debugging session or before production launch
**Date Created**: 2026-01-12

---

## Pre-Testing Setup

### Environment Check
- [ ] Backend deployed to Railway and running
- [ ] Frontend deployed to Vercel and running
- [ ] Database (Supabase) accessible
- [ ] All environment variables configured

### Test Account Setup
**Production Test User**: `kenny@audico.co.za`
- [ ] Can login successfully
- [ ] Has organization linked
- [ ] Has WhatsApp account connected

**Dev User**: `dev@botflow.app` / `dev-password-123`
- [ ] Exists in database
- [ ] Has org ID: `00000000-0000-0000-0000-000000000001`
- [ ] Has WhatsApp ID: `00000000-0000-0000-0000-000000000002`

---

## 1. Authentication Flow

###  Landing Page
- [ ] Visit https://botflow-r9q3.vercel.app
- [ ] Hero section loads correctly
- [ ] Pricing cards display (R499, R899, R1999)
- [ ] Navigation menu works
- [ ] "Get Started" button navigates to signup

### Sign Up
- [ ] Go to /signup
- [ ] Form validates required fields
- [ ] Can create new account
- [ ] Redirects to dashboard after signup
- [ ] Organization is created automatically
- [ ] JWT token is stored in localStorage

### Login
- [ ] Go to /login
- [ ] Can login with existing account
- [ ] Wrong password shows error
- [ ] Redirects to /dashboard on success
- [ ] localStorage has:
  - `botflow_token`
  - `botflow_organizationId`
  - `botflow_whatsappAccountId` (if WhatsApp connected)

### Logout
- [ ] User icon/button to logout exists
- [ ] Logout clears localStorage
- [ ] Redirects to landing page

---

## 2. Dashboard Home

### Stats Cards
- [ ] Visit /dashboard
- [ ] 4 stat cards display:
  - Total Conversations
  - Active Bots
  - Avg Response Time
  - Resolution Rate
- [ ] Numbers and percentages visible

### Quick Actions (⚠️ FIXED)
- [ ] "Create Bot" button → Goes to /dashboard/templates ✅
- [ ] "Connect WhatsApp" button → Goes to /dashboard/integrations ✅
- [ ] "Add Integration" button → Goes to /dashboard/marketplace ✅

### Recent Conversations
- [ ] Conversation list displays
- [ ] "View all →" button → Goes to /dashboard/conversations ✅
- [ ] Clicking conversation opens detail view

---

## 3. Template System (CRITICAL)

### Templates List
- [ ] Go to /dashboard/templates
- [ ] **All 21 templates display** (not just 7!)
- [ ] Search/filter works
- [ ] Categories display correctly
- [ ] Template cards show:
  - Icon
  - Name
  - Description
  - Tagline

### Template Detail
- [ ] Click on any template
- [ ] Detail page shows template info
- [ ] "Use This Template" button visible
- [ ] Example prompts display

### Bot Creation from Template
- [ ] Click "Use This Template"
- [ ] **Step 1: Name Your Bot**
  - [ ] Bot name field works
  - [ ] Validation shows errors
  - [ ] Can proceed to step 2
- [ ] **Step 2: Configure**
  - [ ] All template fields display
  - [ ] Field types render correctly:
    - Text inputs
    - Textareas
    - Number inputs
    - Select dropdowns
    - Multiselect checkboxes
    - Time inputs
  - [ ] Validation works (required fields, min/max)
  - [ ] Can proceed to step 3
- [ ] **Step 3: Review**
  - [ ] Configuration summary displays
  - [ ] All entered values show correctly
  - [ ] Arrays display as comma-separated
  - [ ] "Create Bot" button enabled
- [ ] **Bot Creation** (⚠️ KEY TEST)
  - [ ] Click "Create Bot"
  - [ ] No authentication error
  - [ ] No WhatsApp account error
  - [ ] Success: Redirects to bot detail page
  - [ ] Bot appears in bots list

**If bot creation fails:**
1. Check localStorage has `botflow_whatsappAccountId`
2. Check WhatsApp shows as "Connected" in /dashboard/integrations
3. Try re-logging in (clear cache first)
4. Check Railway backend logs for errors

---

## 4. Bot Management

### Bots List
- [ ] Go to /dashboard/bots
- [ ] Created bots display
- [ ] Bot cards show:
  - Name
  - Template type
  - Status (active/inactive)
  - Created date
- [ ] "Create New Bot" button works

### Bot Detail
- [ ] Click on a bot
- [ ] Bot detail page loads
- [ ] Tabs display:
  - Overview
  - Configuration
  - Knowledge Base
  - Analytics (if implemented)
- [ ] Can edit bot settings
- [ ] Can toggle bot active/inactive
- [ ] Can delete bot

### Deprecat

ed Create Flow
- [ ] Go to /dashboard/bots/create
- [ ] **Should redirect to /dashboard/templates** ✅
- [ ] Shows loading spinner during redirect
- [ ] Never shows old 7-template list

---

## 5. Integration Marketplace

### Marketplace Page
- [ ] Go to /dashboard/marketplace
- [ ] **Shows 400+ integrations** (not just 3!)
- [ ] Category filters work:
  - All
  - CRM
  - Calendar
  - E-commerce
  - Payments
  - Analytics
- [ ] Search bar filters integrations
- [ ] Integrations display:
  - Icon/logo
  - Name
  - Description
  - Category tags
  - "Connect" button

### Integration Detail
- [ ] Click on any integration
- [ ] Detail page shows:
  - Full description
  - Setup instructions
  - Required fields/permissions
  - "Enable" or "Connect" button

### Enable Integration
- [ ] Click "Enable" on an integration
- [ ] Modal opens with:
  - Bot selection dropdown
  - Setup instructions
  - Credential fields (if requires_auth)
- [ ] Bot dropdown lists user's bots
- [ ] Can enter credentials
- [ ] "Enable Integration" button submits
- [ ] **Known Issue**: RLS policy error - doesn't block other features

---

## 6. Integrations Page (Your Integrations)

### Connected Integrations
- [ ] Go to /dashboard/integrations
- [ ] **Shows 3 hardcoded integrations** (this is correct):
  - WhatsApp (should show "Connected")
  - Google Sheets
  - Stripe
- [ ] Each integration card shows:
  - Icon
  - Name
  - Description
  - "Manage" or "Connect" button
  - Connection status

### WhatsApp Integration
- [ ] WhatsApp shows green "✓ Connected" badge
- [ ] "Manage" button works
- [ ] Can view WhatsApp account details
- [ ] Can disconnect/reconnect

---

## 7. Conversations

### Conversations List
- [ ] Go to /dashboard/conversations
- [ ] Conversation list displays
- [ ] Each conversation shows:
  - Customer phone number
  - Last message
  - Timestamp
  - Status (active/resolved)
- [ ] Can filter by status
- [ ] Can search conversations

### Conversation Detail
- [ ] Click on a conversation
- [ ] Message thread displays
- [ ] Messages show:
  - Sender (customer/bot)
  - Timestamp
  - Message content
- [ ] Can send manual reply (if implemented)
- [ ] Can mark as resolved

---

## 8. Analytics

### Analytics Dashboard
- [ ] Go to /dashboard/analytics
- [ ] Page loads (may be placeholder)
- [ ] Charts display (if implemented):
  - Messages over time
  - Response times
  - Resolution rates
  - Bot performance
- [ ] Date range picker works
- [ ] Export buttons work (if implemented)

---

## 9. Settings

### Organization Settings
- [ ] Go to /dashboard/settings
- [ ] Organization info displays
- [ ] Can edit organization name
- [ ] Can view/edit billing info
- [ ] Can manage team members

### WhatsApp Settings
- [ ] WhatsApp connection status visible
- [ ] Can add new WhatsApp account
- [ ] Can edit existing WhatsApp settings
- [ ] Bird API credentials section (if configured)

### User Profile
- [ ] Can view user profile
- [ ] Can edit name/email
- [ ] Can change password
- [ ] Can update notification preferences

---

## 10. Mobile Responsiveness

### Test Breakpoints
- [ ] **Desktop** (1920x1080): All features work
- [ ] **Laptop** (1366x768): Layout adapts
- [ ] **Tablet** (768px): Sidebar collapses, menu appears
- [ ] **Mobile** (375px): All content accessible

### Key Mobile Checks
- [ ] Navigation menu (hamburger) works
- [ ] Template cards stack vertically
- [ ] Bot creation form is usable
- [ ] Integration marketplace is browsable
- [ ] Touch targets are large enough (min 44px)

---

## 11. Backend API Endpoints

### Authentication
- [ ] `POST /api/auth/signup` - Creates user + org
- [ ] `POST /api/auth/login` - Returns token + user + org + whatsappAccount
- [ ] `GET /api/auth/me` - Returns current user

### Templates
- [ ] `GET /api/templates` - Returns all 21 published templates
- [ ] `GET /api/templates/:id` - Returns specific template
- [ ] `GET /api/templates/vertical/:vertical` - Filters by vertical

### Bots
- [ ] `GET /api/bots` - Returns user's bots
- [ ] `POST /api/bots/create-from-template` - Creates bot from template (⚠️ KEY ENDPOINT)
- [ ] `GET /api/bots/:id` - Returns bot details
- [ ] `PATCH /api/bots/:id` - Updates bot
- [ ] `DELETE /api/bots/:id` - Deletes bot

### Marketplace
- [ ] `GET /api/marketplace` - Returns all 400+ integrations
- [ ] `GET /api/marketplace/:slug` - Returns integration details
- [ ] `POST /api/marketplace/:slug/enable` - Enables integration for bot
- [ ] `POST /api/marketplace/:slug/disable` - Disables integration

### Integrations
- [ ] `GET /api/integrations` - Returns user's connected integrations
- [ ] `GET /api/integrations/google-sheets/auth` - OAuth flow
- [ ] `GET /api/integrations/google-sheets/callback` - OAuth callback

### Conversations
- [ ] `GET /api/conversations` - Returns user's conversations
- [ ] `GET /api/conversations/:id` - Returns conversation with messages
- [ ] `POST /api/conversations/:id/messages` - Sends message

### Webhooks
- [ ] `POST /webhooks/whatsapp` - Twilio webhook
- [ ] `POST /webhooks/bird/whatsapp` - Bird webhook
- [ ] Webhook processes messages correctly
- [ ] AI responses are generated
- [ ] Responses are sent back to customer

---

## 12. Known Issues & Workarounds

### Bot Creation: "Missing organization or WhatsApp account"
**Issue**: localStorage doesn't have WhatsApp account ID
**Fix**: Re-login after backend deployment updates
**Workaround**: Use incognito window for fresh login
**Status**: Should be fixed after WhatsApp query update

### Integration Enable: RLS Policy Error
**Issue**: Infinite recursion in organization_members RLS policy
**Impact**: Cannot enable integrations via API
**Fix Needed**: Review Supabase RLS policies
**Priority**: Medium (doesn't block bot creation)

### Google Calendar: Error 400 invalid_request
**Issue**: Missing `GOOGLE_REDIRECT_URI` environment variable
**Fix**: Add to Railway backend variables
**Guide**: See GOOGLE_CALENDAR_SETUP.md
**Priority**: Low (optional feature)

### Integrations Page: Only shows 3 integrations
**Issue**: This page shows YOUR connected integrations (hardcoded)
**Not a bug**: Marketplace page shows all 400+ available integrations
**Clarification**: Two different pages with different purposes

### Dashboard Buttons: Not clickable
**Issue**: Quick action buttons had no onClick handlers
**Status**: FIXED ✅ (commit pending)

---

## 13. Performance Benchmarks

### Page Load Times (Target)
- [ ] Landing page: < 2s
- [ ] Dashboard: < 1s
- [ ] Templates list: < 1.5s
- [ ] Bot creation: < 2s per step
- [ ] Marketplace: < 2s

### API Response Times (Target)
- [ ] Health check: < 100ms
- [ ] Login: < 1.5s
- [ ] Templates API: < 800ms
- [ ] Bot creation: < 1s
- [ ] Marketplace API: < 500ms

### Database Queries
- [ ] No N+1 queries
- [ ] Proper indexing on frequently queried columns
- [ ] RLS policies don't cause performance issues

---

## 14. Security Checks

### Authentication
- [ ] JWT tokens expire after reasonable time
- [ ] Tokens are validated on every protected route
- [ ] User can't access other users' data
- [ ] RLS policies prevent data leaks

### Input Validation
- [ ] All user inputs are validated
- [ ] SQL injection prevented (using Supabase/Prisma)
- [ ] XSS prevented (React escapes by default)
- [ ] CSRF protection (if needed)

### API Security
- [ ] CORS configured correctly
- [ ] Rate limiting implemented (if needed)
- [ ] API keys/secrets not exposed in frontend
- [ ] Environment variables not committed to git

---

## 15. Data Integrity

### Bot Creation
- [ ] All required fields are populated
- [ ] Variable replacement works (`{{business_name}}` → actual name)
- [ ] Arrays converted to readable format
- [ ] Bot configuration JSON is valid
- [ ] Foreign keys (template_id, org_id, whatsapp_id) are valid

### Database Constraints
- [ ] NOT NULL constraints enforced
- [ ] Foreign keys prevent orphaned records
- [ ] Unique constraints prevent duplicates
- [ ] Check constraints validated (if any)

---

## 16. Error Handling

### User-Facing Errors
- [ ] Errors display in red with clear messages
- [ ] Network errors handled gracefully
- [ ] Form validation errors inline
- [ ] Toast notifications for success/error (if implemented)

### Server-Side Errors
- [ ] 400 errors return validation details
- [ ] 401 errors redirect to login
- [ ] 404 errors show "not found" page
- [ ] 500 errors logged but don't expose internals

### Logging
- [ ] Backend logs errors with stack traces
- [ ] Frontend logs errors to console (dev) or Sentry (prod)
- [ ] User actions logged for debugging

---

## 17. Browser Compatibility

### Browsers to Test
- [ ] Chrome/Edge (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest) - iOS/macOS
- [ ] Mobile Chrome (Android)
- [ ] Mobile Safari (iOS)

### Features to Check
- [ ] localStorage works in all browsers
- [ ] Fetch API works (no IE11)
- [ ] CSS Grid/Flexbox renders correctly
- [ ] Touch events work on mobile

---

## 18. Accessibility (WCAG 2.1)

### Keyboard Navigation
- [ ] Can tab through all interactive elements
- [ ] Focus indicators visible
- [ ] Modals trap focus
- [ ] Esc key closes modals

### Screen Readers
- [ ] Form labels associated with inputs
- [ ] Images have alt text
- [ ] ARIA labels on icon-only buttons
- [ ] Semantic HTML used (nav, main, aside, etc.)

### Color Contrast
- [ ] Text meets 4.5:1 contrast ratio
- [ ] Interactive elements meet 3:1 contrast
- [ ] Focus indicators visible against background

---

## 19. SEO (Landing Page Only)

### Meta Tags
- [ ] Title tag set
- [ ] Meta description set
- [ ] Open Graph tags for social sharing
- [ ] Favicon configured

### Content
- [ ] H1 tag on every page
- [ ] Proper heading hierarchy (H1 → H2 → H3)
- [ ] Alt text on images
- [ ] Internal links work

---

## 20. Deployment Health

### Vercel (Frontend)
- [ ] Build succeeds
- [ ] No build warnings
- [ ] Environment variables set:
  - `NEXT_PUBLIC_API_URL`
- [ ] Domain configured
- [ ] SSL certificate active

### Railway (Backend)
- [ ] Build succeeds
- [ ] No deployment errors
- [ ] Environment variables set (see env.ts for full list)
- [ ] Domain configured
- [ ] Health check endpoint responds

### Supabase (Database)
- [ ] Database online
- [ ] RLS policies active
- [ ] Backups configured
- [ ] pgvector extension enabled (if using embeddings)

---

## Testing Workflow

### Quick Smoke Test (5 min)
1. Can login ✅
2. Dashboard loads ✅
3. Can view templates ✅
4. Can create bot from template ✅
5. Marketplace displays ✅

### Full E2E Test (30 min)
Run through all sections 1-9 above

### Regression Test (Before Each Deploy)
Test the 5-10 most critical user flows

---

## Success Criteria

### MVP Launch Ready
- [ ] Authentication works
- [ ] Bot creation from template works
- [ ] 21 templates available
- [ ] Marketplace displays 400+ integrations
- [ ] Dashboard navigation works
- [ ] No critical bugs

### Production Ready
- [ ] All MVP features ✅
- [ ] Performance benchmarks met
- [ ] Security audit passed
- [ ] Mobile responsive
- [ ] Error handling robust
- [ ] Monitoring/logging configured

---

## Common Failure Patterns

### "Not authenticated" Error
**Cause**: localStorage token missing or invalid
**Fix**: Re-login, check localStorage
**Prevention**: Handle token expiration gracefully

### "Missing WhatsApp account" Error
**Cause**: Backend not returning whatsappAccount in login
**Fix**: Re-login after backend deployment
**Prevention**: Ensure backend code deployed

### Template displays only 7 instead of 21
**Cause**: Using old /dashboard/bots/create page
**Fix**: Go to /dashboard/templates instead
**Prevention**: Redirect old page to new page (FIXED)

### Buttons don't respond
**Cause**: Missing onClick handlers
**Fix**: Add router.push() to buttons
**Prevention**: Test all interactive elements

---

## Maintenance Checklist

### Weekly
- [ ] Check error logs for issues
- [ ] Review user feedback
- [ ] Monitor API response times
- [ ] Check database size/growth

### Monthly
- [ ] Update dependencies
- [ ] Review security vulnerabilities
- [ ] Backup database
- [ ] Review and optimize slow queries

### Before Each Release
- [ ] Run full test suite
- [ ] Test on staging environment
- [ ] Review and merge PRs
- [ ] Update CHANGELOG
- [ ] Tag release in git

---

## Contact & Resources

**Project GitHub**: https://github.com/AudicoSA/botflow
**Frontend**: https://botflow-r9q3.vercel.app
**Backend**: https://botflow-backend-production.up.railway.app
**Database**: Supabase project (check env variables)

**Documentation Files**:
- CLAUDE.md - Development guide
- WEEK_12_FINAL_GUIDE.md - Production readiness
- GOOGLE_CALENDAR_SETUP.md - OAuth setup
- TEMPLATE_PATTERNS.md - Template development

---

**Last Updated**: 2026-01-12
**Version**: 1.0
**Status**: Week 12 - Production Readiness Phase

🎯 **Use this guide to ensure EVERY feature works before declaring production ready!**
