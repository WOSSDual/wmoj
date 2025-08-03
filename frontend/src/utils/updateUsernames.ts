// This is a utility script to help update existing usernames
// You can run this in the browser console to update existing users

import { supabase } from '../services/supabase';

export const updateExistingUsernames = async () => {
  try {
    // Get all user profiles
    const { data: profiles, error } = await supabase
      .from('user_profiles')
      .select('*');

    if (error) {
      console.error('Error fetching profiles:', error);
      return;
    }

    console.log('Current profiles:', profiles);

    // Update profiles that have default usernames
    for (const profile of profiles || []) {
      if (profile.username && profile.username.startsWith('user_')) {
        const newUsername = `user_${profile.user_id.substring(0, 8)}`;
        
        const { error: updateError } = await supabase
          .from('user_profiles')
          .update({ username: newUsername })
          .eq('user_id', profile.user_id);

        if (updateError) {
          console.error(`Error updating ${profile.user_id}:`, updateError);
        } else {
          console.log(`Updated ${profile.user_id} to ${newUsername}`);
        }
      }
    }

    console.log('Username update complete!');
  } catch (error) {
    console.error('Error in updateExistingUsernames:', error);
  }
};

// Export for use in browser console
(window as any).updateExistingUsernames = updateExistingUsernames; 