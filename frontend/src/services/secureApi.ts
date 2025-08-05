import { supabase } from './supabase';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5001';

export interface SecureApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

export const secureApi = {
  // Public endpoints (no auth required)
  async getProblems(): Promise<SecureApiResponse> {
    try {
      const response = await fetch(`${BACKEND_URL}/api/problems`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      const result = await response.json();
      return result;
    } catch (error) {
      return { success: false, error: 'Failed to fetch problems' };
    }
  },

  async getProblem(problemId: string): Promise<SecureApiResponse> {
    try {
      const response = await fetch(`${BACKEND_URL}/api/problems/${problemId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      const result = await response.json();
      return result;
    } catch (error) {
      return { success: false, error: 'Failed to fetch problem' };
    }
  },

  async getContests(): Promise<SecureApiResponse> {
    try {
      const response = await fetch(`${BACKEND_URL}/api/contests`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      const result = await response.json();
      return result;
    } catch (error) {
      return { success: false, error: 'Failed to fetch contests' };
    }
  },
  // Get user's own submissions only
  async getUserSubmissions(contestId?: string): Promise<SecureApiResponse> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, error: 'Not authenticated' };
      }

      const response = await fetch(`${BACKEND_URL}/api/submissions`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${user.id}`,
          'Content-Type': 'application/json',
        },
        ...(contestId && { body: JSON.stringify({ contestId }) })
      });

      const result = await response.json();
      return result;
    } catch (error) {
      return { success: false, error: 'Failed to fetch submissions' };
    }
  },

  // Get contest data with proper access control
  async getContestData(contestId: string): Promise<SecureApiResponse> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, error: 'Not authenticated' };
      }

      const response = await fetch(`${BACKEND_URL}/api/contests/${contestId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${user.id}`,
          'Content-Type': 'application/json',
        }
      });

      const result = await response.json();
      return result;
    } catch (error) {
      return { success: false, error: 'Failed to fetch contest data' };
    }
  },

  // Get leaderboard data (filtered for user's access level)
  async getLeaderboard(contestId: string): Promise<SecureApiResponse> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, error: 'Not authenticated' };
      }

      const response = await fetch(`${BACKEND_URL}/api/contests/${contestId}/leaderboard`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${user.id}`,
          'Content-Type': 'application/json',
        }
      });

      const result = await response.json();
      return result;
    } catch (error) {
      return { success: false, error: 'Failed to fetch leaderboard' };
    }
  },

  // Admin-only operations
  async adminGetContests(): Promise<SecureApiResponse> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, error: 'Not authenticated' };
      }

      const response = await fetch(`${BACKEND_URL}/api/admin/contests`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${user.id}`,
          'Content-Type': 'application/json',
        }
      });

      const result = await response.json();
      return result;
    } catch (error) {
      return { success: false, error: 'Failed to fetch contests' };
    }
  },

  async adminGetProblems(): Promise<SecureApiResponse> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, error: 'Not authenticated' };
      }

      const response = await fetch(`${BACKEND_URL}/api/admin/problems`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${user.id}`,
          'Content-Type': 'application/json',
        }
      });

      const result = await response.json();
      return result;
    } catch (error) {
      return { success: false, error: 'Failed to fetch problems' };
    }
  },

  async adminCreateContest(contestData: any): Promise<SecureApiResponse> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, error: 'Not authenticated' };
      }

      const response = await fetch(`${BACKEND_URL}/api/admin/contests`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${user.id}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(contestData)
      });

      const result = await response.json();
      return result;
    } catch (error) {
      return { success: false, error: 'Failed to create contest' };
    }
  },

  async adminUpdateContestStatus(contestId: string, isActive: boolean): Promise<SecureApiResponse> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, error: 'Not authenticated' };
      }

      const response = await fetch(`${BACKEND_URL}/api/admin/contests/${contestId}/status`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${user.id}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ is_active: isActive })
      });

      const result = await response.json();
      return result;
    } catch (error) {
      return { success: false, error: 'Failed to update contest status' };
    }
  },

  async adminUpdateContest(contestId: string, contestData: any): Promise<SecureApiResponse> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, error: 'Not authenticated' };
      }

      const response = await fetch(`${BACKEND_URL}/api/admin/contests/${contestId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${user.id}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(contestData)
      });

      const result = await response.json();
      return result;
    } catch (error) {
      return { success: false, error: 'Failed to update contest' };
    }
  },

  async adminDeleteContest(contestId: string): Promise<SecureApiResponse> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, error: 'Not authenticated' };
      }

      const response = await fetch(`${BACKEND_URL}/api/admin/contests/${contestId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${user.id}`,
          'Content-Type': 'application/json',
        }
      });

      const result = await response.json();
      return result;
    } catch (error) {
      return { success: false, error: 'Failed to delete contest' };
    }
  },

  async adminUpdateProblem(problemId: string, problemData: any): Promise<SecureApiResponse> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, error: 'Not authenticated' };
      }

      const response = await fetch(`${BACKEND_URL}/api/admin/problems/${problemId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${user.id}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(problemData)
      });

      const result = await response.json();
      return result;
    } catch (error) {
      return { success: false, error: 'Failed to update problem' };
    }
  },

  async adminDeleteProblem(problemId: string): Promise<SecureApiResponse> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, error: 'Not authenticated' };
      }

      const response = await fetch(`${BACKEND_URL}/api/admin/problems/${problemId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${user.id}`,
          'Content-Type': 'application/json',
        }
      });

      const result = await response.json();
      return result;
    } catch (error) {
      return { success: false, error: 'Failed to delete problem' };
    }
  },

  async adminCreateProblem(problemData: any): Promise<SecureApiResponse> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, error: 'Not authenticated' };
      }

      const response = await fetch(`${BACKEND_URL}/api/admin/problems`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${user.id}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(problemData)
      });

      const result = await response.json();
      return result;
    } catch (error) {
      return { success: false, error: 'Failed to create problem' };
    }
  },

  // Note: Profile and admin user creation are now handled by finalizeSignup


  async finalizeSignup(profileData: { user_id: string, username: string }): Promise<SecureApiResponse> {
    try {
      const response = await fetch(`${BACKEND_URL}/api/users/finalize-signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(profileData)
      });
      const result = await response.json();
      if (!response.ok) {
        return { success: false, error: result.error || `Request failed with status ${response.status}` };
      }
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      return { success: false, error: `Network or parsing error: ${errorMessage}` };
    }
  },

  // Get user profile
  async getUserProfile(): Promise<SecureApiResponse> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, error: 'Not authenticated' };
      }

      const response = await fetch(`${BACKEND_URL}/api/profile`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${user.id}`,
          'Content-Type': 'application/json',
        }
      });

      const result = await response.json();
      return result;
    } catch (error) {
      return { success: false, error: 'Failed to fetch profile' };
    }
  },

  // Update user profile (own profile only)
  async updateUserProfile(profileData: any): Promise<SecureApiResponse> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, error: 'Not authenticated' };
      }

      const response = await fetch(`${BACKEND_URL}/api/profile`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${user.id}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(profileData)
      });

      const result = await response.json();
      return result;
    } catch (error) {
      return { success: false, error: 'Failed to update profile' };
    }
  },

  // Get user's contest participations
  async getUserParticipations(): Promise<SecureApiResponse> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, error: 'Not authenticated' };
      }

      const response = await fetch(`${BACKEND_URL}/api/participations`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${user.id}`,
          'Content-Type': 'application/json',
        }
      });

      const result = await response.json();
      return result;
    } catch (error) {
      return { success: false, error: 'Failed to fetch participations' };
    }
  },

  // Join a contest
  async joinContest(contestId: string): Promise<SecureApiResponse> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, error: 'Not authenticated' };
      }

      const response = await fetch(`${BACKEND_URL}/api/contests/${contestId}/join`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${user.id}`,
          'Content-Type': 'application/json',
        }
      });

      const result = await response.json();
      return result;
    } catch (error) {
      return { success: false, error: 'Failed to join contest' };
    }
  },

  // Save contest submission
  async saveContestSubmission(submissionData: any): Promise<SecureApiResponse> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, error: 'Not authenticated' };
      }

      const response = await fetch(`${BACKEND_URL}/api/submissions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${user.id}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submissionData)
      });

      const result = await response.json();
      return result;
    } catch (error) {
      return { success: false, error: 'Failed to save submission' };
    }
  }
}; 