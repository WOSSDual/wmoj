# WMOJ Database Fix Instructions

This guide will help you fix the RLS (Row Level Security) and administrator user issues in your WMOJ application.

## Issues Identified

1. **User Profile Not Found**: Users can't view their profiles because the `user_profiles` table might not have proper RLS policies or the profiles aren't being created automatically.

2. **Admin Access Denied**: Users with admin privileges can't access the admin page because the `admin_users` table might not have proper RLS policies or the admin records aren't being created.

## Solution Overview

The fixes include:
- Proper RLS policies for all tables
- Automatic creation of user profiles and admin records
- Improved error handling in the frontend
- Database migration utilities

## Step-by-Step Fix Instructions

### Step 1: Run the Database Setup Script

1. Go to your Supabase dashboard
2. Navigate to the SQL Editor
3. Copy and paste the contents of `database_setup.sql` into the editor
4. Run the script

This script will:
- Create all necessary tables if they don't exist
- Set up proper RLS policies
- Create triggers for automatic profile and admin record creation
- Grant necessary permissions

### Step 2: Run the Database Migration Script

1. In the Supabase SQL Editor, copy and paste the contents of `database_migration.sql`
2. Run the script

This script will:
- Fix existing users who don't have profiles or admin records
- Create utility functions for managing admin users

### Step 3: Test the Fixes

1. **Test User Profile Access**:
   - Log in to your application
   - Navigate to the Profile page
   - The profile should now load without errors

2. **Test Admin Access**:
   - Log in with an admin account
   - Navigate to the Admin page
   - You should now have access

3. **Debug if Issues Persist**:
   - Open the browser console
   - Run the following commands to check the database status:

```javascript
// Check current database status
await checkDatabaseStatus()

// Fix user profile if needed
await fixUserProfile()

// Fix admin record if needed
await fixAdminRecord()

// Promote a user to admin (replace with actual email)
// Note: This requires the user to exist in the database
```

### Step 4: Promote Users to Admin (if needed)

If you need to promote a user to admin, you can use the SQL function:

```sql
-- Replace 'user@example.com' with the actual email
SELECT promote_user_to_admin('user@example.com');
```

Or use the frontend utility:

```javascript
// Promote current user to admin
await promoteToAdmin()

// List all admin users
await listAdminUsers()

// List all users
await listAllUsers()
```

## Frontend Changes Made

The following frontend files have been updated to handle missing profiles and admin records:

1. **`frontend/src/pages/Profile.tsx`**: Now automatically creates user profiles if they don't exist
2. **`frontend/src/services/adminAuth.ts`**: Now automatically creates admin records if they don't exist
3. **`frontend/src/utils/databaseUtils.ts`**: New utility functions for debugging and fixing database issues

## Database Structure

After running the setup scripts, your database will have:

### Tables
- `user_profiles`: Stores user profile information
- `admin_users`: Stores admin status for users
- `contests`: Stores contest information
- `problems`: Stores problem information
- `test_cases`: Stores test cases for problems
- `contest_participants`: Stores contest participation
- `contest_submissions`: Stores contest submissions

### Key Features
- **Automatic Profile Creation**: When a user signs up, a profile and admin record are automatically created
- **RLS Policies**: Proper security policies ensure users can only access their own data
- **Admin Management**: Admins can access all data and manage the system
- **Triggers**: Automatic timestamp updates and data consistency

## Troubleshooting

### If profiles still don't load:

1. Check the browser console for errors
2. Run `await checkDatabaseStatus()` to see what's missing
3. Run `await fixUserProfile()` to create the profile
4. Refresh the page

### If admin access still doesn't work:

1. Check the browser console for errors
2. Run `await checkDatabaseStatus()` to see if admin record exists
3. Run `await fixAdminRecord()` to create the admin record
4. Run `await promoteToAdmin()` to promote the user to admin
5. Refresh the page

### If you get permission errors:

1. Make sure you're logged in
2. Check that the RLS policies are properly set up
3. Verify that the user has the necessary records in the database

## Security Notes

- All tables have RLS enabled for security
- Users can only access their own data
- Admins can access all data
- The system automatically creates necessary records for new users
- Admin privileges should be granted carefully

## Support

If you continue to have issues after following these instructions:

1. Check the browser console for specific error messages
2. Use the database utility functions to diagnose the problem
3. Verify that all SQL scripts ran successfully
4. Check that your Supabase environment variables are correctly set

## Environment Variables

Make sure your frontend has the correct environment variables:

```env
REACT_APP_SUPABASE_URL=your_supabase_url
REACT_APP_SUPABASE_ANON_KEY=your_supabase_anon_key
```

And your backend has:

```env
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
``` 