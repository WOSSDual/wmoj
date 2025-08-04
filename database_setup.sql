-- WMOJ Database Setup Script
-- This script sets up all necessary tables and RLS policies

-- Enable RLS on all tables
ALTER TABLE IF EXISTS user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS contests ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS problems ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS test_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS contest_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS contest_submissions ENABLE ROW LEVEL SECURITY;

-- Create user_profiles table if it doesn't exist
CREATE TABLE IF NOT EXISTS user_profiles (
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    username VARCHAR(20) UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create admin_users table if it doesn't exist
CREATE TABLE IF NOT EXISTS admin_users (
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    is_admin BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create contests table if it doesn't exist
CREATE TABLE IF NOT EXISTS contests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    start_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    end_time TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create problems table if it doesn't exist
CREATE TABLE IF NOT EXISTS problems (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    contest_id UUID REFERENCES contests(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create test_cases table if it doesn't exist
CREATE TABLE IF NOT EXISTS test_cases (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    problem_id UUID REFERENCES problems(id) ON DELETE CASCADE NOT NULL,
    input TEXT NOT NULL,
    expected_output TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create contest_participants table if it doesn't exist
CREATE TABLE IF NOT EXISTS contest_participants (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    contest_id UUID REFERENCES contests(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(contest_id, user_id)
);

-- Create contest_submissions table if it doesn't exist
CREATE TABLE IF NOT EXISTS contest_submissions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    contest_id UUID REFERENCES contests(id) ON DELETE CASCADE NOT NULL,
    problem_id UUID REFERENCES problems(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    score INTEGER DEFAULT 0,
    total_tests INTEGER DEFAULT 0,
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_username ON user_profiles(username);
CREATE INDEX IF NOT EXISTS idx_admin_users_user_id ON admin_users(user_id);
CREATE INDEX IF NOT EXISTS idx_contests_active ON contests(is_active);
CREATE INDEX IF NOT EXISTS idx_problems_contest_id ON problems(contest_id);
CREATE INDEX IF NOT EXISTS idx_test_cases_problem_id ON test_cases(problem_id);
CREATE INDEX IF NOT EXISTS idx_contest_participants_contest_id ON contest_participants(contest_id);
CREATE INDEX IF NOT EXISTS idx_contest_participants_user_id ON contest_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_contest_submissions_contest_id ON contest_submissions(contest_id);
CREATE INDEX IF NOT EXISTS idx_contest_submissions_user_id ON contest_submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_contest_submissions_problem_id ON contest_submissions(problem_id);

-- RLS Policies for user_profiles
-- Users can read their own profile
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
CREATE POLICY "Users can view own profile" ON user_profiles
    FOR SELECT USING (auth.uid() = user_id);

-- Users can update their own profile
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
CREATE POLICY "Users can update own profile" ON user_profiles
    FOR UPDATE USING (auth.uid() = user_id);

-- Users can insert their own profile
DROP POLICY IF EXISTS "Users can insert own profile" ON user_profiles;
CREATE POLICY "Users can insert own profile" ON user_profiles
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Admins can read all profiles
DROP POLICY IF EXISTS "Admins can view all profiles" ON user_profiles;
CREATE POLICY "Admins can view all profiles" ON user_profiles
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM admin_users 
            WHERE user_id = auth.uid() AND is_admin = true
        )
    );

-- RLS Policies for admin_users
-- Users can read their own admin status
DROP POLICY IF EXISTS "Users can view own admin status" ON admin_users;
CREATE POLICY "Users can view own admin status" ON admin_users
    FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own admin record
DROP POLICY IF EXISTS "Users can insert own admin record" ON admin_users;
CREATE POLICY "Users can insert own admin record" ON admin_users
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Admins can read all admin records
DROP POLICY IF EXISTS "Admins can view all admin records" ON admin_users;
CREATE POLICY "Admins can view all admin records" ON admin_users
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM admin_users 
            WHERE user_id = auth.uid() AND is_admin = true
        )
    );

-- RLS Policies for contests
-- Anyone can read active contests
DROP POLICY IF EXISTS "Anyone can view active contests" ON contests;
CREATE POLICY "Anyone can view active contests" ON contests
    FOR SELECT USING (is_active = true);

-- Admins can read all contests
DROP POLICY IF EXISTS "Admins can view all contests" ON contests;
CREATE POLICY "Admins can view all contests" ON contests
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM admin_users 
            WHERE user_id = auth.uid() AND is_admin = true
        )
    );

-- Admins can insert contests
DROP POLICY IF EXISTS "Admins can insert contests" ON contests;
CREATE POLICY "Admins can insert contests" ON contests
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM admin_users 
            WHERE user_id = auth.uid() AND is_admin = true
        )
    );

-- Admins can update contests
DROP POLICY IF EXISTS "Admins can update contests" ON contests;
CREATE POLICY "Admins can update contests" ON contests
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM admin_users 
            WHERE user_id = auth.uid() AND is_admin = true
        )
    );

-- Admins can delete contests
DROP POLICY IF EXISTS "Admins can delete contests" ON contests;
CREATE POLICY "Admins can delete contests" ON contests
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM admin_users 
            WHERE user_id = auth.uid() AND is_admin = true
        )
    );

-- RLS Policies for problems
-- Anyone can read problems
DROP POLICY IF EXISTS "Anyone can view problems" ON problems;
CREATE POLICY "Anyone can view problems" ON problems
    FOR SELECT USING (true);

-- Admins can insert problems
DROP POLICY IF EXISTS "Admins can insert problems" ON problems;
CREATE POLICY "Admins can insert problems" ON problems
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM admin_users 
            WHERE user_id = auth.uid() AND is_admin = true
        )
    );

-- Admins can update problems
DROP POLICY IF EXISTS "Admins can update problems" ON problems;
CREATE POLICY "Admins can update problems" ON problems
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM admin_users 
            WHERE user_id = auth.uid() AND is_admin = true
        )
    );

-- Admins can delete problems
DROP POLICY IF EXISTS "Admins can delete problems" ON problems;
CREATE POLICY "Admins can delete problems" ON problems
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM admin_users 
            WHERE user_id = auth.uid() AND is_admin = true
        )
    );

-- RLS Policies for test_cases
-- Admins can read all test cases
DROP POLICY IF EXISTS "Admins can view all test cases" ON test_cases;
CREATE POLICY "Admins can view all test cases" ON test_cases
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM admin_users 
            WHERE user_id = auth.uid() AND is_admin = true
        )
    );

-- Admins can insert test cases
DROP POLICY IF EXISTS "Admins can insert test cases" ON test_cases;
CREATE POLICY "Admins can insert test cases" ON test_cases
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM admin_users 
            WHERE user_id = auth.uid() AND is_admin = true
        )
    );

-- Admins can update test cases
DROP POLICY IF EXISTS "Admins can update test cases" ON test_cases;
CREATE POLICY "Admins can update test cases" ON test_cases
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM admin_users 
            WHERE user_id = auth.uid() AND is_admin = true
        )
    );

-- Admins can delete test cases
DROP POLICY IF EXISTS "Admins can delete test cases" ON test_cases;
CREATE POLICY "Admins can delete test cases" ON test_cases
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM admin_users 
            WHERE user_id = auth.uid() AND is_admin = true
        )
    );

-- RLS Policies for contest_participants
-- Users can read their own participation
DROP POLICY IF EXISTS "Users can view own participation" ON contest_participants;
CREATE POLICY "Users can view own participation" ON contest_participants
    FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own participation
DROP POLICY IF EXISTS "Users can insert own participation" ON contest_participants;
CREATE POLICY "Users can insert own participation" ON contest_participants
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Admins can read all participation
DROP POLICY IF EXISTS "Admins can view all participation" ON contest_participants;
CREATE POLICY "Admins can view all participation" ON contest_participants
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM admin_users 
            WHERE user_id = auth.uid() AND is_admin = true
        )
    );

-- RLS Policies for contest_submissions
-- Users can read their own submissions
DROP POLICY IF EXISTS "Users can view own submissions" ON contest_submissions;
CREATE POLICY "Users can view own submissions" ON contest_submissions
    FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own submissions
DROP POLICY IF EXISTS "Users can insert own submissions" ON contest_submissions;
CREATE POLICY "Users can insert own submissions" ON contest_submissions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Admins can read all submissions
DROP POLICY IF EXISTS "Admins can view all submissions" ON contest_submissions;
CREATE POLICY "Admins can view all submissions" ON contest_submissions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM admin_users 
            WHERE user_id = auth.uid() AND is_admin = true
        )
    );

-- Create function to automatically create user profile and admin record
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    -- Create user profile
    INSERT INTO public.user_profiles (user_id, username)
    VALUES (NEW.id, 'user_' || substr(NEW.id::text, 1, 8));
    
    -- Create admin record (default to non-admin)
    INSERT INTO public.admin_users (user_id, is_admin)
    VALUES (NEW.id, false);
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically create profile and admin record on user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON user_profiles;
CREATE TRIGGER update_user_profiles_updated_at
    BEFORE UPDATE ON user_profiles
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_admin_users_updated_at ON admin_users;
CREATE TRIGGER update_admin_users_updated_at
    BEFORE UPDATE ON admin_users
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_contests_updated_at ON contests;
CREATE TRIGGER update_contests_updated_at
    BEFORE UPDATE ON contests
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_problems_updated_at ON problems;
CREATE TRIGGER update_problems_updated_at
    BEFORE UPDATE ON problems
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;

-- Grant permissions for future tables
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO anon, authenticated; 