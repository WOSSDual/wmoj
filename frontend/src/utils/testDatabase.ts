// Utility to test database connectivity and permissions
import { supabase } from '../services/supabase';

export const testDatabaseConnection = async () => {
  try {
    console.log('Testing database connection...');
    
    // Test 1: Check if we can read from user_profiles
    const { data: readData, error: readError } = await supabase
      .from('user_profiles')
      .select('*')
      .limit(1);
    
    console.log('Read test result:', { data: readData, error: readError });
    
    // Test 2: Check if we can insert into user_profiles (with a test record)
    const testUserId = 'test-' + Date.now();
    const { data: insertData, error: insertError } = await supabase
      .from('user_profiles')
      .insert({
        user_id: testUserId,
        username: 'test_user_' + Date.now()
      })
      .select();
    
    console.log('Insert test result:', { data: insertData, error: insertError });
    
    // Test 3: Clean up test record
    if (!insertError) {
      const { error: deleteError } = await supabase
        .from('user_profiles')
        .delete()
        .eq('user_id', testUserId);
      
      console.log('Delete test result:', { error: deleteError });
    }
    
    return {
      readWorks: !readError,
      insertWorks: !insertError,
      readError,
      insertError
    };
  } catch (error) {
    console.error('Database test error:', error);
    return {
      readWorks: false,
      insertWorks: false,
      error
    };
  }
};

// Export for use in browser console
(window as any).testDatabaseConnection = testDatabaseConnection; 