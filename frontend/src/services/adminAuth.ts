import { supabase } from './supabase';

export interface AdminUser {
  user_id: string;
  is_admin: boolean;
  created_at: string;
}

export const checkAdminStatus = async (): Promise<boolean> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    // First, try to get the existing admin record
    let { data, error } = await supabase
      .from('admin_users')
      .select('is_admin')
      .eq('user_id', user.id)
      .single();

    // If admin record doesn't exist, create one (default to non-admin)
    if (error && error.code === 'PGRST116') {
      console.log('Admin record not found, creating one...');
      
      const { data: newData, error: createError } = await supabase
        .from('admin_users')
        .insert({
          user_id: user.id,
          is_admin: false
        })
        .select('is_admin')
        .single();

      if (createError) {
        console.error('Error creating admin record:', createError);
        return false;
      }

      data = newData;
      error = null;
    } else if (error) {
      console.error('Error fetching admin status:', error);
      return false;
    }

    return data?.is_admin || false;
  } catch (error) {
    console.error('Error checking admin status:', error);
    return false;
  }
};

export const getAdminUser = async (): Promise<AdminUser | null> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    // First, try to get the existing admin record
    let { data, error } = await supabase
      .from('admin_users')
      .select('*')
      .eq('user_id', user.id)
      .single();

    // If admin record doesn't exist, create one (default to non-admin)
    if (error && error.code === 'PGRST116') {
      console.log('Admin record not found, creating one...');
      
      const { data: newData, error: createError } = await supabase
        .from('admin_users')
        .insert({
          user_id: user.id,
          is_admin: false
        })
        .select('*')
        .single();

      if (createError) {
        console.error('Error creating admin record:', createError);
        return null;
      }

      data = newData;
      error = null;
    } else if (error) {
      console.error('Error getting admin user:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error getting admin user:', error);
    return null;
  }
}; 