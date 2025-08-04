# Email Verification Fix

## Problem
When users signed up for new accounts, the verification email links were pointing to `localhost:3000` instead of the actual production website domain.

## Solution
The issue was resolved by implementing the following changes:

### 1. Environment Configuration
Added `REACT_APP_SITE_URL` environment variable to the frontend `.env` file:
```
REACT_APP_SITE_URL=https://wmoj.ca
```

### 2. Updated Supabase Client Configuration
Modified `frontend/src/services/supabase.ts` to use the environment variable for site URL configuration.

### 3. Explicit Redirect URL in Signup
Updated the signup function in `frontend/src/pages/Login.tsx` to explicitly set the `emailRedirectTo` option:
```typescript
const { data, error } = await supabase.auth.signUp({
  email,
  password,
  options: {
    emailRedirectTo: `${process.env.REACT_APP_SITE_URL || 'http://localhost:3000'}/auth/callback`
  }
});
```

### 4. Auth Callback Route
Created a new `AuthCallback` component (`frontend/src/pages/AuthCallback.tsx`) to handle email verification redirects and added the route `/auth/callback` to the app routing.

## How It Works
1. When a user signs up, the `emailRedirectTo` option ensures the verification email contains a link to the correct domain
2. When users click the verification link, they are redirected to `/auth/callback` on the production domain
3. The `AuthCallback` component processes the verification and redirects users to the appropriate page

## Environment Variables Required
- `REACT_APP_SITE_URL`: The production domain URL (e.g., `https://wmoj.ca`)
- For development, this defaults to `http://localhost:3000`

## Testing
To test the fix:
1. Ensure the environment variable is set correctly
2. Sign up with a new email address
3. Check that the verification email link points to the production domain
4. Click the verification link and verify it redirects properly 