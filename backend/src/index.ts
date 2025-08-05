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
  origin: [
    'http://localhost:3000',
    'https://wmoj.ca'
  ],
  credentials: true
}));
app.use(express.json());

// Supabase client
const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

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

    const { data: adminUser, error } = await supabase
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
app.get('/api/submissions', authenticateUser, async (req, res) => {
  try {
    const userId = req.user?.id;
    const { contestId } = req.query;

    let query = supabase
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

app.get('/api/contests/:contestId', authenticateUser, async (req, res) => {
  try {
    const { contestId } = req.params;
    const userId = req.user?.id;

    // Check if user is participating in the contest
    const { data: participation, error: participationError } = await supabase
      .from('contest_participants')
      .select('*')
      .eq('contest_id', contestId)
      .eq('user_id', userId)
      .single();

    if (participationError || !participation) {
      return res.status(403).json({ success: false, error: 'Not participating in this contest' });
    }

    // Get contest data
    const { data: contest, error: contestError } = await supabase
      .from('contests')
      .select('*')
      .eq('id', contestId)
      .single();

    if (contestError || !contest) {
      return res.status(404).json({ success: false, error: 'Contest not found' });
    }

    // Get problems (without test cases)
    const { data: problems, error: problemsError } = await supabase
      .from('problems')
      .select('*')
      .eq('contest_id', contestId)
      .order('created_at', { ascending: true });

    if (problemsError) {
      return res.status(500).json({ success: false, error: 'Failed to fetch problems' });
    }

    // Get user's submissions only
    const { data: submissions, error: submissionsError } = await supabase
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
    const { data: participation, error: participationError } = await supabase
      .from('contest_participants')
      .select('*')
      .eq('contest_id', contestId)
      .eq('user_id', userId)
      .single();

    if (participationError || !participation) {
      return res.status(403).json({ success: false, error: 'Not participating in this contest' });
    }

    // Get all participants
    const { data: participants, error: participantsError } = await supabase
      .from('contest_participants')
      .select('*')
      .eq('contest_id', contestId);

    if (participantsError) {
      return res.status(500).json({ success: false, error: 'Failed to fetch participants' });
    }

    // Get user profiles
    const participantUserIds = participants?.map(p => p.user_id) || [];
    const { data: userProfiles, error: profilesError } = await supabase
      .from('user_profiles')
      .select('user_id, username')
      .in('user_id', participantUserIds);

    if (profilesError) {
      return res.status(500).json({ success: false, error: 'Failed to fetch user profiles' });
    }

    // Get all submissions for the contest
    const { data: submissions, error: submissionsError } = await supabase
      .from('contest_submissions')
      .select('*')
      .eq('contest_id', contestId);

    if (submissionsError) {
      return res.status(500).json({ success: false, error: 'Failed to fetch submissions' });
    }

    // Calculate leaderboard
    const leaderboardData = participants?.map(participant => {
      const profile = userProfiles?.find(p => p.user_id === participant.user_id);
      const userSubmissions = submissions?.filter(s => s.user_id === participant.user_id) || [];
      const totalScore = userSubmissions.reduce((sum, sub) => sum + sub.score, 0);
      const problemsSolved = new Set(userSubmissions.map(sub => sub.problem_id)).size;

      return {
        user_id: participant.user_id,
        username: profile?.username || `User ${participant.user_id.substring(0, 8)}`,
        total_score: totalScore,
        problems_solved: problemsSolved
      };
    }) || [];

    // Sort by score (descending)
    leaderboardData.sort((a, b) => b.total_score - a.total_score);

    res.json({ success: true, data: leaderboardData });
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// Admin routes
app.post('/api/admin/contests', authenticateUser, requireAdmin, async (req, res) => {
  try {
    const { title, description, end_time } = req.body;

    if (!title || !description) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }

    const { data, error } = await supabase
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
    const { data: problem, error: problemError } = await supabase
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

    const { error: testCasesError } = await supabase
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

// Profile update route
app.put('/api/profile', authenticateUser, async (req, res) => {
  try {
    const userId = req.user?.id;
    const { username } = req.body;

    if (!username || username.trim().length === 0) {
      return res.status(400).json({ success: false, error: 'Username is required' });
    }

    // Check if username is already taken by another user
    const { data: existingUser, error: checkError } = await supabase
      .from('user_profiles')
      .select('username')
      .eq('username', username.trim())
      .neq('user_id', userId)
      .single();

    if (checkError === null && existingUser) {
      return res.status(400).json({ success: false, error: 'Username is already taken' });
    }

    // Update username
    const { data, error } = await supabase
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

    const { data: participations, error } = await supabase
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

    // Check if contest exists and is active
    const { data: contest, error: contestError } = await supabase
      .from('contests')
      .select('*')
      .eq('id', contestId)
      .eq('is_active', true)
      .single();

    if (contestError || !contest) {
      return res.status(404).json({ success: false, error: 'Contest not found or not active' });
    }

    // Check if user is already participating
    const { data: existingParticipation, error: checkError } = await supabase
      .from('contest_participants')
      .select('*')
      .eq('contest_id', contestId)
      .eq('user_id', userId)
      .single();

    if (checkError === null && existingParticipation) {
      return res.status(400).json({ success: false, error: 'Already participating in this contest' });
    }

    // Join the contest
    const { data: participation, error: joinError } = await supabase
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

// Judge endpoint for code execution
app.post('/judge', upload.single('code'), async (req, res) => {
  try {
    console.log('Judge request received:', req.body);
    console.log('File received:', req.file);
    
    const { problemId } = req.body;
    const codeFile = req.file;

    if (!codeFile || !problemId) {
      console.log('Missing code file or problem ID');
      return res.status(400).json({ error: 'Missing code file or problem ID' });
    }

    // Get problem test cases from Supabase
    const { data: problem, error: problemError } = await supabase
      .from('problems')
      .select('*')
      .eq('id', problemId)
      .single();

    if (problemError || !problem) {
      console.log('Problem not found:', problemError);
      return res.status(404).json({ error: 'Problem not found' });
    }

    // Get test cases for this problem
    const { data: testCases, error: testCasesError } = await supabase
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