import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import multer from 'multer';
import { createClient } from '@supabase/supabase-js';
import { spawn } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';

dotenv.config();

const app = express();
const port = process.env.PORT || 5001;

// Middleware
app.use(cors({
  origin: [
    'http://localhost:3000',
    'https://wmoj.vercel.app',
    'https://wmoj-frontend.onrender.com'
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

// Routes
app.get('/', (req, res) => {
  res.json({ message: 'WMOJ Backend API' });
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