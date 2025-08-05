import { supabase } from './supabase';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5001';

export interface SecureApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

export const secureApi = {
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

  // Create user profile (for signup)
  async createUserProfile(profileData: any): Promise<SecureApiResponse> {
    try {
      const response = await fetch(`${BACKEND_URL}/api/profile`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(profileData)
      });

      const result = await response.json();
      return result;
    } catch (error) {
      return { success: false, error: 'Failed to create profile' };
    }
  },

  // Create admin user record (for signup)
  async createAdminUser(adminData: any): Promise<SecureApiResponse> {
    try {
      const response = await fetch(`${BACKEND_URL}/api/admin-user`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(adminData)
      });

      const result = await response.json();
      return result;
    } catch (error) {
      return { success: false, error: 'Failed to create admin user record' };
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