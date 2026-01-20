# Account Deletion & Cleanup Guide

## Problem Statement

When a user deletes their account in Supabase, related data (organization, WhatsApp accounts, bots) gets deleted due to foreign key constraints. When they recreate their account with the same email, the frontend still has OLD IDs cached in localStorage, causing foreign key constraint errors when trying to create bots.

**Customer Impact**: Confusing experience, can't create bots after account recreation, requires manual cache clearing.

---

## Immediate Solution (For You - Testing)

**Every time you delete and recreate your Supabase account:**

1. **Run the setup script**:
   ```powershell
   .\setup-production-simple.ps1
   ```

2. **Clear browser completely**:
   - Close ALL browser tabs with BotFlow
   - Press `Ctrl + Shift + Delete`
   - Clear: Cookies, Cache, Site Data
   - Select "All time"

3. **Login fresh in incognito**:
   - Press `Ctrl + Shift + N`
   - Go to https://botflow-r9q3.vercel.app/login
   - Login with new credentials

4. **Verify localStorage has new IDs**:
   - Press `F12` (DevTools)
   - Console tab:
   ```javascript
   console.log({
     org: localStorage.getItem('botflow_organizationId'),
     whatsapp: localStorage.getItem('botflow_whatsappAccountId'),
   });
   // Both should be present (not null)
   ```

---

## Long-term Solution (For Production)

### 1. Backend: Add Automatic Organization Creation on First Login

**File**: `botflow-backend/src/routes/auth.ts`

**Change**: After login, if user has no organization, automatically create one:

```typescript
// After successful login in auth.ts (around line 98)

// Get user's organization
const { data: memberData } = await supabaseAdmin
    .from('organization_members')
    .select('organization_id, organizations(*)')
    .eq('user_id', authData.user.id)
    .single();

// NEW: If no organization exists, create one automatically
if (!memberData) {
    const { data: newOrg } = await supabaseAdmin
        .from('organizations')
        .insert({
            name: `${authData.user.email}'s Organization`,
            slug: authData.user.email.split('@')[0],
            plan: 'starter',
        })
        .select()
        .single();

    // Add user as owner
    await supabaseAdmin
        .from('organization_members')
        .insert({
            organization_id: newOrg.id,
            user_id: authData.user.id,
            role: 'owner',
        });

    // Set memberData for rest of flow
    memberData = {
        organization_id: newOrg.id,
        organizations: newOrg,
    };
}

// Continue with existing WhatsApp account check...
```

**Benefit**: Users never have "no organization" state after signup/login.

---

### 2. Backend: Create Default WhatsApp Account Placeholder

**Option A**: Create placeholder on first login (if none exists)

```typescript
// In auth.ts after organization check (around line 108)

if (memberData?.organization_id) {
    const { data: waData } = await supabaseAdmin
        .from('whatsapp_accounts')
        .select('*')
        .eq('organization_id', memberData.organization_id)
        .eq('status', 'active')
        .limit(1);

    if (!waData || waData.length === 0) {
        // Create placeholder WhatsApp account
        const { data: newWA } = await supabaseAdmin
            .from('whatsapp_accounts')
            .insert({
                organization_id: memberData.organization_id,
                phone_number: 'pending',
                display_name: 'WhatsApp - Not Connected',
                status: 'pending', // NOT 'active'
                provider: 'none',
            })
            .select()
            .single();

        whatsappAccount = newWA;
    } else {
        whatsappAccount = waData[0];
    }
}
```

**Option B**: Require WhatsApp connection before bot creation (better UX)

- Let users login without WhatsApp account
- Show "Connect WhatsApp" banner in dashboard
- Block bot creation until WhatsApp is connected
- Frontend checks for `whatsappAccount` and shows appropriate UI

**Recommended**: Option B - clearer user intent, no dummy data

---

### 3. Frontend: Check for Valid IDs Before Bot Creation

**File**: `botflow-website/app/dashboard/templates/[templateId]/setup/page.tsx`

**Add validation before API call**:

```typescript
const handleCreateBot = async () => {
    const organizationId = localStorage.getItem('botflow_organizationId');
    const whatsappAccountId = localStorage.getItem('botflow_whatsappAccountId');

    // Better error handling
    if (!organizationId || !whatsappAccountId) {
        // Instead of throwing error, redirect to setup
        alert('Please complete your account setup first.');
        router.push('/dashboard/integrations');
        return;
    }

    // Verify IDs are valid UUIDs
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(organizationId) || !uuidRegex.test(whatsappAccountId)) {
        // IDs are corrupted, clear and re-login
        alert('Your session is outdated. Please login again.');
        localStorage.clear();
        router.push('/login');
        return;
    }

    // Proceed with bot creation...
};
```

---

### 4. Frontend: Validate localStorage on Dashboard Mount

**File**: `botflow-website/app/dashboard/layout.tsx`

**Add validation in useEffect**:

```typescript
useEffect(() => {
    if (typeof window !== 'undefined') {
        const token = localStorage.getItem('botflow_token');
        const orgId = localStorage.getItem('botflow_organizationId');
        const whatsappId = localStorage.getItem('botflow_whatsappAccountId');

        // If no token, redirect to login
        if (!token) {
            router.push('/login');
            return;
        }

        // If token exists but IDs are missing, re-fetch from API
        if (!orgId || !whatsappId) {
            fetchUserProfile(); // New function to call /api/auth/me
        }
    }
}, []);

const fetchUserProfile = async () => {
    const token = localStorage.getItem('botflow_token');
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
    });

    if (response.ok) {
        const data = await response.json();
        if (data.organization?.id) {
            localStorage.setItem('botflow_organizationId', data.organization.id);
        }
        if (data.whatsappAccount?.id) {
            localStorage.setItem('botflow_whatsappAccountId', data.whatsappAccount.id);
        }
    }
};
```

---

### 5. Backend: Add /api/auth/me Endpoint

**File**: `botflow-backend/src/routes/auth.ts`

**Add endpoint to refresh user data**:

```typescript
// Get current user profile
fastify.get('/me', {
    onRequest: [fastify.authenticate],
}, async (request, reply) => {
    const userId = (request.user as any)?.userId;

    // Get organization
    const { data: memberData } = await supabaseAdmin
        .from('organization_members')
        .select('organization_id, organizations(*)')
        .eq('user_id', userId)
        .single();

    // Get WhatsApp account
    let whatsappAccount = null;
    if (memberData?.organization_id) {
        const { data: waData } = await supabaseAdmin
            .from('whatsapp_accounts')
            .select('*')
            .eq('organization_id', memberData.organization_id)
            .eq('status', 'active')
            .limit(1);

        if (waData && waData.length > 0) {
            whatsappAccount = waData[0];
        }
    }

    return {
        user: {
            id: userId,
            email: (request.user as any)?.email,
        },
        organization: memberData?.organizations,
        whatsappAccount: whatsappAccount,
    };
});
```

---

### 6. Database: Add Soft Delete Instead of Hard Delete

**Instead of deleting users, mark them as deleted**:

```sql
-- Add deleted_at column to auth.users metadata
-- Users marked as deleted won't be able to login
-- But their data is preserved for recovery

ALTER TABLE organizations ADD COLUMN deleted_at TIMESTAMP;
ALTER TABLE bots ADD COLUMN deleted_at TIMESTAMP;

-- Update queries to filter out deleted records
-- Example: SELECT * FROM organizations WHERE deleted_at IS NULL
```

**Benefit**: Users can recover their account within 30 days.

---

## Recommended Implementation Priority

### Phase 1 - Critical (Do Now)
1. ✅ Add logout button (DONE!)
2. ✅ Show user email in sidebar (DONE!)
3. Add automatic organization creation on signup/login
4. Add /api/auth/me endpoint
5. Add localStorage validation on dashboard mount

### Phase 2 - High Priority (Next Week)
6. Add WhatsApp connection banner when not connected
7. Block bot creation until WhatsApp is connected
8. Add ID validation before bot creation
9. Better error messages with recovery instructions

### Phase 3 - Nice to Have (Future)
10. Add soft delete functionality
11. Add account recovery flow
12. Add data export before deletion
13. Add account deletion confirmation with warnings

---

## Testing Checklist

After implementing fixes, test these scenarios:

- [ ] New user signs up → automatically has organization
- [ ] User logs in without WhatsApp → sees "Connect WhatsApp" banner
- [ ] User tries to create bot without WhatsApp → helpful error with redirect
- [ ] User deletes account and recreates → can login and use immediately
- [ ] User logs out and logs in → localStorage is refreshed correctly
- [ ] User opens dashboard with expired token → redirects to login
- [ ] User opens dashboard with missing IDs → IDs are re-fetched from API

---

## Customer Support Responses

### If Customer Says: "I deleted my account and now I can't create bots"

**Response**:
```
Thanks for reaching out! When you delete and recreate your account,
the browser may have cached data from your old account. Here's how to fix it:

1. Click the "Logout" button at the bottom of the sidebar
2. Clear your browser cache (Ctrl+Shift+Delete)
3. Login again with your new credentials
4. You should now be able to create bots!

If the issue persists, please let us know and we'll help you directly.
```

### If Customer Says: "The bot creation is giving a '404' error"

**Response**:
```
This usually means your session data needs to be refreshed. Please try:

1. Click "Logout" at the bottom of the sidebar
2. Login again
3. Try creating the bot

This should resolve the issue. If not, we're here to help!
```

---

## Notes for Production Launch

**Before launching to customers:**
- Implement Phase 1 fixes (critical)
- Test all scenarios in the checklist
- Add monitoring for foreign key errors (alerts when they happen)
- Have customer support ready with the responses above
- Consider adding an in-app "Refresh Session" button for quick fixes

**Current Status**:
- ✅ Logout button added
- ✅ User email displayed
- ⏸️ Organization auto-creation (pending)
- ⏸️ WhatsApp connection flow (pending)
- ⏸️ localStorage validation (pending)

---

**Created**: 2026-01-13
**Last Updated**: 2026-01-13
