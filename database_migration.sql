-- WMOJ Database Migration Script
-- This script fixes existing users who might not have profiles or admin records

-- Function to migrate existing users
CREATE OR REPLACE FUNCTION migrate_existing_users()
RETURNS void AS $$
DECLARE
    user_record RECORD;
BEGIN
    -- Loop through all auth users
    FOR user_record IN SELECT id FROM auth.users LOOP
        -- Check if user profile exists
        IF NOT EXISTS (SELECT 1 FROM user_profiles WHERE user_id = user_record.id) THEN
            -- Create user profile with default username
            INSERT INTO user_profiles (user_id, username)
            VALUES (user_record.id, 'user_' || substr(user_record.id::text, 1, 8));
            
            RAISE NOTICE 'Created profile for user %', user_record.id;
        END IF;
        
        -- Check if admin record exists
        IF NOT EXISTS (SELECT 1 FROM admin_users WHERE user_id = user_record.id) THEN
            -- Create admin record (default to non-admin)
            INSERT INTO admin_users (user_id, is_admin)
            VALUES (user_record.id, false);
            
            RAISE NOTICE 'Created admin record for user %', user_record.id;
        END IF;
    END LOOP;
    
    RAISE NOTICE 'Migration completed successfully';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Execute the migration
SELECT migrate_existing_users();

-- Clean up the function
DROP FUNCTION migrate_existing_users();

-- Function to promote a user to admin
CREATE OR REPLACE FUNCTION promote_user_to_admin(user_email TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    target_user_id UUID;
BEGIN
    -- Find user by email
    SELECT id INTO target_user_id 
    FROM auth.users 
    WHERE email = user_email;
    
    IF target_user_id IS NULL THEN
        RAISE NOTICE 'User with email % not found', user_email;
        RETURN FALSE;
    END IF;
    
    -- Update admin status
    UPDATE admin_users 
    SET is_admin = true, updated_at = NOW()
    WHERE user_id = target_user_id;
    
    IF FOUND THEN
        RAISE NOTICE 'User % promoted to admin', user_email;
        RETURN TRUE;
    ELSE
        -- Create admin record if it doesn't exist
        INSERT INTO admin_users (user_id, is_admin)
        VALUES (target_user_id, true);
        
        RAISE NOTICE 'Created admin record for user %', user_email;
        RETURN TRUE;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to demote a user from admin
CREATE OR REPLACE FUNCTION demote_user_from_admin(user_email TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    target_user_id UUID;
BEGIN
    -- Find user by email
    SELECT id INTO target_user_id 
    FROM auth.users 
    WHERE email = user_email;
    
    IF target_user_id IS NULL THEN
        RAISE NOTICE 'User with email % not found', user_email;
        RETURN FALSE;
    END IF;
    
    -- Update admin status
    UPDATE admin_users 
    SET is_admin = false, updated_at = NOW()
    WHERE user_id = target_user_id;
    
    IF FOUND THEN
        RAISE NOTICE 'User % demoted from admin', user_email;
        RETURN TRUE;
    ELSE
        RAISE NOTICE 'No admin record found for user %', user_email;
        RETURN FALSE;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to list all admin users
CREATE OR REPLACE FUNCTION list_admin_users()
RETURNS TABLE(email TEXT, is_admin BOOLEAN, created_at TIMESTAMPTZ) AS $$
BEGIN
    RETURN QUERY
    SELECT au.email, adu.is_admin, adu.created_at
    FROM auth.users au
    JOIN admin_users adu ON au.id = adu.user_id
    WHERE adu.is_admin = true
    ORDER BY adu.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to list all users with their admin status
CREATE OR REPLACE FUNCTION list_all_users()
RETURNS TABLE(email TEXT, username TEXT, is_admin BOOLEAN, created_at TIMESTAMPTZ) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        au.email,
        up.username,
        COALESCE(adu.is_admin, false) as is_admin,
        up.created_at
    FROM auth.users au
    LEFT JOIN user_profiles up ON au.id = up.user_id
    LEFT JOIN admin_users adu ON au.id = adu.user_id
    ORDER BY up.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions on utility functions
GRANT EXECUTE ON FUNCTION promote_user_to_admin(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION demote_user_from_admin(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION list_admin_users() TO authenticated;
GRANT EXECUTE ON FUNCTION list_all_users() TO authenticated; 