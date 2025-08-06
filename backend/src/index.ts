import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import multer from 'multer';
import { createClient, User } from '@supabase/supabase-js';
import { spawn } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';

dotenv.config();

// Extend Express Request interface to include user property
declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}

const app = express();
const port = process.env.PORT || 5001;

// Middleware
app.use(cors({
  origin: function (origin, callback) {
    const allowedOrigins = [
      'http://localhost:3000',
      'https://wmoj.ca',
      'https://wmoj.onrender.com',
      ...(process.env.FRONTEND_URL ? [process.env.FRONTEND_URL] : [])
    ];
    
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  optionsSuccessStatus: 200,
  preflightContinue: false
}));
app.use(express.json());

// Error handling middleware for CORS
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (err.message === 'Not allowed by CORS') {
    return res.status(403).json({
      error: 'CORS policy violation',
      message: 'Origin not allowed'
    });
  }
  next(err);
});

// Supabase client
const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

// Supabase admin client for backend operations (bypasses RLS)
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

// Multer configuration for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

const upload = multer({ storage });

interface TestResult {
  testCaseId: string;
  passed: boolean;
  actualOutput?: string;
  expectedOutput?: string;
  input?: string;
  error?: string;
}

// Authentication middleware
const authenticateUser = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No authorization token provided' });
    }

    const userId = authHeader.substring(7); // Remove 'Bearer ' prefix
    
    // For now, we'll trust the user ID from the frontend since Supabase auth is handled client-side
    // In a production environment, you might want to verify the JWT token instead
    if (!userId || userId.length < 10) {
      return res.status(401).json({ error: 'Invalid user token' });
    }

    // Create a minimal user object with the ID
    req.user = { id: userId } as User;
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(401).json({ error: 'Authentication failed' });
  }
};

// Admin authorization middleware
const requireAdmin = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const { data: adminUser, error } = await supabaseAdmin
      .from('admin_users')
      .select('is_admin')
      .eq('user_id', userId)
      .single();

    if (error || !adminUser || !adminUser.is_admin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    next();
  } catch (error) {
    console.error('Admin authorization error:', error);
    res.status(403).json({ error: 'Admin authorization failed' });
  }
};

// Routes
app.get('/', (req, res) => {
  res.json({ message: 'WMOJ Backend API' });
});

// Secure API Routes

// Handle preflight requests for authenticated endpoints
app.options('/api/submissions', (req, res) => {
  res.header('Access-Control-Allow-Origin', req.headers.origin);
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.status(200).end();
});

app.options('/api/contests/:contestId', (req, res) => {
  res.header('Access-Control-Allow-Origin', req.headers.origin);
  res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.status(200).end();
});

app.options('/api/contests/:contestId/leaderboard', (req, res) => {
  res.header('Access-Control-Allow-Origin', req.headers.origin);
  res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.status(200).end();
});

app.options('/api/participations', (req, res) => {
  res.header('Access-Control-Allow-Origin', req.headers.origin);
  res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.status(200).end();
});

app.options('/api/contests/:contestId/join', (req, res) => {
  res.header('Access-Control-Allow-Origin', req.headers.origin);
  res.header('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.status(200).end();
});

// Get active contests (public)
app.get('/api/contests', async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('contests')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) {
      return res.status(500).json({ success: false, error: 'Failed to fetch contests' });
    }

    res.json({ success: true, data });
  } catch (error) {
    console.error('Error fetching contests:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// Get standalone problems (public)
app.get('/api/problems', async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('problems')
      .select('*')
      .is('contest_id', null)
      .order('created_at', { ascending: false });

    if (error) {
      return res.status(500).json({ success: false, error: 'Failed to fetch problems' });
    }

    res.json({ success: true, data });
  } catch (error) {
    console.error('Error fetching problems:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// Get a single problem
app.get('/api/problems/:problemId', async (req, res) => {
  try {
    const { problemId } = req.params;
    
    const { data, error } = await supabaseAdmin
      .from('problems')
      .select('*')
      .eq('id', problemId)
      .single();

    if (error) {
      return res.status(404).json({ success: false, error: 'Problem not found' });
    }

    res.json({ success: true, data });
  } catch (error) {
    console.error('Error fetching problem:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

app.get('/api/submissions', authenticateUser, async (req, res) => {
  try {
    const userId = req.user?.id;
    const { contestId } = req.query;

    let query = supabaseAdmin
      .from('contest_submissions')
      .select('*')
      .eq('user_id', userId);

    if (contestId) {
      query = query.eq('contest_id', contestId);
    }

    const { data, error } = await query;

    if (error) {
      return res.status(500).json({ success: false, error: 'Failed to fetch submissions' });
    }

    res.json({ success: true, data });
  } catch (error) {
    console.error('Error fetching submissions:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

app.post('/api/submissions', authenticateUser, async (req, res) => {
  try {
    const userId = req.user?.id;
    const { contest_id, problem_id, score, total_tests } = req.body;

    if (!contest_id || !problem_id || score === undefined || total_tests === undefined) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }

    // Check if submission already exists
    const { data: existingSubmission, error: checkError } = await supabaseAdmin
      .from('contest_submissions')
      .select('*')
      .eq('contest_id', contest_id)
      .eq('problem_id', problem_id)
      .eq('user_id', userId)
      .single();

    if (checkError === null && existingSubmission) {
      // Update existing submission
      const { data, error } = await supabaseAdmin
        .from('contest_submissions')
        .update({
          score: score,
          total_tests: total_tests,
          submitted_at: new Date().toISOString()
        })
        .eq('id', existingSubmission.id)
        .select()
        .single();

      if (error) {
        return res.status(500).json({ success: false, error: 'Failed to update submission' });
      }

      return res.json({ success: true, data });
    }

    // Create new submission
    const { data, error } = await supabaseAdmin
      .from('contest_submissions')
      .insert({
        contest_id: contest_id,
        problem_id: problem_id,
        user_id: userId,
        score: score,
        total_tests: total_tests
      })
      .select()
      .single();

    if (error) {
      return res.status(500).json({ success: false, error: 'Failed to create submission' });
    }

    res.json({ success: true, data });
  } catch (error) {
    console.error('Error saving submission:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

app.get('/api/contests/:contestId', authenticateUser, async (req, res) => {
  try {
    const { contestId } = req.params;
    const userId = req.user?.id;

    // Check if user is participating in the contest
    const { data: participation, error: participationError } = await supabaseAdmin
      .from('contest_participants')
      .select('*')
      .eq('contest_id', contestId)
      .eq('user_id', userId)
      .single();

    if (participationError || !participation) {
      return res.status(403).json({ success: false, error: 'Not participating in this contest' });
    }

    // Get contest data
    const { data: contest, error: contestError } = await supabaseAdmin
      .from('contests')
      .select('*')
      .eq('id', contestId)
      .single();

    if (contestError || !contest) {
      return res.status(404).json({ success: false, error: 'Contest not found' });
    }

    // Get problems (without test cases)
    const { data: problems, error: problemsError } = await supabaseAdmin
      .from('problems')
      .select('*')
      .eq('contest_id', contestId)
      .order('created_at', { ascending: true });

    if (problemsError) {
      return res.status(500).json({ success: false, error: 'Failed to fetch problems' });
    }

    // Get user's submissions only
    const { data: submissions, error: submissionsError } = await supabaseAdmin
      .from('contest_submissions')
      .select('*')
      .eq('contest_id', contestId)
      .eq('user_id', userId);

    if (submissionsError) {
      return res.status(500).json({ success: false, error: 'Failed to fetch submissions' });
    }

    res.json({
      success: true,
      data: {
        contest,
        problems,
        submissions
      }
    });
  } catch (error) {
    console.error('Error fetching contest data:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

app.get('/api/contests/:contestId/leaderboard', authenticateUser, async (req, res) => {
  try {
    const { contestId } = req.params;
    const userId = req.user?.id;

    // Check if user is participating
    const { data: participation, error: participationError } = await supabaseAdmin
      .from('contest_participants')
      .select('*')
      .eq('contest_id', contestId)
      .eq('user_id', userId)
      .single();

    if (participationError || !participation) {
      return res.status(403).json({ success: false, error: 'Not participating in this contest' });
    }

    // Get all participants
    const { data: participants, error: participantsError } = await supabaseAdmin
      .from('contest_participants')
      .select('*')
      .eq('contest_id', contestId);

    if (participantsError) {
      return res.status(500).json({ success: false, error: 'Failed to fetch participants' });
    }

    // Get user profiles
    const participantUserIds = participants?.map(p => p.user_id) || [];
    const { data: userProfiles, error: profilesError } = await supabaseAdmin
      .from('user_profiles')
      .select('user_id, username')
      .in('user_id', participantUserIds);

    if (profilesError) {
      return res.status(500).json({ success: false, error: 'Failed to fetch user profiles' });
    }

    // Get all problems for this contest
    const { data: problems, error: problemsError } = await supabaseAdmin
      .from('problems')
      .select('*')
      .eq('contest_id', contestId);

    if (problemsError) {
      return res.status(500).json({ success: false, error: 'Failed to fetch problems' });
    }

    // Get all submissions for the contest
    const { data: submissions, error: submissionsError } = await supabaseAdmin
      .from('contest_submissions')
      .select('*')
      .eq('contest_id', contestId);

    if (submissionsError) {
      return res.status(500).json({ success: false, error: 'Failed to fetch submissions' });
    }

    // Get test cases for all problems to calculate total possible score
    const { data: testCases, error: testCasesError } = await supabaseAdmin
      .from('test_cases')
      .select('*')
      .in('problem_id', problems.map(p => p.id));

    if (testCasesError) {
      return res.status(500).json({ success: false, error: 'Failed to fetch test cases' });
    }

    // Calculate total possible score for the contest
    const totalPossibleScore = problems.reduce((total, problem) => {
      const problemTestCases = testCases.filter(tc => tc.problem_id === problem.id);
      return total + problemTestCases.length;
    }, 0);

    // Calculate leaderboard
    const leaderboardData = participants?.map(participant => {
      const profile = userProfiles?.find(p => p.user_id === participant.user_id);
      const userSubmissions = submissions?.filter(s => s.user_id === participant.user_id) || [];
      const totalScore = userSubmissions.reduce((sum, sub) => sum + sub.score, 0);
      
      // Only count problems as solved if user passed all test cases
      const problemsSolved = userSubmissions.filter(sub => 
        sub.score === sub.total_tests && sub.total_tests > 0
      ).length;

      return {
        user_id: participant.user_id,
        username: profile?.username || 'Anonymous User',
        total_score: totalScore,
        total_possible_score: totalPossibleScore,
        problems_solved: problemsSolved,
        total_problems: problems.length
      };
    }) || [];

    // Sort by total score (descending), then by problems solved (descending)
    leaderboardData.sort((a, b) => {
      if (b.total_score !== a.total_score) {
        return b.total_score - a.total_score;
      }
      return b.problems_solved - a.problems_solved;
    });

    res.json({ success: true, data: leaderboardData });
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// Admin routes

// Handle preflight requests for admin endpoints
app.options('/api/admin/contests', (req, res) => {
  res.header('Access-Control-Allow-Origin', req.headers.origin);
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.status(200).end();
});

app.options('/api/admin/problems', (req, res) => {
  res.header('Access-Control-Allow-Origin', req.headers.origin);
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.status(200).end();
});

app.options('/api/admin/contests/:contestId', (req, res) => {
  res.header('Access-Control-Allow-Origin', req.headers.origin);
  res.header('Access-Control-Allow-Methods', 'PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.status(200).end();
});

app.options('/api/admin/problems/:problemId', (req, res) => {
  res.header('Access-Control-Allow-Origin', req.headers.origin);
  res.header('Access-Control-Allow-Methods', 'PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.status(200).end();
});

app.options('/api/admin/contests/:contestId/status', (req, res) => {
  res.header('Access-Control-Allow-Origin', req.headers.origin);
  res.header('Access-Control-Allow-Methods', 'PUT, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.status(200).end();
});

// Get all contests (admin only)
app.get('/api/admin/contests', authenticateUser, requireAdmin, async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('contests')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      return res.status(500).json({ success: false, error: 'Failed to fetch contests' });
    }

    res.json({ success: true, data });
  } catch (error) {
    console.error('Error fetching contests:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// Get all problems (admin only)
app.get('/api/admin/problems', authenticateUser, requireAdmin, async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('problems')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      return res.status(500).json({ success: false, error: 'Failed to fetch problems' });
    }

    res.json({ success: true, data });
  } catch (error) {
    console.error('Error fetching problems:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// Handle preflight requests for signup
app.options('/api/users/signup', (req, res) => {
  res.header('Access-Control-Allow-Origin', req.headers.origin);
  res.header('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.status(200).end();
});

// Handle preflight requests for check availability
app.options('/api/users/check-availability', (req, res) => {
  res.header('Access-Control-Allow-Origin', req.headers.origin);
  res.header('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.status(200).end();
});

// Check if email or username is available for signup
app.post('/api/users/check-availability', async (req, res) => {
  try {
    const { email, username } = req.body;

    if (!email || !username) {
      return res.status(400).json({ success: false, error: 'Email and username are required' });
    }

    // Check if email already exists in Supabase Auth
    const { data: existingUser, error: authError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (authError) {
      console.error('Error checking existing users:', authError);
      return res.status(500).json({ success: false, error: 'Failed to check user availability' });
    }

    const emailExists = existingUser.users.some(user => user.email === email.trim().toLowerCase());
    
    if (emailExists) {
      return res.status(400).json({ success: false, error: 'This email address is already registered. Please use a different email or try logging in.' });
    }

    // Check if username already exists in user_profiles
    const { data: existingProfile, error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .select('username')
      .eq('username', username.trim())
      .maybeSingle();

    if (profileError && profileError.code !== 'PGRST116') {
      console.error('Error checking existing username:', profileError);
      return res.status(500).json({ success: false, error: 'Failed to check username availability' });
    }

    if (existingProfile) {
      return res.status(400).json({ success: false, error: 'This username is already taken. Please choose a different username.' });
    }

    // Both email and username are available
    res.json({ success: true, message: 'Email and username are available' });
  } catch (error) {
    console.error('Error in check-availability:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// Complete signup endpoint that handles both Supabase auth and our database
app.post('/api/users/signup', async (req, res) => {
  try {
    const { email, password, username } = req.body;

    if (!email || !password || !username) {
      return res.status(400).json({ success: false, error: 'Email, password, and username are required' });
    }

    // Validate username format
    const trimmedUsername = username.trim();
    if (trimmedUsername.length < 3 || trimmedUsername.length > 20) {
      return res.status(400).json({ success: false, error: 'Username must be between 3 and 20 characters' });
    }
    if (!/^[a-zA-Z0-9_]+$/.test(trimmedUsername)) {
      return res.status(400).json({ success: false, error: 'Username can only contain letters, numbers, and underscores' });
    }

    // Check if email already exists
    const { data: existingUsers, error: authError } = await supabaseAdmin.auth.admin.listUsers();
    if (authError) {
      console.error('Error checking existing users:', authError);
      return res.status(500).json({ success: false, error: 'Failed to check user availability' });
    }

    const emailExists = existingUsers.users.some(user => user.email === email.trim().toLowerCase());
    if (emailExists) {
      return res.status(400).json({ success: false, error: 'This email address is already registered. Please use a different email or try logging in.' });
    }

    // Check if username already exists
    const { data: existingProfile, error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .select('username')
      .eq('username', trimmedUsername)
      .maybeSingle();

    if (profileError && profileError.code !== 'PGRST116') {
      console.error('Error checking existing username:', profileError);
      return res.status(500).json({ success: false, error: 'Failed to check username availability' });
    }

    if (existingProfile) {
      return res.status(400).json({ success: false, error: 'This username is already taken. Please choose a different username.' });
    }

    // Create user in Supabase Auth (with email_confirm: true to allow immediate login)
    const { data: authData, error: signupError } = await supabaseAdmin.auth.admin.createUser({
      email: email.trim(),
      password,
      email_confirm: true, // Allow immediate login, but track verification separately
      user_metadata: {
        username: trimmedUsername
      }
    });

    if (signupError) {
      console.error('Supabase auth signup error:', signupError);
      return res.status(400).json({ success: false, error: signupError.message });
    }

    if (!authData.user) {
      return res.status(500).json({ success: false, error: 'Failed to create user account' });
    }

    // Create user profile
    const { error: profileInsertError } = await supabaseAdmin
      .from('user_profiles')
      .insert({ 
        user_id: authData.user.id, 
        username: trimmedUsername 
      });

    if (profileInsertError) {
      console.error('Error creating user profile:', profileInsertError);
      // Don't fail the signup if profile creation fails - we can retry later
    }

    // Create verified_users entry (initially false)
    const { error: verifiedInsertError } = await supabaseAdmin
      .from('verified_users')
      .insert({ 
        user_id: authData.user.id, 
        email: email.trim().toLowerCase(),
        is_verified: false 
      });

    if (verifiedInsertError) {
      console.error('Error creating verified_users entry:', verifiedInsertError);
      // Don't fail the signup if this fails
    }

    // Create admin user record
    const { error: adminInsertError } = await supabaseAdmin
      .from('admin_users')
      .insert({ 
        user_id: authData.user.id, 
        is_admin: false 
      });

    if (adminInsertError) {
      console.error('Error creating admin_users entry:', adminInsertError);
    }

    res.json({ 
      success: true, 
      message: 'Account created successfully! You are now logged in.',
      user: {
        id: authData.user.id,
        email: authData.user.email,
        user_metadata: authData.user.user_metadata
      }
    });

  } catch (error) {
    console.error('Error in signup:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// Handle preflight requests for email verification
app.options('/api/users/resend-verification', (req, res) => {
  res.header('Access-Control-Allow-Origin', req.headers.origin);
  res.header('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.status(200).end();
});

app.options('/api/users/verify-email', (req, res) => {
  res.header('Access-Control-Allow-Origin', req.headers.origin);
  res.header('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.status(200).end();
});

app.options('/api/users/verification-status', (req, res) => {
  res.header('Access-Control-Allow-Origin', req.headers.origin);
  res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.status(200).end();
});

// Resend verification email
app.post('/api/users/resend-verification', authenticateUser, async (req, res) => {
  try {
    const userId = req.user?.id;

    // Get user's auth data
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.getUserById(userId!);
    
    if (authError || !authUser) {
      return res.status(400).json({ success: false, error: 'User not found' });
    }

    // Check if already verified
    const { data: verifiedUser, error: verifiedError } = await supabaseAdmin
      .from('verified_users')
      .select('is_verified')
      .eq('user_id', userId)
      .single();

    if (!verifiedError && verifiedUser && verifiedUser.is_verified) {
      return res.status(400).json({ success: false, error: 'Email is already verified' });
    }

    // Generate a new confirmation link using the recovery type
    const { data: linkData, error: resendError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'recovery',
      email: authUser.user.email!
    });

    if (resendError) {
      console.error('Error resending verification email:', resendError);
      return res.status(500).json({ success: false, error: 'Failed to resend verification email' });
    }

    res.json({ success: true, message: 'Verification email sent successfully' });
  } catch (error) {
    console.error('Error in resend verification:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// Check verification status
app.get('/api/users/verification-status', authenticateUser, async (req, res) => {
  try {
    const userId = req.user?.id;

    const { data: verifiedUser, error: verifiedError } = await supabaseAdmin
      .from('verified_users')
      .select('is_verified')
      .eq('user_id', userId)
      .single();

    if (verifiedError) {
      return res.status(500).json({ success: false, error: 'Failed to check verification status' });
    }

    res.json({ 
      success: true, 
      data: { 
        is_verified: verifiedUser ? verifiedUser.is_verified : false 
      } 
    });
  } catch (error) {
    console.error('Error checking verification status:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// Verify email (called when user clicks verification link)
app.post('/api/users/verify-email', async (req, res) => {
  try {
    const { access_token, refresh_token } = req.body;

    if (!access_token) {
      return res.status(400).json({ success: false, error: 'Access token required' });
    }

    // Verify the token and get user
    const { data: { user }, error: verifyError } = await supabaseAdmin.auth.getUser(access_token);

    if (verifyError || !user) {
      console.error('Error verifying token:', verifyError);
      return res.status(400).json({ success: false, error: 'Invalid verification token' });
    }

    // Update the user's email confirmation status
    const { error: updateAuthError } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
      email_confirm: true
    });

    if (updateAuthError) {
      console.error('Error updating auth user:', updateAuthError);
      return res.status(500).json({ success: false, error: 'Failed to verify email' });
    }

    // Update verified_users table
    const { error: updateVerifiedError } = await supabaseAdmin
      .from('verified_users')
      .update({ is_verified: true })
      .eq('user_id', user.id);

    if (updateVerifiedError) {
      console.error('Error updating verified_users:', updateVerifiedError);
      // Don't fail the verification if this update fails
    }

    res.json({ success: true, message: 'Email verified successfully!' });
  } catch (error) {
    console.error('Error in verify email:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// Handle preflight requests for finalize signup
app.options('/api/users/finalize-signup', (req, res) => {
  res.header('Access-Control-Allow-Origin', req.headers.origin);
  res.header('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.status(200).end();
});

app.post('/api/users/finalize-signup', async (req, res) => {
  try {
    console.log('Finalize signup request received:', { body: req.body });
    const { user_id, username } = req.body;

    if (!user_id || !username || !username.trim()) {
      console.log('Missing required fields:', { user_id, username });
      return res.status(400).json({ success: false, error: 'User ID and username are required' });
    }

    // Verify the user exists and is confirmed in Supabase Auth
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.getUserById(user_id);
    
    if (authError || !authUser) {
      console.log('User not found in auth:', authError);
      return res.status(400).json({ success: false, error: 'Invalid user ID or user not found' });
    }

    // Check if user's email is confirmed
    if (!authUser.user.email_confirmed_at) {
      console.log('User email not confirmed:', user_id);
      return res.status(400).json({ success: false, error: 'Email verification required before profile creation' });
    }

    const trimmedUsername = username.trim();

    if (trimmedUsername.length < 3 || trimmedUsername.length > 20) {
      return res.status(400).json({ success: false, error: 'Username must be between 3 and 20 characters' });
    }
    if (!/^[a-zA-Z0-9_]+$/.test(trimmedUsername)) {
      return res.status(400).json({ success: false, error: 'Username can only contain letters, numbers, and underscores' });
    }

    // Check if username is already taken
    const { data: existingUser, error: checkUserError } = await supabaseAdmin
      .from('user_profiles')
      .select('username')
      .eq('username', trimmedUsername)
      .maybeSingle();

    if (checkUserError) {
      console.error('Error checking for existing username:', checkUserError);
      return res.status(500).json({ success: false, error: 'Database error when checking username.' });
    }

    if (existingUser) {
      return res.status(400).json({ success: false, error: 'Username is already taken' });
    }

    // Create new user profile
    const { data: newProfile, error: insertProfileError } = await supabaseAdmin
      .from('user_profiles')
      .insert({ user_id: user_id, username: trimmedUsername })
      .select()
      .single();

    if (insertProfileError) {
      console.error('Error creating profile in DB:', insertProfileError);
      if (insertProfileError.code === '23503') { // foreign_key_violation
        return res.status(400).json({ success: false, error: 'Invalid user ID. User does not exist.' });
      }
      return res.status(500).json({ success: false, error: 'Failed to create user profile.' });
    }

    // Create admin user record
    const { error: insertAdminError } = await supabaseAdmin
      .from('admin_users')
      .insert({ user_id: user_id, is_admin: false });

    if (insertAdminError) {
      // This is not ideal, but we shouldn't fail the whole signup if this fails.
      // We'll log the error and the user can be handled manually if needed.
      console.error('Critical: Failed to create admin user record for new user:', insertAdminError);
    }

    res.status(201).json({ success: true, data: newProfile });

  } catch (error) {
    console.error('Unexpected error in /api/users/finalize-signup:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

app.post('/api/admin/contests', authenticateUser, requireAdmin, async (req, res) => {
  try {
    const { title, description, end_time } = req.body;

    if (!title || !description) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }

    const { data, error } = await supabaseAdmin
      .from('contests')
      .insert([{
        title: title.trim(),
        description: description.trim(),
        end_time: end_time || null
      }])
      .select()
      .single();

    if (error) {
      return res.status(500).json({ success: false, error: 'Failed to create contest' });
    }

    res.json({ success: true, data });
  } catch (error) {
    console.error('Error creating contest:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

app.post('/api/admin/problems', authenticateUser, requireAdmin, async (req, res) => {
  try {
    const { title, description, contest_id, test_cases } = req.body;

    if (!title || !description || !test_cases || test_cases.length === 0) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }

    // Insert problem
    const { data: problem, error: problemError } = await supabaseAdmin
      .from('problems')
      .insert([{
        title: title.trim(),
        description: description.trim(),
        contest_id: contest_id || null
      }])
      .select()
      .single();

    if (problemError) {
      return res.status(500).json({ success: false, error: 'Failed to create problem' });
    }

    // Insert test cases
    const testCasesToInsert = test_cases.map((tc: any) => ({
      problem_id: problem.id,
      input: tc.input.trim(),
      expected_output: tc.expected_output.trim()
    }));

    const { error: testCasesError } = await supabaseAdmin
      .from('test_cases')
      .insert(testCasesToInsert);

    if (testCasesError) {
      return res.status(500).json({ success: false, error: 'Failed to create test cases' });
    }

    res.json({ success: true, data: problem });
  } catch (error) {
    console.error('Error creating problem:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// Update contest status
app.put('/api/admin/contests/:contestId/status', authenticateUser, requireAdmin, async (req, res) => {
  try {
    const { contestId } = req.params;
    const { is_active } = req.body;

    const { data, error } = await supabaseAdmin
      .from('contests')
      .update({ is_active })
      .eq('id', contestId)
      .select()
      .single();

    if (error) {
      return res.status(500).json({ success: false, error: 'Failed to update contest status' });
    }

    res.json({ success: true, data });
  } catch (error) {
    console.error('Error updating contest status:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// Update contest
app.put('/api/admin/contests/:contestId', authenticateUser, requireAdmin, async (req, res) => {
  try {
    const { contestId } = req.params;
    const { title, description, end_time } = req.body;

    if (!title || !description) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }

    const { data, error } = await supabaseAdmin
      .from('contests')
      .update({
        title: title.trim(),
        description: description.trim(),
        end_time: end_time || null
      })
      .eq('id', contestId)
      .select()
      .single();

    if (error) {
      return res.status(500).json({ success: false, error: 'Failed to update contest' });
    }

    res.json({ success: true, data });
  } catch (error) {
    console.error('Error updating contest:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// Update problem
app.put('/api/admin/problems/:problemId', authenticateUser, requireAdmin, async (req, res) => {
  try {
    const { problemId } = req.params;
    const { title, description, contest_id } = req.body;

    if (!title || !description) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }

    const { data, error } = await supabaseAdmin
      .from('problems')
      .update({
        title: title.trim(),
        description: description.trim(),
        contest_id: contest_id || null
      })
      .eq('id', problemId)
      .select()
      .single();

    if (error) {
      return res.status(500).json({ success: false, error: 'Failed to update problem' });
    }

    res.json({ success: true, data });
  } catch (error) {
    console.error('Error updating problem:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// Delete contest
app.delete('/api/admin/contests/:contestId', authenticateUser, requireAdmin, async (req, res) => {
  try {
    const { contestId } = req.params;

    const { error } = await supabaseAdmin
      .from('contests')
      .delete()
      .eq('id', contestId);

    if (error) {
      return res.status(500).json({ success: false, error: 'Failed to delete contest' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting contest:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// Delete problem
app.delete('/api/admin/problems/:problemId', authenticateUser, requireAdmin, async (req, res) => {
  try {
    const { problemId } = req.params;

    const { error } = await supabaseAdmin
      .from('problems')
      .delete()
      .eq('id', problemId);

    if (error) {
      return res.status(500).json({ success: false, error: 'Failed to delete problem' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting problem:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// Note: Profile and admin user creation are now handled by /api/users/finalize-signup

// Handle preflight requests for profile endpoint
app.options('/api/profile', (req, res) => {
  res.header('Access-Control-Allow-Origin', req.headers.origin);
  res.header('Access-Control-Allow-Methods', 'GET, PUT, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.status(200).end();
});

// Get user profile
app.get('/api/profile', authenticateUser, async (req, res) => {
  try {
    const userId = req.user?.id;

    const { data, error } = await supabaseAdmin
      .from('user_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) {
      return res.status(404).json({ success: false, error: 'Profile not found' });
    }

    res.json({ success: true, data });
  } catch (error) {
    console.error('Error fetching profile:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// Profile update route
app.put('/api/profile', authenticateUser, async (req, res) => {
  try {
    const userId = req.user?.id;
    const { username } = req.body;

    if (!username || username.trim().length === 0) {
      return res.status(400).json({ success: false, error: 'Username is required' });
    }

    // Check if username is already taken by another user
    const { data: existingUser, error: checkError } = await supabaseAdmin
      .from('user_profiles')
      .select('username')
      .eq('username', username.trim())
      .neq('user_id', userId)
      .single();

    if (checkError === null && existingUser) {
      return res.status(400).json({ success: false, error: 'Username is already taken' });
    }

    // Update username
    const { data, error } = await supabaseAdmin
      .from('user_profiles')
      .update({ username: username.trim() })
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      return res.status(500).json({ success: false, error: 'Failed to update profile' });
    }

    res.json({ success: true, data });
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// Get user's contest participations
app.get('/api/participations', authenticateUser, async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(400).json({ success: false, error: 'User ID is required' });
    }

    const { data: participations, error } = await supabaseAdmin
      .from('contest_participants')
      .select('*')
      .eq('user_id', userId);

    if (error) {
      console.error('Error fetching participations:', error);
      return res.status(500).json({ success: false, error: 'Failed to fetch participations' });
    }

    res.json({ success: true, data: participations || [] });
  } catch (error) {
    console.error('Error fetching participations:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// Join contest
app.post('/api/contests/:contestId/join', authenticateUser, async (req, res) => {
  try {
    const { contestId } = req.params;
    const userId = req.user?.id;

    // Check if user is email verified
    const { data: verifiedUser, error: verifiedError } = await supabaseAdmin
      .from('verified_users')
      .select('is_verified')
      .eq('user_id', userId)
      .single();

    if (verifiedError || !verifiedUser || !verifiedUser.is_verified) {
      return res.status(403).json({ 
        success: false, 
        error: 'Email verification required to join contests. Please verify your email first.',
        requiresVerification: true
      });
    }

    // Check if contest exists and is active
    const { data: contest, error: contestError } = await supabaseAdmin
      .from('contests')
      .select('*')
      .eq('id', contestId)
      .eq('is_active', true)
      .single();

    if (contestError || !contest) {
      return res.status(404).json({ success: false, error: 'Contest not found or not active' });
    }

    // Check if user is already participating
    const { data: existingParticipation, error: checkError } = await supabaseAdmin
      .from('contest_participants')
      .select('*')
      .eq('contest_id', contestId)
      .eq('user_id', userId)
      .single();

    if (checkError === null && existingParticipation) {
      return res.status(400).json({ success: false, error: 'Already participating in this contest' });
    }

    // Join the contest
    const { data: participation, error: joinError } = await supabaseAdmin
      .from('contest_participants')
      .insert([{
        contest_id: contestId,
        user_id: userId
      }])
      .select()
      .single();

    if (joinError) {
      console.error('Error joining contest:', joinError);
      return res.status(500).json({ success: false, error: 'Failed to join contest' });
    }

    res.json({ success: true, data: participation });
  } catch (error) {
    console.error('Error joining contest:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// Handle preflight requests for judge endpoint
app.options('/judge', (req, res) => {
  res.header('Access-Control-Allow-Origin', req.headers.origin);
  res.header('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.status(200).end();
});

// Judge endpoint for code execution
app.post('/judge', upload.single('code'), async (req, res) => {
  try {
    console.log('Judge request received:', req.body);
    console.log('File received:', req.file);
    
    const { problemId, userId } = req.body;
    const codeFile = req.file;

    if (!codeFile || !problemId || !userId) {
      console.log('Missing code file, problem ID, or user ID');
      return res.status(400).json({ error: 'Missing code file, problem ID, or user ID' });
    }

    // Check if user is email verified before allowing submissions
    const { data: verifiedUser, error: verifiedError } = await supabaseAdmin
      .from('verified_users')
      .select('is_verified')
      .eq('user_id', userId)
      .single();

    if (verifiedError || !verifiedUser || !verifiedUser.is_verified) {
      // Clean up uploaded file
      try {
        fs.unlinkSync(codeFile.path);
      } catch (error) {
        console.log('Error cleaning up file:', error);
      }
      return res.status(403).json({ 
        error: 'Email verification required to submit solutions. Please verify your email first.',
        requiresVerification: true
      });
    }

    // Get problem test cases from Supabase
    const { data: problem, error: problemError } = await supabaseAdmin
      .from('problems')
      .select('*')
      .eq('id', problemId)
      .single();

    if (problemError || !problem) {
      console.log('Problem not found:', problemError);
      return res.status(404).json({ error: 'Problem not found' });
    }

    // Get test cases for this problem
    const { data: testCases, error: testCasesError } = await supabaseAdmin
      .from('test_cases')
      .select('*')
      .eq('problem_id', problemId);

    if (testCasesError) {
      console.log('Failed to fetch test cases:', testCasesError);
      return res.status(500).json({ error: 'Failed to fetch test cases' });
    }

    console.log(`Found ${testCases.length} test cases for problem ${problemId}`);

    let passedTests = 0;
    const totalTests = testCases.length;
    const results: TestResult[] = [];

    // Run code against each test case
    for (const testCase of testCases) {
      try {
        const result = await runCodeAgainstTestCase(codeFile.path, testCase);
        results.push(result);
        if (result.passed) {
          passedTests++;
        }
      } catch (error) {
        console.log('Error running test case:', error);
        results.push({
          testCaseId: testCase.id,
          passed: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    // Clean up uploaded file
    try {
      fs.unlinkSync(codeFile.path);
    } catch (error) {
      console.log('Error cleaning up file:', error);
    }

    const response = {
      score: `${passedTests}/${totalTests}`,
      passedTests,
      totalTests,
      results
    };

    console.log('Judge response:', response);
    res.json(response);

  } catch (error) {
    console.error('Judge error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Helper function to run code against a test case
async function runCodeAgainstTestCase(codeFilePath: string, testCase: any): Promise<TestResult> {
  return new Promise((resolve, reject) => {
    try {
      console.log(`Running test case ${testCase.id} with input: ${testCase.input}`);
      
      // Spawn Python process
      const pythonProcess = spawn('python3', [codeFilePath], {
        stdio: ['pipe', 'pipe', 'pipe'],
        timeout: 5000 // 5 second timeout
      });

      let stdout = '';
      let stderr = '';

      // Collect stdout
      pythonProcess.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      // Collect stderr
      pythonProcess.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      // Handle process completion
      pythonProcess.on('close', (code) => {
        console.log(`Python process exited with code ${code}`);
        console.log(`stdout: "${stdout}"`);
        console.log(`stderr: "${stderr}"`);

        if (code !== 0) {
          resolve({
            testCaseId: testCase.id,
            passed: false,
            error: stderr || `Process exited with code ${code}`,
            input: testCase.input
          });
          return;
        }

        // Compare output with expected output
        const actualOutput = stdout.trim();
        const expectedOutput = testCase.expected_output.trim();
        const passed = actualOutput === expectedOutput;

        console.log(`Expected: "${expectedOutput}", Actual: "${actualOutput}", Passed: ${passed}`);

        resolve({
          testCaseId: testCase.id,
          passed,
          actualOutput,
          expectedOutput,
          input: testCase.input
        });
      });

      // Handle process errors
      pythonProcess.on('error', (error) => {
        console.log('Python process error:', error);
        resolve({
          testCaseId: testCase.id,
          passed: false,
          error: error.message,
          input: testCase.input
        });
      });

      // Send input to stdin
      pythonProcess.stdin.write(testCase.input);
      pythonProcess.stdin.end();

    } catch (error) {
      console.log('Error in runCodeAgainstTestCase:', error);
      resolve({
        testCaseId: testCase.id,
        passed: false,
        error: error instanceof Error ? error.message : 'Execution error',
        input: testCase.input
      });
    }
  });
}

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
}); 