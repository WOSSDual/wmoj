// Database utility functions for debugging and fixing issues
import { supabase } from '../services/supabase';

export interface DatabaseStatus {
  userExists: boolean;
  profileExists: boolean;
  adminRecordExists: boolean;
  isAdmin: boolean;
  profileData?: any;
  adminData?: any;
  errors: string[];
}

export const checkDatabaseStatus = async (): Promise<DatabaseStatus> => {
  const status: DatabaseStatus = {
    userExists: false,
    profileExists: false,
    adminRecordExists: false,
    isAdmin: false,
    errors: []
  };

  try {
    // Check if user is authenticated
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      status.errors.push('User not authenticated');
      return status;
    }

    status.userExists = true;

    // Check if profile exists
    const { data: profileData, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (profileError) {
      if (profileError.code === 'PGRST116') {
        status.errors.push('User profile not found');
      } else {
        status.errors.push(`Profile error: ${profileError.message}`);
      }
    } else {
      status.profileExists = true;
      status.profileData = profileData;
    }

    // Check if admin record exists
    const { data: adminData, error: adminError } = await supabase
      .from('admin_users')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (adminError) {
      if (adminError.code === 'PGRST116') {
        status.errors.push('Admin record not found');
      } else {
        status.errors.push(`Admin error: ${adminError.message}`);
      }
    } else {
      status.adminRecordExists = true;
      status.adminData = adminData;
      status.isAdmin = adminData.is_admin;
    }

  } catch (error) {
    status.errors.push(`Unexpected error: ${error}`);
  }

  return status;
};

export const fixUserProfile = async (): Promise<{ success: boolean; message: string }> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, message: 'User not authenticated' };
    }

    // Check if profile exists
    const { data: existingProfile } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (existingProfile) {
      return { success: true, message: 'Profile already exists' };
    }

    // Create profile
    const defaultUsername = `user_${user.id.substring(0, 8)}`;
    const { data: newProfile, error: profileError } = await supabase
      .from('user_profiles')
      .insert({
        user_id: user.id,
        username: defaultUsername
      })
      .select()
      .single();

    if (profileError) {
      return { success: false, message: `Failed to create profile: ${profileError.message}` };
    }

    return { success: true, message: `Profile created with username: ${newProfile.username}` };
  } catch (error) {
    return { success: false, message: `Error: ${error}` };
  }
};

export const fixAdminRecord = async (): Promise<{ success: boolean; message: string }> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, message: 'User not authenticated' };
    }

    // Check if admin record exists
    const { data: existingAdmin } = await supabase
      .from('admin_users')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (existingAdmin) {
      return { success: true, message: 'Admin record already exists' };
    }

    // Create admin record
    const { data: newAdmin, error: adminError } = await supabase
      .from('admin_users')
      .insert({
        user_id: user.id,
        is_admin: false
      })
      .select()
      .single();

    if (adminError) {
      return { success: false, message: `Failed to create admin record: ${adminError.message}` };
    }

    return { success: true, message: 'Admin record created (non-admin by default)' };
  } catch (error) {
    return { success: false, message: `Error: ${error}` };
  }
};

export const promoteToAdmin = async (): Promise<{ success: boolean; message: string }> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, message: 'User not authenticated' };
    }

    // Update admin status
    const { data, error } = await supabase
      .from('admin_users')
      .update({ is_admin: true })
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      return { success: false, message: `Failed to promote to admin: ${error.message}` };
    }

    return { success: true, message: 'Successfully promoted to admin' };
  } catch (error) {
    return { success: false, message: `Error: ${error}` };
  }
};

export const demoteFromAdmin = async (): Promise<{ success: boolean; message: string }> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, message: 'User not authenticated' };
    }

    // Update admin status
    const { data, error } = await supabase
      .from('admin_users')
      .update({ is_admin: false })
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      return { success: false, message: `Failed to demote from admin: ${error.message}` };
    }

    return { success: true, message: 'Successfully demoted from admin' };
  } catch (error) {
    return { success: false, message: `Error: ${error}` };
  }
};

export const listAllUsers = async (): Promise<{ success: boolean; data?: any[]; message: string }> => {
  try {
    const { data, error } = await supabase
      .rpc('list_all_users');

    if (error) {
      return { success: false, message: `Failed to list users: ${error.message}` };
    }

    return { success: true, data, message: `Found ${data?.length || 0} users` };
  } catch (error) {
    return { success: false, message: `Error: ${error}` };
  }
};

export const listAdminUsers = async (): Promise<{ success: boolean; data?: any[]; message: string }> => {
  try {
    const { data, error } = await supabase
      .rpc('list_admin_users');

    if (error) {
      return { success: false, message: `Failed to list admin users: ${error.message}` };
    }

    return { success: true, data, message: `Found ${data?.length || 0} admin users` };
  } catch (error) {
    return { success: false, message: `Error: ${error}` };
  }
};

// Export for use in browser console
(window as any).checkDatabaseStatus = checkDatabaseStatus;
(window as any).fixUserProfile = fixUserProfile;
(window as any).fixAdminRecord = fixAdminRecord;
(window as any).promoteToAdmin = promoteToAdmin;
(window as any).demoteFromAdmin = demoteFromAdmin;
(window as any).listAllUsers = listAllUsers;
(window as any).listAdminUsers = listAdminUsers; 