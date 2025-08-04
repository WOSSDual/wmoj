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

    const { data, error } = await supabase
      .from('admin_users')
      .select('is_admin')
      .eq('user_id', user.id)
      .single();

    if (error) {
      console.error('Error checking admin status:', error);
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

    const { data, error } = await supabase
      .from('admin_users')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (error) {
      console.error('Error getting admin user:', error);
      return null;
    }
    
    return data;
  } catch (error) {
    console.error('Error getting admin user:', error);
    return null;
  }
};

// Helper function to ensure user has an admin record
export const ensureAdminRecord = async (): Promise<void> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Check if admin record already exists
    const { data: existingRecord } = await supabase
      .from('admin_users')
      .select('user_id')
      .eq('user_id', user.id)
      .single();

    // If no record exists, create one
    if (!existingRecord) {
      const { error } = await supabase
        .from('admin_users')
        .insert({
          user_id: user.id,
          is_admin: false
        });

      if (error) {
        console.error('Error creating admin record:', error);
      }
    }
  } catch (error) {
    console.error('Error ensuring admin record:', error);
  }
}; 