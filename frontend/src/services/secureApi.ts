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
  }
}; 