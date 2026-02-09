import { supabaseApi, authApi, SUPABASE_CONFIG } from '../config/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { calculateBaseMacros } from '../utils/macroCalculations';
import {
  User,
  Class,
  ClassSchedule,
  ClassBooking,
  FoodItem,
  UserMeal,
  ProgressEntry,
  Workout,
  UserGoal,
  Notification,
  LoginForm,
  RegisterForm,
  ProfileForm,
  AddMealForm,
  AddProgressForm,
  AddGoalForm,
} from '../types';

// Helper function to send welcome email (non-blocking)
async function sendWelcomeEmail(
  email: string,
  firstName: string,
  role: 'member' | 'trainer' | 'admin',
  accessCode: string
): Promise<void> {
  try {
    const edgeFunctionUrl = `${SUPABASE_CONFIG.url}/functions/v1/send-welcome-email`;
    
    await fetch(edgeFunctionUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_CONFIG.anonKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        firstName,
        role,
        accessCode,
      }),
    });
    
    console.log('Welcome email sent successfully to:', email);
  } catch (error) {
    // Don't throw - email failure shouldn't block user creation
    console.error('Failed to send welcome email (non-blocking):', error);
  }
}

// Auth Services
export const authService = {
  // Sign up with email and password
  async signUp(data: RegisterForm): Promise<{ user: User | null; error: string | null }> {
    try {
      // First, create the user account
      const signUpResponse = await authApi.post('/signup', {
        email: data.email,
        password: data.password,
        options: {
          data: {
            first_name: data.first_name,
            last_name: data.last_name,
          },
        },
      });

      if (!signUpResponse.data.user) {
        return { user: null, error: 'Failed to create user account' };
      }

      // After successful signup, automatically sign in the user
      const signInResponse = await authApi.post('/token?grant_type=password', {
        email: data.email,
        password: data.password,
      });

      if (signInResponse.data.access_token) {
        // Set the token for future requests
        supabaseApi.defaults.headers.common['Authorization'] = `Bearer ${signInResponse.data.access_token}`;
        authApi.defaults.headers.common['Authorization'] = `Bearer ${signInResponse.data.access_token}`;

        // Get the user profile
        const profileResponse = await supabaseApi.get(`/profiles?id=eq.${signInResponse.data.user.id}`);
        const user = profileResponse.data[0];
        
        if (user) {
          return { user, error: null };
        } else {
          return { user: null, error: 'User profile not found' };
        }
      }

      return { user: null, error: 'Failed to sign in after registration' };
    } catch (error: any) {
      console.error('Sign up error:', error.response?.data || error.message);
      
      // Handle specific Supabase errors
      if (error.response?.data?.error_description) {
        if (error.response.data.error_description.includes('already registered')) {
          return { user: null, error: 'An account with this email already exists' };
        }
        return { user: null, error: error.response.data.error_description };
      }
      
      return { user: null, error: 'Registration failed. Please try again.' };
    }
  },

  // Sign in with email and password
  async signIn(data: LoginForm): Promise<{ user: User | null; error: string | null }> {
    try {
      console.log('=== AUTH SERVICE SIGN IN ===');
      console.log('Attempting to sign in with email:', data.email);
      
      const response = await authApi.post('/token?grant_type=password', {
        email: data.email,
        password: data.password,
      });

      console.log('Auth API response received:', {
        hasAccessToken: !!response.data.access_token,
        hasUser: !!response.data.user,
        userId: response.data.user?.id
      });

      if (response.data.access_token) {
        // Store the session token
        await this.storeSession(response.data.access_token);
        console.log('Session token stored in AsyncStorage');
        
        // Set the token for future requests
        supabaseApi.defaults.headers.common['Authorization'] = `Bearer ${response.data.access_token}`;
        authApi.defaults.headers.common['Authorization'] = `Bearer ${response.data.access_token}`;
        console.log('Authorization headers set');

        // Get user profile
        console.log('Fetching user profile for ID:', response.data.user.id);
        const profileResponse = await supabaseApi.get(`/profiles?id=eq.${response.data.user.id}`);
        console.log('Profile response:', {
          hasData: !!profileResponse.data,
          dataLength: profileResponse.data?.length,
          profile: profileResponse.data?.[0]
        });
        
        let user = profileResponse.data[0];
        
        // If no profile exists, create one
        if (!user) {
          console.log('No profile found, creating user profile...');
          try {
            // Check if user has metadata with names
            const userMetadata = response.data.user.user_metadata || {};
            const firstName = userMetadata.first_name || '';
            const lastName = userMetadata.last_name || '';
            
            console.log('User metadata:', userMetadata);
            console.log('First name from metadata:', firstName);
            console.log('Last name from metadata:', lastName);
            
            const createProfileResponse = await supabaseApi.post('/profiles', {
              id: response.data.user.id,
              email: response.data.user.email,
              first_name: firstName,
              last_name: lastName,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            });
            
            console.log('Profile creation response:', createProfileResponse.data);
            user = createProfileResponse.data[0];
          } catch (profileError: any) {
            console.error('Failed to create profile:', profileError.response?.data || profileError.message);
            // If profile creation fails, return a basic user object
            const userMetadata = response.data.user.user_metadata || {};
            user = {
              id: response.data.user.id,
              email: response.data.user.email,
              first_name: userMetadata.first_name || '',
              last_name: userMetadata.last_name || '',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            };
          }
        }
        
        if (user) {
          console.log('User profile found/created:', user);
          return { user, error: null };
        } else {
          console.log('Failed to get or create user profile');
          return { user: null, error: 'User profile not found' };
        }
      }

      console.log('No access token in response');
      return { user: null, error: 'Invalid credentials' };
    } catch (error: any) {
      console.error('=== AUTH SERVICE SIGN IN ERROR ===');
      console.error('Error details:', error.response?.data || error.message);
      console.error('Error status:', error.response?.status);
      
      // Handle specific error status codes
      if (error.response?.status === 404) {
        return { user: null, error: 'Account not found. Please check your email address or sign up for an account.' };
      }
      
      if (error.response?.status === 401) {
        return { user: null, error: 'Incorrect email or password. Please try again.' };
      }
      
      if (error.response?.status === 400) {
        return { user: null, error: 'Invalid email or password. Please check your credentials and try again.' };
      }
      
      // Handle specific Supabase errors
      if (error.response?.data?.error_description) {
        const errorDesc = error.response.data.error_description.toLowerCase();
        
        if (errorDesc.includes('invalid login credentials') || 
            errorDesc.includes('invalid password') ||
            errorDesc.includes('wrong password')) {
          return { user: null, error: 'Incorrect email or password. Please try again.' };
        }
        
        if (errorDesc.includes('user not found') || errorDesc.includes('email not found')) {
          return { user: null, error: 'No account found with this email address. Please check your email or sign up.' };
        }
        
        return { user: null, error: error.response.data.error_description };
      }
      
      if (error.response?.data?.error) {
        const errorMsg = error.response.data.error.toLowerCase();
        if (errorMsg.includes('invalid') && errorMsg.includes('credentials')) {
          return { user: null, error: 'Incorrect email or password. Please try again.' };
        }
      }
      
      return { user: null, error: 'Unable to sign in. Please check your email and password, then try again.' };
    }
  },

  // Sign out
  async signOut(): Promise<{ error: string | null }> {
    try {
      // Check if we have a valid token before attempting logout
      const storedToken = await this.getStoredSession();
      
      if (storedToken && authApi.defaults.headers.common['Authorization']) {
        try {
          await authApi.post('/logout');
          console.log('Logout API call successful');
        } catch (logoutError: any) {
          console.log('Logout API call failed, but continuing with local cleanup:', logoutError.response?.data || logoutError.message);
          // Don't throw - we'll still clear the local session
        }
      } else {
        console.log('No valid token found, skipping logout API call');
      }
      
      // Always clear the local session regardless of API call result
      await this.clearStoredSession();
      delete supabaseApi.defaults.headers.common['Authorization'];
      delete authApi.defaults.headers.common['Authorization'];
      
      console.log('Sign out successful');
      return { error: null };
    } catch (error: any) {
      console.error('Sign out error:', error.response?.data || error.message);
      
      // Even if everything fails, clear the local session
      try {
        await this.clearStoredSession();
      } catch (clearError) {
        console.log('Error clearing stored session:', clearError);
      }
      
      delete supabaseApi.defaults.headers.common['Authorization'];
      delete authApi.defaults.headers.common['Authorization'];
      
      console.log('Sign out successful (with errors)');
      return { error: null };
    }
  },

 // Get current user
async getCurrentUser(): Promise<{ user: User | null; error: string | null }> {
  try {
    // First, check if we have a stored session token
    const storedToken = await this.getStoredSession();
    
    if (!storedToken) {
      console.log('No stored session token found');
      return { user: null, error: 'No session found' };
    }

    // Set the token for the API call
    authApi.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
    supabaseApi.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;

    // Try to get user from auth API
    try {
      const response = await authApi.get('/user');
      if (response.data && response.data.id) {
        const profileResponse = await supabaseApi.get(`/profiles?id=eq.${response.data.id}`);
        const user = profileResponse.data?.[0];
        if (user) {
          return { user, error: null };
        }
      }
    } catch (authError: any) {
      // If auth API fails, check if it's a JWT error
      const isBadJwt = authError.response?.data?.error_code === 'bad_jwt';
      const is403 = authError.response?.status === 403;
      
      // Only clear session if we're certain it's a bad JWT error
      // A 403 alone might be from permissions, not necessarily an invalid token
      if (isBadJwt) {
        console.log('Invalid JWT token detected (bad_jwt), clearing stored session');
        await this.clearStoredSession();
        delete authApi.defaults.headers.common['Authorization'];
        delete supabaseApi.defaults.headers.common['Authorization'];
        return { user: null, error: 'Invalid session token' };
      }
      
      // For 403 errors that aren't bad_jwt, try to get user from profile directly
      // The token might still be valid for profile access even if auth API fails
      if (is403 && !isBadJwt) {
        console.log('Auth API returned 403 (not bad_jwt), trying profile lookup...');
        // Don't clear session - token might still be valid for other operations
        // Return error but don't invalidate the session
        return { user: null, error: 'Unable to verify session. Please try logging in again.' };
      }
      
      // For other errors, log but don't clear session
      console.log('Auth API error (non-JWT):', authError.response?.data || authError.message);
      return { user: null, error: authError.response?.data?.message || 'Failed to get user' };
    }
    
    return { user: null, error: 'No user found' };
    
  } catch (error: any) {
    console.error('Get current user error:', error.response?.data || error.message);
    
    // Clear the session on authentication errors (401, 403 with bad_jwt)
    if (error.response?.status === 401 || 
        (error.response?.status === 403 && error.response?.data?.error_code === 'bad_jwt')) {
      console.log('Invalid or expired session, clearing stored session');
      await this.clearStoredSession();
      delete authApi.defaults.headers.common['Authorization'];
      delete supabaseApi.defaults.headers.common['Authorization'];
    }
    
    return { user: null, error: 'Failed to get user' };
  }
},

  // Store session token
    async storeSession(accessToken: string): Promise<void> {
      try {
        await AsyncStorage.setItem('supabase_session', accessToken);
      } catch (error) {
        console.error('Error storing session:', error);
      }
    },

    // Get stored session token
    async getStoredSession(): Promise<string | null> {
      try {
        return await AsyncStorage.getItem('supabase_session');
      } catch (error) {
        console.error('Error getting stored session:', error);
        return null;
      }
    },

    // Clear stored session token
    async clearStoredSession(): Promise<void> {
      try {
        await AsyncStorage.removeItem('supabase_session');
      } catch (error) {
        console.error('Error clearing stored session:', error);
      }
    },

    // Reset password
    async resetPassword(email: string): Promise<{ error: string | null }> {
      try {
        console.log('Attempting to reset password for email:', email);
        
        // Supabase password reset endpoint
        // The redirectTo URL is optional but recommended for better UX
        const response = await authApi.post('/recover', {
          email: email,
          // Optional: Add redirect URL if you have a password reset page
          // redirectTo: 'your-app://reset-password'
        });
        
        console.log('Password reset email sent successfully');
        return { error: null };
      } catch (error: any) {
        console.error('Reset password error:', error);
        console.error('Error response:', error.response?.data);
        console.error('Error status:', error.response?.status);
        
        // Handle specific Supabase errors
        if (error.response?.data?.error_description) {
          const errorDesc = error.response.data.error_description.toLowerCase();
          
          // Check for common error messages
          if (errorDesc.includes('user not found') || errorDesc.includes('email not found')) {
            return { error: 'No account found with this email address.' };
          }
          
          if (errorDesc.includes('rate limit') || errorDesc.includes('too many requests')) {
            return { error: 'Too many reset requests. Please wait a few minutes and try again.' };
          }
          
          return { error: error.response.data.error_description };
        }
        
        // Handle HTTP status codes
        if (error.response?.status === 404) {
          return { error: 'Password reset endpoint not found. Please contact support.' };
        }
        
        if (error.response?.status === 429) {
          return { error: 'Too many reset requests. Please wait a few minutes and try again.' };
        }
        
        if (error.response?.status === 400) {
          // Provide more specific error message based on response data
          const errorData = error.response?.data;
          if (errorData?.error_description) {
            const errorDesc = errorData.error_description.toLowerCase();
            if (errorDesc.includes('email')) {
              return { error: 'Invalid email address format. Please check and try again.' };
            }
            if (errorDesc.includes('rate limit') || errorDesc.includes('too many')) {
              return { error: 'Too many reset requests. Please wait a few minutes and try again.' };
            }
            return { error: errorData.error_description };
          }
          if (errorData?.message) {
            return { error: errorData.message };
          }
          return { error: 'Invalid request. Please check your email address and try again.' };
        }
        
        // Generic error message
        const errorMessage = error.response?.data?.message || error.message || 'Failed to send reset email. Please try again.';
        return { error: errorMessage };
      }
    },

    // Verify admin code
    async verifyAdminCode(code: string): Promise<{ admin: any | null; error: string | null }> {
      try {
        console.log('=== ADMIN VERIFICATION START ===');
        console.log('Verifying admin code:', code);
        
        const response = await supabaseApi.get(`/admins?code=eq.${code}&is_active=eq.true`);
        
        console.log('API Response:', {
          hasData: !!response.data,
          dataLength: response.data?.length,
          data: response.data
        });
        
        if (response.data && response.data.length > 0) {
          const admin = response.data[0];
          console.log('Admin found:', admin);
          return { admin, error: null };
        } else {
          console.log('No admin found with code:', code);
          return { admin: null, error: 'Invalid admin code' };
        }
      } catch (error: any) {
        console.error('=== ADMIN VERIFICATION ERROR ===');
        console.error('Error details:', error.response?.data || error.message);
        console.error('Error status:', error.response?.status);
        return { admin: null, error: 'Failed to verify admin code' };
      }
    },

    // Verify trainer code
    async verifyTrainerCode(code: string): Promise<{ trainer: any | null; error: string | null }> {
      try {
        console.log('=== TRAINER VERIFICATION START ===');
        console.log('Verifying trainer code:', code);
        
        const response = await supabaseApi.get(`/profiles?access_code=eq.${code}&role=eq.trainer`);
        
        console.log('API Response:', {
          hasData: !!response.data,
          dataLength: response.data?.length,
          data: response.data
        });
        
        if (response.data && response.data.length > 0) {
          const trainer = response.data[0];
          console.log('Trainer found:', trainer);
          return { trainer, error: null };
        } else {
          console.log('No trainer found with code:', code);
          return { trainer: null, error: 'Invalid trainer code' };
        }
      } catch (error: any) {
        console.error('=== TRAINER VERIFICATION ERROR ===');
        console.error('Error details:', error.response?.data || error.message);
        console.error('Error status:', error.response?.status);
        return { trainer: null, error: 'Failed to verify trainer code' };
      }
    },

    // Change password (for first-time login)
    // Note: Supabase's /auth/v1/user endpoint may have restrictions on password changes
    // If this fails, users can use the "Forgot Password" feature to reset their password
    async changePassword(newPassword: string): Promise<{ error: string | null }> {
      try {
        console.log('Attempting to change password...');
        
        // First, verify we have a valid token by checking stored session
        // Get the most recent token (might have been refreshed by signIn)
        let storedToken = await this.getStoredSession();
        if (!storedToken) {
          console.log('No stored session token found, cannot change password');
          return { error: 'Not authenticated. Please log in again.' };
        }
        
        // Ensure the token is set in headers
        authApi.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
        supabaseApi.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
        
        console.log('Token retrieved and set in headers for password change');
        
        // Re-fetch the token right before using it to ensure we have the latest
        // This handles cases where signIn just updated the token
        const latestToken = await this.getStoredSession();
        if (latestToken && latestToken !== storedToken) {
          console.log('Found newer token, updating headers');
          storedToken = latestToken;
          authApi.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
          supabaseApi.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
        }
        
        // Skip token validation - just use the stored token directly
        // Token validation can fail even with valid tokens in some Supabase configurations
        // The password change endpoint will validate the token itself
        console.log('Using stored token for password change (skipping validation)');
        
        console.log('Making password change request...');
        
        // Supabase password update endpoint
        // Note: Some Supabase configurations may restrict direct password changes
        // If this returns 403, the user will need to use "Forgot Password" instead
        try {
          const response = await authApi.put('/user', {
            password: newPassword
          });
          
          console.log('Password changed successfully');
          return { error: null };
        } catch (putError: any) {
          // If PUT fails, try alternative approach using PATCH
          if (putError.response?.status === 403 || putError.response?.status === 405) {
            console.log('PUT method not allowed, trying alternative approach...');
            // Some Supabase instances require PATCH instead of PUT
            const patchResponse = await authApi.patch('/user', {
              password: newPassword
            });
            console.log('Password changed successfully via PATCH');
            return { error: null };
          }
          throw putError; // Re-throw if it's a different error
        }
      } catch (error: any) {
        console.error('Error changing password:', error);
        console.error('Error response:', error.response?.data);
        console.error('Error status:', error.response?.status);
        
        // Handle bad_jwt errors specifically
        if (error.response?.data?.error_code === 'bad_jwt' || 
            (error.response?.status === 403 && error.response?.data?.msg?.includes('sub claim'))) {
          console.log('Bad JWT error detected, clearing session');
          await this.clearStoredSession();
          delete authApi.defaults.headers.common['Authorization'];
          delete supabaseApi.defaults.headers.common['Authorization'];
          return { 
            error: 'Your session has expired. Please log in again and try changing your password.' 
          };
        }
        
        if (error.response?.status === 403) {
          // 403 Forbidden - Supabase may restrict password changes via this endpoint
          // This is common in some Supabase configurations
          console.log('403 error - password change restricted. User can use "Forgot Password" instead.');
          return { 
            error: 'Password change via this method is not available. Please use the "Forgot Password" feature on the login screen to set your password.' 
          };
        }
        
        if (error.response?.status === 401) {
          return { error: 'Session expired. Please log in again.' };
        }
        
        if (error.response?.data?.message) {
          return { error: error.response.data.message };
        }
        
        if (error.response?.data?.error_description) {
          return { error: error.response.data.error_description };
        }
        
        return { error: 'Failed to change password. Please use the "Forgot Password" feature to reset your password.' };
      }
    },

    // Update user profile (for first-time login)
    async updateUserProfile(userId: string, profileData: {
      phone?: string;
      date_of_birth?: string;
      gender?: string;
      height_cm?: number;
      weight_kg?: number;
      emergency_contact?: string;
      emergency_contact_phone?: string;
    }): Promise<{ user: any | null; error: string | null }> {
      try {
        const response = await supabaseApi.patch(`/profiles?id=eq.${userId}`, profileData);
        return { user: response.data[0], error: null };
    } catch (error: any) {
      console.error('Error updating user profile:', error.response?.data || error.message);
      
      // Handle 400 Bad Request errors gracefully
      if (error.response?.status === 400) {
        const errorData = error.response?.data;
        if (errorData?.message) {
          return { user: null, error: errorData.message };
        }
        if (errorData?.error_description) {
          return { user: null, error: errorData.error_description };
        }
        return { user: null, error: 'Invalid profile data. Please check your input and try again.' };
      }
      
      return { user: null, error: error.response?.data?.message || 'Failed to update profile' };
    }
    },

    // Check if user has temporary password (for first-time login)
    async checkTempPassword(): Promise<{ hasTempPassword: boolean; error: string | null }> {
      try {
        // Don't make API calls that could interfere with the session
        // Just assume they have a temp password if they're on the onboarding screen
        console.log('Assuming user has temp password for onboarding');
        return { hasTempPassword: true, error: null };
      } catch (error: any) {
        console.error('Error checking temp password:', error);
        // Always assume temp password for onboarding
        return { hasTempPassword: true, error: null };
      }
    },
  }



// Test function to check Supabase connection
export const testSupabaseConnection = async (): Promise<{ success: boolean; error: string | null }> => {
  try {
    console.log('Testing Supabase connection...');
    const response = await authApi.get('/settings');
    console.log('Supabase connection test successful:', response.status);
    return { success: true, error: null };
  } catch (error: any) {
    console.error('Supabase connection test failed:', error.response?.data || error.message);
    return { success: false, error: error.response?.data?.message || error.message };
  }
};

// User Services
export const userService = {
  // Get user profile
  async getProfile(userId: string): Promise<{ user: User | null; error: string | null }> {
    try {
      const response = await supabaseApi.get(`/profiles?id=eq.${userId}`);
      const user = response.data[0];
      return { user, error: null };
    } catch (error: any) {
      return { user: null, error: error.response?.data?.message || 'Failed to get profile' };
    }
  },

  // Get all users (admin only)
  async getAllUsers(): Promise<{ users: User[] | null; error: string | null }> {
    try {
      const response = await supabaseApi.get('/profiles?order=created_at.desc');
      return { users: response.data, error: null };
    } catch (error: any) {
      console.error('Error fetching users:', error.response?.data || error.message);
      return { users: null, error: 'Failed to fetch users' };
    }
  },

  // Lightweight count check - only fetches ids to compare with cache
  async getUserCount(): Promise<{ count: number; error: string | null }> {
    try {
      const response = await supabaseApi.get('/profiles?select=id');
      return { count: response.data?.length ?? 0, error: null };
    } catch (error: any) {
      console.error('Error fetching user count:', error.response?.data || error.message);
      return { count: 0, error: 'Failed to fetch user count' };
    }
  },

  // Create new user (admin function) - UPDATED VERSION
  async createUser(userData: {
    email: string;
    first_name: string;
    role: 'member' | 'trainer' | 'admin';
  }): Promise<{ user: any | null; profile?: User; access_code?: string; error: string | null }> {
    try {
      console.log('=== CREATE USER START (AUTH ONLY) ===');
      console.log('User data:', userData);

      if (userData.role === 'member') {
        // For members: generate 7-digit access code
        const accessCode = Math.floor(1000000 + Math.random() * 9000000).toString();
        console.log('Generated 7-digit access code for member:', accessCode);
        
        // Create auth user with access code as password
        const authPayload = {
          email: userData.email,
          password: accessCode,
          options: {
            data: {
              first_name: userData.first_name,
              role: 'member',
              access_code: accessCode,
              is_access_code: true
            }
          }
        };
        
        console.log('Sending auth request with metadata:', {
          url: '/signup',
          payload: authPayload,
          headers: authApi.defaults.headers
        });
        
        const authResponse = await authApi.post('/signup', authPayload);

        console.log('Auth user created successfully:', {
          hasUser: !!authResponse.data.user,
          userId: authResponse.data.user?.id,
          email: authResponse.data.user?.email
        });

        if (!authResponse.data.user) {
          return { user: null, error: 'Failed to create auth user' };
        }

        // Manually create the profile
        const profileData = {
          id: authResponse.data.user.id,
          email: userData.email,
          first_name: userData.first_name,
          last_name: '', // Keep blank as requested
          role: 'member',
          access_code: accessCode,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        console.log('Creating profile manually:', profileData);
        let createdProfile: User | undefined;
        try {
          const profileResponse = await supabaseApi.post('/profiles', profileData);
          console.log('Profile created successfully:', profileResponse.data);
          createdProfile = profileResponse.data?.[0] || { ...profileData, role: 'member' } as User;
        } catch (profileError: any) {
          console.error('Failed to create profile:', {
            error: profileError.response?.data || profileError.message,
            status: profileError.response?.status
          });
          return { user: null, error: 'Failed to create user profile' };
        }

        // Send welcome email (non-blocking - won't fail user creation if email fails)
        sendWelcomeEmail(userData.email, userData.first_name, 'member', accessCode).catch(
          (err) => console.error('Email sending failed (non-blocking):', err)
        );

        return { 
          user: authResponse.data.user, 
          profile: createdProfile,
          access_code: accessCode,
          error: null 
        };

      } else if (userData.role === 'trainer') {
        // For trainers: generate 6-digit access code
        const accessCode = Math.floor(100000 + Math.random() * 900000).toString();
        console.log('Generated 6-digit access code for trainer:', accessCode);
        
        // Create auth user with access code as password
        const authPayload = {
          email: userData.email,
          password: accessCode,
          options: {
            data: {
              first_name: userData.first_name,
              role: 'trainer',
              access_code: accessCode
            },
          },
        };
        
        console.log('Sending auth request with metadata:', {
          url: '/signup',
          payload: authPayload,
          headers: authApi.defaults.headers
        });
        
        const authResponse = await authApi.post('/signup', authPayload);

        console.log('Auth user created for trainer successfully:', {
          hasUser: !!authResponse.data.user,
          userId: authResponse.data.user?.id,
          email: authResponse.data.user?.email
        });

        if (!authResponse.data.user) {
          return { user: null, error: 'Failed to create auth user' };
        }

        // Manually create the profile
        const profileData = {
          id: authResponse.data.user.id,
          email: userData.email,
          first_name: userData.first_name,
          last_name: '', // Keep blank as requested
          role: 'trainer',
          access_code: accessCode,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        console.log('Creating trainer profile manually:', profileData);
        let createdProfile: User | undefined;
        try {
          const profileResponse = await supabaseApi.post('/profiles', profileData);
          console.log('Trainer profile created successfully:', profileResponse.data);
          createdProfile = profileResponse.data?.[0] || { ...profileData, role: 'trainer' } as User;
        } catch (profileError: any) {
          console.error('Failed to create trainer profile:', {
            error: profileError.response?.data || profileError.message,
            status: profileError.response?.status
          });
          return { user: null, error: 'Failed to create trainer profile' };
        }

        // Send welcome email (non-blocking - won't fail user creation if email fails)
        sendWelcomeEmail(userData.email, userData.first_name, 'trainer', accessCode).catch(
          (err) => console.error('Email sending failed (non-blocking):', err)
        );

        return { 
          user: authResponse.data.user, 
          profile: createdProfile,
          access_code: accessCode,
          error: null 
        };

      } else if (userData.role === 'admin') {
        // For admins: generate 6-digit access code
        const accessCode = Math.floor(100000 + Math.random() * 900000).toString();
        console.log('Generated 6-digit access code for admin:', accessCode);
        
        // Create auth user with access code as password
        const authPayload = {
          email: userData.email,
          password: accessCode,
          options: {
            data: {
              first_name: userData.first_name,
              role: 'admin',
              access_code: accessCode
            },
          },
        };
        
        console.log('Sending auth request with metadata:', {
          url: '/signup',
          payload: authPayload,
          headers: authApi.defaults.headers
        });
        
        const authResponse = await authApi.post('/signup', authPayload);

        console.log('Auth user created for admin successfully:', {
          hasUser: !!authResponse.data.user,
          userId: authResponse.data.user?.id,
          email: authResponse.data.user?.email
        });

        if (!authResponse.data.user) {
          return { user: null, error: 'Failed to create auth user' };
        }

        // Manually create the profile
        const profileData = {
          id: authResponse.data.user.id,
          email: userData.email,
          first_name: userData.first_name,
          last_name: '', // Keep blank as requested
          role: 'admin',
          access_code: accessCode,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        console.log('Creating admin profile manually:', profileData);
        let createdProfile: User | undefined;
        try {
          const profileResponse = await supabaseApi.post('/profiles', profileData);
          console.log('Admin profile created successfully:', profileResponse.data);
          createdProfile = profileResponse.data?.[0] || { ...profileData, role: 'admin' } as User;
        } catch (profileError: any) {
          console.error('Failed to create admin profile:', {
            error: profileError.response?.data || profileError.message,
            status: profileError.response?.status
          });
          return { user: null, error: 'Failed to create admin profile' };
        }

        // Send welcome email (non-blocking - won't fail user creation if email fails)
        sendWelcomeEmail(userData.email, userData.first_name, 'admin', accessCode).catch(
          (err) => console.error('Email sending failed (non-blocking):', err)
        );

        return { 
          user: authResponse.data.user, 
          profile: createdProfile,
          access_code: accessCode,
          error: null 
        };
      }

      return { user: null, error: 'Invalid role specified' };
    } catch (error: any) {
      console.error('=== CREATE USER ERROR ===');
      console.error('Error details:', error.response?.data || error.message);
      console.error('Error status:', error.response?.status);
      console.error('Full error:', error);
      
      // Handle specific Supabase errors
      if (error.response?.data?.error_description) {
        if (error.response.data.error_description.includes('already registered')) {
          return { user: null, error: 'An account with this email already exists' };
        }
        return { user: null, error: error.response.data.error_description };
      }
      
      // Handle database constraint errors
      if (error.response?.data?.message) {
        if (error.response.data.message.includes('duplicate key')) {
          return { user: null, error: 'An account with this email already exists' };
        }
        return { user: null, error: error.response.data.message };
      }
      
      return { user: null, error: 'Failed to create user. Please try again.' };
    }
  },

  // Update user profile
  async updateProfile(userId: string, data: ProfileForm): Promise<{ user: User | null; error: string | null }> {
    try {
      const response = await supabaseApi.patch(`/profiles?id=eq.${userId}`, data);
      const user = response.data[0];
      return { user, error: null };
    } catch (error: any) {
      // Handle 400 Bad Request errors gracefully
      if (error.response?.status === 400) {
        const errorData = error.response?.data;
        if (errorData?.message) {
          return { user: null, error: errorData.message };
        }
        if (errorData?.error_description) {
          return { user: null, error: errorData.error_description };
        }
        return { user: null, error: 'Invalid profile data. Please check your input and try again.' };
      }
      
      return { user: null, error: error.response?.data?.message || 'Failed to update profile' };
    }
  },

  // Update user (admin function)
  async updateUser(userId: string, data: {
    first_name?: string;
    last_name?: string;
    email?: string;
    phone?: string;
    role?: 'member' | 'trainer' | 'admin';
    trainer_code?: string;
    height_cm?: number;
    weight_kg?: number;
    fitness_goals?: string[];
    date_of_birth?: string;
    gender?: string;
  }): Promise<{ user: User | null; error: string | null }> {
    try {
      const response = await supabaseApi.patch(`/profiles?id=eq.${userId}`, data);
      const user = response.data[0];
      return { user, error: null };
    } catch (error: any) {
      // Handle 400 Bad Request errors gracefully
      if (error.response?.status === 400) {
        const errorData = error.response?.data;
        if (errorData?.message) {
          return { user: null, error: errorData.message };
        }
        if (errorData?.error_description) {
          return { user: null, error: errorData.error_description };
        }
        return { user: null, error: 'Invalid user data. Please check your input and try again.' };
      }
      
      return { user: null, error: error.response?.data?.message || 'Failed to update user' };
    }
  },

  // Delete user (admin function)
  async deleteUser(userId: string): Promise<{ error: string | null }> {
    try {
      // First delete the profile
      await supabaseApi.delete(`/profiles?id=eq.${userId}`);
      
      // Note: We cannot delete the auth user through the API
      // The auth user will remain in Supabase auth but without a profile
      // This is a limitation of Supabase - auth users can only be deleted through the dashboard
      
      return { error: null };
    } catch (error: any) {
      console.error('Error deleting user:', error.response?.data || error.message);
      return { error: error.response?.data?.message || 'Failed to delete user' };
    }
  },
};

// Class Services
export const classService = {
  // Get all classes
  async getClasses(): Promise<{ classes: any[] | null; error: string | null }> {
    try {
      const response = await supabaseApi.get('/classes');
      return { classes: response.data, error: null };
    } catch (error: any) {
      console.error('Error fetching classes:', error.response?.data || error.message);
      return { classes: null, error: 'Failed to fetch classes' };
    }
  },

  // Get all classes (alias for compatibility)
  async getAllClasses(): Promise<{ classes: any[] | null; error: string | null }> {
    return this.getClasses();
  },

  // Create class template
  async createClassTemplate(classData: {
    name: string;
    description: string;
    duration: number;
    max_members: number;
  }): Promise<{ class: any | null; error: string | null }> {
    try {
      console.log('Creating class template:', classData);
      const response = await supabaseApi.post('/classes', classData);
      console.log('Class template created successfully:', response.data);
      return { class: response.data[0], error: null };
    } catch (error: any) {
      console.error('Error creating class template:', error.response?.data || error.message);
      
      // Handle 400 Bad Request errors gracefully
      if (error.response?.status === 400) {
        const errorData = error.response?.data;
        if (errorData?.message) {
          return { class: null, error: errorData.message };
        }
        if (errorData?.error_description) {
          return { class: null, error: errorData.error_description };
        }
        return { class: null, error: 'Invalid class data. Please check your input and try again.' };
      }
      
      return { class: null, error: error.response?.data?.message || 'Failed to create class template' };
    }
  },

  // Get trainer's classes
  async getTrainerClasses(trainerId: string, endDate: string): Promise<{ classes: any[] | null; error: string | null }> {
    try {
      const response = await supabaseApi.get(
        `/class_schedules?trainer_id=eq.${trainerId}&scheduled_date=lte.${endDate}&status=eq.active&select=*,classes(name,description,duration)&order=scheduled_date.asc,scheduled_time.asc`
      );
      
      // Transform the response to flatten the class data and map field names
      const transformedClasses = response.data?.map((schedule: any) => ({
        ...schedule,
        class_name: schedule.classes?.name,
        class_description: schedule.classes?.description,
        difficulty_level: schedule.difficulty_level, // Get from class_schedules table
        duration_minutes: schedule.classes?.duration, // Get from classes table
        // Map database fields to expected interface fields
        start_time: schedule.scheduled_time, // Map scheduled_time to start_time
        end_time: schedule.scheduled_time, // For now, use same time (could calculate end time based on duration)
        max_capacity: schedule.max_bookings, // Map max_bookings to max_capacity
        current_enrollment: schedule.current_bookings, // Map current_bookings to current_enrollment
      })) || [];
      
      return { classes: transformedClasses, error: null };
    } catch (error: any) {
      console.error('Error fetching trainer classes:', error.response?.data || error.message);
      return { classes: null, error: 'Failed to fetch trainer classes' };
    }
  },

  // Get all trainers (for admin scheduling)
  async getTrainers(): Promise<{ trainers: any[] | null; error: string | null }> {
    try {
      const response = await supabaseApi.get('/profiles?role=eq.trainer&order=first_name.asc');
      // Transform the data to match the expected format
      const trainers = response.data.map((trainer: any) => ({
        id: trainer.id,
        first_name: trainer.first_name,
        last_name: trainer.last_name,
        email: trainer.email,
        code: trainer.access_code,
      }));
      return { trainers, error: null };
    } catch (error: any) {
      console.error('Error fetching trainers:', error.response?.data || error.message);
      return { trainers: null, error: 'Failed to fetch trainers' };
    }
  },

  // Create class schedule
  async createClassSchedule(scheduleData: {
    class_id: string;
    trainer_id: string;
    scheduled_date: string;
    start_time: string;
    end_time: string;
    max_capacity: number;
  }): Promise<{ schedule: any | null; error: string | null }> {
    try {
      const response = await supabaseApi.post('/class_schedules', {
        class_id: scheduleData.class_id,
        trainer_id: scheduleData.trainer_id,
        scheduled_date: scheduleData.scheduled_date,
        scheduled_time: scheduleData.start_time, // Map start_time to scheduled_time
        max_bookings: scheduleData.max_capacity, // Map max_capacity to max_bookings
        current_bookings: 0, // Use correct field name
        status: 'active', // Use correct field name
        difficulty_level: 'beginner', // Default value, should be provided by caller
        location: 'gym', // Default value
      });
      const schedule = response.data[0];
      return { schedule, error: null };
    } catch (error: any) {
      console.error('Error creating class schedule:', error.response?.data || error.message);
      return { schedule: null, error: error.response?.data?.message || 'Failed to create class schedule' };
    }
  },

  // Get class schedules for a specific date
  async getClassSchedules(date: string): Promise<{ schedules: any[] | null; error: string | null }> {
    try {
      const response = await supabaseApi.get(`/class_schedules?scheduled_date=eq.${date}&status=eq.active&select=*,classes(name),profiles!trainer_id(first_name,last_name)`);
      const schedules = response.data.map((schedule: any) => ({
        ...schedule,
        class_name: schedule.classes?.name || 'Unknown Class',
        trainer_name: schedule.profiles ? `${schedule.profiles.first_name} ${schedule.profiles.last_name}` : 'Unknown Trainer',
      }));
      return { schedules, error: null };
    } catch (error: any) {
      console.error('Error fetching class schedules:', error.response?.data || error.message);
      return { schedules: null, error: 'Failed to fetch class schedules' };
    }
  },

  // Get upcoming class schedules (for dashboard)
  async getUpcomingClassSchedules(): Promise<{ schedules: any[] | null; error: string | null }> {
    try {
      const today = new Date().toISOString().split('T')[0];
      const queryUrl = `/class_schedules?scheduled_date=gte.${today}&status=eq.active&select=*,classes(name,description,duration),profiles!trainer_id(first_name,last_name)&order=scheduled_date.asc,scheduled_time.asc`;
      
      console.log('API: Fetching upcoming class schedules...');
      console.log('API: Query URL:', queryUrl);
      console.log('API: Today date:', today);
      console.log('API: Authorization header:', supabaseApi.defaults.headers.common['Authorization'] ? 'Present' : 'Missing');
      
      const response = await supabaseApi.get(queryUrl);
      
      console.log('API: Response received:', {
        hasData: !!response.data,
        dataType: Array.isArray(response.data) ? 'array' : typeof response.data,
        dataLength: Array.isArray(response.data) ? response.data.length : 'N/A',
        firstItem: response.data?.[0] || 'No items'
      });
      
      if (!response.data || !Array.isArray(response.data)) {
        console.warn('API: Response data is not an array:', response.data);
        return { schedules: [], error: null };
      }
      
      if (response.data.length === 0) {
        console.log('API: No class schedules found for date >=', today);
        return { schedules: [], error: null };
      }
      
      // Filter out classes that are 15 minutes past their start time
      const now = new Date();
      const filteredSchedules = response.data.filter((schedule: any) => {
        // Combine scheduled_date and scheduled_time
        const scheduledDateTime = new Date(`${schedule.scheduled_date}T${schedule.scheduled_time}`);
        
        // Calculate cutoff time: scheduled start + 15 minutes
        const cutoffTime = new Date(scheduledDateTime);
        cutoffTime.setMinutes(cutoffTime.getMinutes() + 15);
        
        // Only include if current time is before the cutoff (15 minutes after class start)
        return now < cutoffTime;
      });
      
      console.log(`API: Filtered schedules (removed ${response.data.length - filteredSchedules.length} past classes)`);
      
      const schedules = filteredSchedules.map((schedule: any) => {
        // Handle trainer name - profiles might be an object or array
        let trainerName = 'Mark'; // Default to Mark since he's the only trainer
        if (schedule.profiles) {
          if (Array.isArray(schedule.profiles)) {
            const trainer = schedule.profiles[0];
            trainerName = `${trainer?.first_name || ''} ${trainer?.last_name || ''}`.trim() || 'Mark';
          } else {
            trainerName = `${schedule.profiles.first_name || ''} ${schedule.profiles.last_name || ''}`.trim() || 'Mark';
          }
        }
        
        return {
          ...schedule,
          id: schedule.id,
          class_id: schedule.class_id,
          trainer_id: schedule.trainer_id,
          scheduled_date: schedule.scheduled_date,
          scheduled_time: schedule.scheduled_time,
          difficulty_level: schedule.difficulty_level,
          location: schedule.location,
          current_bookings: schedule.current_bookings || 0,
          max_bookings: schedule.max_bookings,
          status: schedule.status,
          class_name: schedule.classes?.name || 'Unknown Class',
          class_description: schedule.classes?.description || '',
          duration: schedule.classes?.duration || schedule.duration || 45,
          trainer_name: trainerName,
        };
      });
      
      console.log('API: Fetched upcoming class schedules:', schedules.length);
      return { schedules, error: null };
    } catch (error: any) {
      console.error('API: Error fetching upcoming class schedules:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        statusText: error.response?.statusText,
        headers: error.response?.headers
      });
      return { schedules: null, error: error.response?.data?.message || error.message || 'Failed to fetch upcoming class schedules' };
    }
  },

  // Book a class
  async bookClass(classScheduleId: string, memberId: string): Promise<{ booking: any | null; error: string | null }> {
    try {
      // First check if class is full
      const scheduleResponse = await supabaseApi.get(`/class_schedules?id=eq.${classScheduleId}&select=id,scheduled_date,current_bookings,max_bookings`);
      const schedule = scheduleResponse.data[0];
      
      if (!schedule) {
        return { booking: null, error: 'Class not found' };
      }
      
      if (schedule.current_bookings >= schedule.max_bookings) {
        return { booking: null, error: 'Class is full' };
      }

      // Check if user already has a booking (confirmed or waitlist) for this class
      const existingBooking = await supabaseApi.get(
        `/class_bookings?class_schedule_id=eq.${classScheduleId}&member_id=eq.${memberId}`
      );
      
      if (existingBooking.data && existingBooking.data.length > 0) {
        const existing = existingBooking.data[0];
        if (existing.status === 'confirmed') {
          return { booking: null, error: 'You are already booked for this class. Please check "My Classes" tab.' };
        } else if (existing.status === 'waitlist') {
          return { booking: null, error: 'You are already on the waitlist for this class' };
        } else if (existing.status === 'cancelled') {
          // If there's a cancelled booking, update it to confirmed instead of creating a new one
          // But first check booking limits
          const classDate = schedule.scheduled_date;
          
          // Check daily booking limit (max 2 classes per day)
          const dayBookingsResponse = await supabaseApi.get(
            `/class_bookings?member_id=eq.${memberId}&status=eq.confirmed&select=class_schedules!inner(scheduled_date)&class_schedules.scheduled_date=eq.${classDate}`
          );
          const dayBookingsCount = dayBookingsResponse.data?.length || 0;
          if (dayBookingsCount >= 2) {
            return { booking: null, error: 'You have reached the daily limit of 2 classes. Please cancel an existing booking or choose a different day.' };
          }

          // Check weekly booking limit (max 9 classes per week)
          const classDateObj = new Date(classDate);
          const startOfWeek = new Date(classDateObj);
          startOfWeek.setDate(classDateObj.getDate() - classDateObj.getDay()); // Sunday = 0
          const endOfWeek = new Date(startOfWeek);
          endOfWeek.setDate(startOfWeek.getDate() + 6); // Saturday
          
          const weekStartStr = startOfWeek.toISOString().split('T')[0];
          const weekEndStr = endOfWeek.toISOString().split('T')[0];
          
          const weekBookingsResponse = await supabaseApi.get(
            `/class_bookings?member_id=eq.${memberId}&status=eq.confirmed&select=class_schedules!inner(scheduled_date)&class_schedules.scheduled_date=gte.${weekStartStr}&class_schedules.scheduled_date=lte.${weekEndStr}`
          );
          const weekBookingsCount = weekBookingsResponse.data?.length || 0;
          if (weekBookingsCount >= 9) {
            return { booking: null, error: 'You have reached the weekly limit of 9 classes. Please cancel an existing booking or wait until next week.' };
          }

          // If limits are OK, update cancelled booking to confirmed
          const updateResponse = await supabaseApi.patch(`/class_bookings?id=eq.${existing.id}`, {
            status: 'confirmed',
            booked_at: new Date().toISOString(),
          });
          
          // Update current_bookings count
          await supabaseApi.patch(`/class_schedules?id=eq.${classScheduleId}`, {
            current_bookings: schedule.current_bookings + 1,
          });
          
          return { booking: updateResponse.data[0], error: null };
        }
      }

      // Check daily booking limit (max 2 classes per day)
      const classDate = schedule.scheduled_date;
      const dayBookingsResponse = await supabaseApi.get(
        `/class_bookings?member_id=eq.${memberId}&status=eq.confirmed&select=class_schedules!inner(scheduled_date)&class_schedules.scheduled_date=eq.${classDate}`
      );
      
      const dayBookingsCount = dayBookingsResponse.data?.length || 0;
      if (dayBookingsCount >= 2) {
        return { booking: null, error: 'You have reached the daily limit of 2 classes. Please cancel an existing booking or choose a different day.' };
      }

      // Check weekly booking limit (max 9 classes per week)
      const classDateObj = new Date(classDate);
      const startOfWeek = new Date(classDateObj);
      startOfWeek.setDate(classDateObj.getDate() - classDateObj.getDay()); // Sunday = 0
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6); // Saturday
      
      const weekStartStr = startOfWeek.toISOString().split('T')[0];
      const weekEndStr = endOfWeek.toISOString().split('T')[0];
      
      const weekBookingsResponse = await supabaseApi.get(
        `/class_bookings?member_id=eq.${memberId}&status=eq.confirmed&select=class_schedules!inner(scheduled_date)&class_schedules.scheduled_date=gte.${weekStartStr}&class_schedules.scheduled_date=lte.${weekEndStr}`
      );
      
      const weekBookingsCount = weekBookingsResponse.data?.length || 0;
      if (weekBookingsCount >= 9) {
        return { booking: null, error: 'You have reached the weekly limit of 9 classes. Please cancel an existing booking or wait until next week.' };
      }

      // Create new booking
      const bookingResponse = await supabaseApi.post('/class_bookings', {
        class_schedule_id: classScheduleId,
        member_id: memberId,
        status: 'confirmed',
      });

      // Update current_bookings count
      await supabaseApi.patch(`/class_schedules?id=eq.${classScheduleId}`, {
        current_bookings: schedule.current_bookings + 1,
      });

      return { booking: bookingResponse.data[0], error: null };
    } catch (error: any) {
      console.error('Error booking class:', error.response?.data || error.message);
      
      // Handle duplicate key error (user already booked)
      if (error.response?.data?.code === '23505' || 
          (error.response?.data?.message && error.response.data.message.includes('duplicate key'))) {
        return { booking: null, error: 'You are already booked for this class. Please check "My Classes" tab.' };
      }
      
      // Handle 400 Bad Request errors gracefully
      if (error.response?.status === 400) {
        const errorData = error.response?.data;
        if (errorData?.message) {
          return { booking: null, error: errorData.message };
        }
        if (errorData?.error_description) {
          return { booking: null, error: errorData.error_description };
        }
        return { booking: null, error: 'Invalid booking request. Please check your input and try again.' };
      }
      
      return { booking: null, error: error.response?.data?.message || 'Failed to book class' };
    }
  },

  // Join waitlist for a full class
  async joinWaitlist(classScheduleId: string, memberId: string): Promise<{ booking: any | null; error: string | null }> {
    try {
      // Check if class exists
      const scheduleResponse = await supabaseApi.get(`/class_schedules?id=eq.${classScheduleId}&select=id,max_bookings`);
      const schedule = scheduleResponse.data[0];
      
      if (!schedule) {
        return { booking: null, error: 'Class schedule not found' };
      }

      // Check if user already has a booking (confirmed or waitlist) for this class
      const existingBooking = await supabaseApi.get(
        `/class_bookings?class_schedule_id=eq.${classScheduleId}&member_id=eq.${memberId}`
      );
      
      if (existingBooking.data && existingBooking.data.length > 0) {
        const existing = existingBooking.data[0];
        if (existing.status === 'confirmed') {
          return { booking: null, error: 'You are already booked for this class' };
        } else if (existing.status === 'waitlist') {
          return { booking: null, error: 'You are already on the waitlist for this class' };
        }
      }

      // Get waitlist position (count existing waitlist bookings)
      const waitlistResponse = await supabaseApi.get(
        `/class_bookings?class_schedule_id=eq.${classScheduleId}&status=eq.waitlist&select=id&order=created_at.asc`
      );
      const waitlistPosition = (waitlistResponse.data?.length || 0) + 1;

      // Create waitlist booking
      const bookingResponse = await supabaseApi.post('/class_bookings', {
        class_schedule_id: classScheduleId,
        member_id: memberId,
        status: 'waitlist',
      });

      return { booking: { ...bookingResponse.data[0], waitlist_position: waitlistPosition }, error: null };
    } catch (error: any) {
      console.error('Error joining waitlist:', error.response?.data || error.message);
      return { booking: null, error: error.response?.data?.message || 'Failed to join waitlist' };
    }
  },

  // Leave waitlist
  async leaveWaitlist(classScheduleId: string, memberId: string): Promise<{ success: boolean; error: string | null }> {
    try {
      // Find the waitlist booking
      const bookingResponse = await supabaseApi.get(
        `/class_bookings?class_schedule_id=eq.${classScheduleId}&member_id=eq.${memberId}&status=eq.waitlist`
      );
      
      if (!bookingResponse.data || bookingResponse.data.length === 0) {
        return { success: false, error: 'Waitlist booking not found' };
      }

      // Cancel the waitlist booking
      await supabaseApi.patch(`/class_bookings?id=eq.${bookingResponse.data[0].id}`, {
        status: 'cancelled',
      });

      return { success: true, error: null };
    } catch (error: any) {
      console.error('Error leaving waitlist:', error.response?.data || error.message);
      return { success: false, error: error.response?.data?.message || 'Failed to leave waitlist' };
    }
  },

  // Cancel a class booking
  async cancelBooking(classScheduleId: string, memberId: string): Promise<{ success: boolean; error: string | null }> {
    try {
      // Find the booking
      const bookingResponse = await supabaseApi.get(
        `/class_bookings?class_schedule_id=eq.${classScheduleId}&member_id=eq.${memberId}&status=eq.confirmed`
      );
      
      if (!bookingResponse.data || bookingResponse.data.length === 0) {
        return { success: false, error: 'Booking not found' };
      }

      // Cancel the booking
      await supabaseApi.patch(`/class_bookings?id=eq.${bookingResponse.data[0].id}`, {
        status: 'cancelled',
      });

      // Update current_bookings count
      const scheduleResponse = await supabaseApi.get(`/class_schedules?id=eq.${classScheduleId}&select=current_bookings`);
      const schedule = scheduleResponse.data[0];
      if (schedule && schedule.current_bookings > 0) {
        await supabaseApi.patch(`/class_schedules?id=eq.${classScheduleId}`, {
          current_bookings: schedule.current_bookings - 1,
        });
      }

      return { success: true, error: null };
    } catch (error: any) {
      console.error('Error cancelling booking:', error.response?.data || error.message);
      return { success: false, error: error.response?.data?.message || 'Failed to cancel booking' };
    }
  },

  // Check in for a class
  async checkIn(classScheduleId: string, memberId: string): Promise<{ success: boolean; error: string | null }> {
    try {
      // Verify user has a confirmed booking for this class
      const bookingResponse = await supabaseApi.get(
        `/class_bookings?class_schedule_id=eq.${classScheduleId}&member_id=eq.${memberId}&status=eq.confirmed`
      );
      
      if (!bookingResponse.data || bookingResponse.data.length === 0) {
        return { success: false, error: 'You must have a confirmed booking to check in' };
      }

      // Check if already checked in
      const attendanceResponse = await supabaseApi.get(
        `/class_attendance?class_schedule_id=eq.${classScheduleId}&member_id=eq.${memberId}`
      );

      if (attendanceResponse.data && attendanceResponse.data.length > 0) {
        const existing = attendanceResponse.data[0];
        if (existing.attended) {
          return { success: false, error: 'You have already checked in for this class' };
        }
        // Update existing record
        await supabaseApi.patch(`/class_attendance?id=eq.${existing.id}`, {
          attended: true,
          checked_in_at: new Date().toISOString(),
        });
      } else {
        // Create new attendance record
        await supabaseApi.post('/class_attendance', {
          class_schedule_id: classScheduleId,
          member_id: memberId,
          attended: true,
          checked_in_at: new Date().toISOString(),
        });
      }

      return { success: true, error: null };
    } catch (error: any) {
      console.error('Error checking in:', error.response?.data || error.message);
      return { success: false, error: error.response?.data?.message || 'Failed to check in' };
    }
  },

  // Get check-in status for a class
  async getCheckInStatus(classScheduleId: string, memberId: string): Promise<{ checkedIn: boolean; error: string | null }> {
    try {
      const response = await supabaseApi.get(
        `/class_attendance?class_schedule_id=eq.${classScheduleId}&member_id=eq.${memberId}&attended=eq.true`
      );
      
      return { checkedIn: response.data && response.data.length > 0, error: null };
    } catch (error: any) {
      // If table doesn't exist, return false (not checked in)
      if (error.response?.status === 404 || error.response?.data?.code === 'PGRST205') {
        return { checkedIn: false, error: null };
      }
      console.error('Error getting check-in status:', error.response?.data || error.message);
      return { checkedIn: false, error: error.response?.data?.message || 'Failed to get check-in status' };
    }
  },

  // Get user's bookings (includes both confirmed and waitlist)
  async getUserBookings(memberId: string): Promise<{ bookings: any[] | null; error: string | null }> {
    try {
      const today = new Date().toISOString().split('T')[0];
      const response = await supabaseApi.get(
        `/class_bookings?member_id=eq.${memberId}&status=in.(confirmed,waitlist)&select=*,class_schedules!inner(id,scheduled_date,scheduled_time,status,classes(name,description,duration),profiles!trainer_id(first_name,last_name))&class_schedules.scheduled_date=gte.${today}`
      );
      
      // Filter out classes that are 15 minutes past their start time
      const now = new Date();
      let filteredBookings = response.data || [];
      
      if (Array.isArray(filteredBookings)) {
        filteredBookings = filteredBookings.filter((booking: any) => {
          const schedule = booking.class_schedules;
          if (!schedule || !schedule.scheduled_date || !schedule.scheduled_time) {
            return false;
          }
          
          // Combine scheduled_date and scheduled_time
          const scheduledDateTime = new Date(`${schedule.scheduled_date}T${schedule.scheduled_time}`);
          
          // Calculate cutoff time: scheduled start + 15 minutes
          const cutoffTime = new Date(scheduledDateTime);
          cutoffTime.setMinutes(cutoffTime.getMinutes() + 15);
          
          // Only include if current time is before the cutoff (15 minutes after class start)
          return now < cutoffTime;
        });
      }
      
      // Sort manually since PostgREST has issues with nested order
      if (filteredBookings && Array.isArray(filteredBookings)) {
        filteredBookings.sort((a: any, b: any) => {
          const dateA = a.class_schedules?.scheduled_date || '';
          const dateB = b.class_schedules?.scheduled_date || '';
          if (dateA !== dateB) {
            return dateA.localeCompare(dateB);
          }
          const timeA = a.class_schedules?.scheduled_time || '';
          const timeB = b.class_schedules?.scheduled_time || '';
          return timeA.localeCompare(timeB);
        });
      }
      
      // Get waitlist positions for waitlist bookings
      const bookingsWithPositions = await Promise.all(
        filteredBookings.map(async (booking: any) => {
          if (booking.status === 'waitlist') {
            // Get waitlist position
            const waitlistResponse = await supabaseApi.get(
              `/class_bookings?class_schedule_id=eq.${booking.class_schedule_id}&status=eq.waitlist&select=id&order=created_at.asc`
            );
            const waitlistArray = waitlistResponse.data || [];
            const position = waitlistArray.findIndex((b: any) => b.id === booking.id) + 1;
            return {
              ...booking,
              waitlist_position: position,
              class_schedule: {
                ...booking.class_schedules,
                class_name: booking.class_schedules.classes?.name || 'Unknown Class',
                trainer_name: booking.class_schedules.profiles ? `${booking.class_schedules.profiles.first_name} ${booking.class_schedules.profiles.last_name}` : 'Unknown Trainer',
              },
            };
          }
          return {
            ...booking,
            class_schedule: {
              ...booking.class_schedules,
              class_name: booking.class_schedules.classes?.name || 'Unknown Class',
              trainer_name: booking.class_schedules.profiles ? `${booking.class_schedules.profiles.first_name} ${booking.class_schedules.profiles.last_name}` : 'Unknown Trainer',
            },
          };
        })
      );
      
      const bookings = bookingsWithPositions;
      
      return { bookings, error: null };
    } catch (error: any) {
      // Check if the error is because the table doesn't exist
      if (error.response?.data?.code === 'PGRST205' || 
          error.response?.data?.message?.includes('Could not find the table')) {
        console.log('class_bookings table does not exist yet. Please run create-attendance-table.sql in Supabase.');
        // Return empty array instead of error - table will be created later
        return { bookings: [], error: null };
      }
      
      console.error('Error fetching user bookings:', error.response?.data || error.message);
      return { bookings: [], error: null }; // Return empty array instead of null to prevent errors
    }
  },
};

// Nutrition Services
export const nutritionService = {
  // Search food items
  async searchFoodItems(query: string): Promise<{ foods: FoodItem[]; error: string | null }> {
    try {
      const response = await supabaseApi.get(`/food_items?name=ilike.*${query}*`);
      return { foods: response.data, error: null };
    } catch (error: any) {
      return { foods: [], error: error.response?.data?.message || 'Failed to search foods' };
    }
  },

  // Add meal
  async addMeal(userId: string, data: AddMealForm): Promise<{ meal: UserMeal | null; error: string | null }> {
    try {
      const response = await supabaseApi.post('/user_meals', {
        user_id: userId,
        ...data,
      });
      const meal = response.data[0];
      return { meal, error: null };
    } catch (error: any) {
      return { meal: null, error: error.response?.data?.message || 'Failed to add meal' };
    }
  },

  // Get user meals for a date
  async getUserMeals(userId: string, date: string): Promise<{ meals: UserMeal[]; error: string | null }> {
    try {
      const response = await supabaseApi.get(`/user_meals?user_id=eq.${userId}&meal_date=eq.${date}&select=*,food_item(*)`);
      return { meals: response.data, error: null };
    } catch (error: any) {
      return { meals: [], error: error.response?.data?.message || 'Failed to get meals' };
    }
  },

  // Delete meal
  async deleteMeal(mealId: string): Promise<{ error: string | null }> {
    try {
      await supabaseApi.delete(`/user_meals?id=eq.${mealId}`);
      return { error: null };
    } catch (error: any) {
      return { error: error.response?.data?.message || 'Failed to delete meal' };
    }
  },
};

// Macro Tracking Services
export const macroService = {
  // Get macro goals for user
  async getMacroGoals(userId: string): Promise<{ goals: any[] | null; error: string | null }> {
    try {
      const response = await supabaseApi.get(`/macro_goals?user_id=eq.${userId}&is_active=eq.true&order=start_date.desc&limit=1`);
      return { goals: response.data, error: null };
    } catch (error: any) {
      if (error.response?.status === 404 || error.response?.data?.code === 'PGRST205') {
        return { goals: [], error: null };
      }
      console.error('Error fetching macro goals:', error.response?.data || error.message);
      return { goals: null, error: error.response?.data?.message || 'Failed to fetch macro goals' };
    }
  },

  // Get macro entry for a specific date
  async getMacroEntry(userId: string, date: string): Promise<{ entry: any | null; error: string | null }> {
    try {
      const response = await supabaseApi.get(`/macro_entries?user_id=eq.${userId}&entry_date=eq.${date}`);
      if (response.data && response.data.length > 0) {
        return { entry: response.data[0], error: null };
      }
      return { entry: null, error: null };
    } catch (error: any) {
      if (error.response?.status === 404 || error.response?.data?.code === 'PGRST205') {
        return { entry: null, error: null };
      }
      console.error('Error fetching macro entry:', error.response?.data || error.message);
      return { entry: null, error: error.response?.data?.message || 'Failed to fetch macro entry' };
    }
  },

  // Update or create macro entry
  async updateMacroEntry(userId: string, date: string, data: {
    calories?: number;
    protein_g?: number;
    carbs_g?: number;
    fats_g?: number;
    fiber_g?: number;
    sugar_g?: number;
    sodium_mg?: number;
    activity_type?: 'cardio' | 'weight' | 'mix' | 'rest';
  }): Promise<{ entry: any | null; error: string | null }> {
    try {
      // Check if entry exists
      const existing = await this.getMacroEntry(userId, date);
      if (existing.entry) {
        // Update existing entry
        const response = await supabaseApi.patch(`/macro_entries?id=eq.${existing.entry.id}`, data);
        return { entry: response.data[0], error: null };
      } else {
        // Create new entry
        const response = await supabaseApi.post('/macro_entries', {
          user_id: userId,
          entry_date: date,
          ...data,
        });
        return { entry: response.data[0], error: null };
      }
    } catch (error: any) {
      console.error('Error updating macro entry:', error.response?.data || error.message);
      return { entry: null, error: error.response?.data?.message || 'Failed to update macro entry' };
    }
  },

  // Save activity type for a specific date (upsert)
  async saveActivityType(userId: string, date: string, activityType: 'cardio' | 'weight' | 'mix' | 'rest'): Promise<{ entry: any | null; error: string | null }> {
    try {
      // Use upsert to save or update activity type
      const existing = await this.getMacroEntry(userId, date);
      if (existing.entry) {
        // Update existing entry with activity type
        const response = await supabaseApi.patch(`/macro_entries?id=eq.${existing.entry.id}`, {
          activity_type: activityType,
        });
        return { entry: response.data[0], error: null };
      } else {
        // Create new entry with activity type (other fields will be 0/default)
        const response = await supabaseApi.post('/macro_entries', {
          user_id: userId,
          entry_date: date,
          activity_type: activityType,
        });
        return { entry: response.data[0], error: null };
      }
    } catch (error: any) {
      console.error('Error saving activity type:', error.response?.data || error.message);
      return { entry: null, error: error.response?.data?.message || 'Failed to save activity type' };
    }
  },

  // Set up macro goals from profile data (for users who have no macro goals yet)
  async setupMacroGoals(userId: string, data: {
    height_cm: number;
    weight_kg: number;
    date_of_birth: string;
    gender: 'male' | 'female' | 'other';
    fitness_goal: 'weight_loss' | 'maintain' | 'muscle_gain';
  }): Promise<{ error: string | null }> {
    try {
      // Update profile with macro-related fields
      const profileResult = await userService.updateUser(userId, {
        height_cm: data.height_cm,
        weight_kg: data.weight_kg,
        date_of_birth: data.date_of_birth,
        gender: data.gender,
        fitness_goals: [data.fitness_goal],
      });
      if (profileResult.error) {
        return { error: profileResult.error };
      }

      // Calculate age from date of birth
      const birthDate = new Date(data.date_of_birth);
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }

      const macros = calculateBaseMacros(
        data.weight_kg,
        data.height_cm,
        age,
        data.gender,
        data.fitness_goal
      );

      // Create weight entry
      try {
        await supabaseApi.post('/weight_entries', {
          user_id: userId,
          weight_kg: data.weight_kg,
          entry_date: today.toISOString().split('T')[0],
        });
      } catch (weightErr: any) {
        if (weightErr.response?.status !== 404) {
          console.error('Error creating weight entry:', weightErr);
          return { error: 'Failed to create weight entry' };
        }
      }

      // Create macro goals
      await supabaseApi.post('/macro_goals', {
        user_id: userId,
        calories: macros.calories,
        protein_g: macros.protein_g,
        carbs_g: macros.carbs_g,
        fats_g: macros.fats_g,
        fiber_g: macros.fiber_g,
        is_active: true,
        start_date: today.toISOString().split('T')[0],
      });

      return { error: null };
    } catch (error: any) {
      console.error('Error setting up macro goals:', error.response?.data || error.message);
      return { error: error.response?.data?.message || 'Failed to set up macro goals' };
    }
  },

  // Get weight entries
  async getWeightEntries(userId: string, limit: number = 30): Promise<{ entries: any[] | null; error: string | null }> {
    try {
      const response = await supabaseApi.get(`/weight_entries?user_id=eq.${userId}&order=entry_date.desc&limit=${limit}`);
      return { entries: response.data, error: null };
    } catch (error: any) {
      if (error.response?.status === 404 || error.response?.data?.code === 'PGRST205') {
        return { entries: [], error: null };
      }
      console.error('Error fetching weight entries:', error.response?.data || error.message);
      return { entries: null, error: error.response?.data?.message || 'Failed to fetch weight entries' };
    }
  },

  // Add or update weight entry
  async addWeightEntry(userId: string, date: string, weightKg: number, notes?: string): Promise<{ entry: any | null; error: string | null }> {
    try {
      // Check if entry exists for this date
      const existing = await supabaseApi.get(`/weight_entries?user_id=eq.${userId}&entry_date=eq.${date}`);
      const isUpdate = existing.data && existing.data.length > 0;
      
      let response;
      if (isUpdate) {
        // Update existing
        response = await supabaseApi.patch(`/weight_entries?id=eq.${existing.data[0].id}`, {
          weight_kg: weightKg,
          notes: notes || null,
        });
      } else {
        // Create new
        response = await supabaseApi.post('/weight_entries', {
          user_id: userId,
          entry_date: date,
          weight_kg: weightKg,
          notes: notes || null,
        });
      }

      // If weight changed, recalculate base macros
      if (isUpdate && existing.data[0].weight_kg !== weightKg) {
        // Trigger macro recalculation (non-blocking)
        this.recalculateBaseMacros(userId).catch(err => {
          console.log('Macro recalculation triggered but failed (non-blocking):', err);
        });
      }

      return { entry: response.data[0], error: null };
    } catch (error: any) {
      console.error('Error adding weight entry:', error.response?.data || error.message);
      return { entry: null, error: error.response?.data?.message || 'Failed to add weight entry' };
    }
  },

  // Recalculate base macros when weight changes
  async recalculateBaseMacros(userId: string): Promise<{ error: string | null }> {
    try {
      // Get user profile with all needed data
      const profileResponse = await supabaseApi.get(`/profiles?id=eq.${userId}`);
      const user = profileResponse.data?.[0];
      
      if (!user) {
        return { error: 'User profile not found' };
      }

      // Get latest weight entry
      const weightResponse = await supabaseApi.get(`/weight_entries?user_id=eq.${userId}&order=entry_date.desc&limit=1`);
      const latestWeight = weightResponse.data?.[0];
      
      if (!latestWeight || !user.height_cm || !user.date_of_birth || !user.gender || !user.fitness_goals) {
        return { error: 'Missing required data for macro calculation' };
      }

      // Calculate age from date of birth
      const birthDate = new Date(user.date_of_birth);
      const today = new Date();
      const age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      const actualAge = monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate()) ? age - 1 : age;

      // Get fitness goal (use first goal if array, or default to 'maintain')
      const goal = Array.isArray(user.fitness_goals) && user.fitness_goals.length > 0
        ? user.fitness_goals[0]
        : 'maintain';

      // Calculate new base macros
      const newMacros = calculateBaseMacros(
        parseFloat(latestWeight.weight_kg),
        user.height_cm,
        actualAge,
        user.gender,
        goal
      );

      // Update macro goals (upsert active goal)
      const goalsResponse = await supabaseApi.get(`/macro_goals?user_id=eq.${userId}&is_active=eq.true&limit=1`);
      const existingGoal = goalsResponse.data?.[0];

      if (existingGoal) {
        // Update existing active goal
        await supabaseApi.patch(`/macro_goals?id=eq.${existingGoal.id}`, {
          calories: newMacros.calories,
          protein_g: newMacros.protein_g,
          carbs_g: newMacros.carbs_g,
          fats_g: newMacros.fats_g,
          fiber_g: newMacros.fiber_g,
        });
      } else {
        // Create new active goal
        await supabaseApi.post('/macro_goals', {
          user_id: userId,
          calories: newMacros.calories,
          protein_g: newMacros.protein_g,
          carbs_g: newMacros.carbs_g,
          fats_g: newMacros.fats_g,
          fiber_g: newMacros.fiber_g,
          is_active: true,
          start_date: new Date().toISOString().split('T')[0],
        });
      }

      return { error: null };
    } catch (error: any) {
      console.error('Error recalculating base macros:', error.response?.data || error.message);
      return { error: error.response?.data?.message || 'Failed to recalculate macros' };
    }
  },
};

// Progress Services
export const progressService = {
  // Add progress entry
  async addProgress(userId: string, data: AddProgressForm): Promise<{ progress: ProgressEntry | null; error: string | null }> {
    try {
      const response = await supabaseApi.post('/progress_entries', {
        user_id: userId,
        ...data,
      });
      const progress = response.data[0];
      return { progress, error: null };
    } catch (error: any) {
      return { progress: null, error: error.response?.data?.message || 'Failed to add progress' };
    }
  },

  // Get user progress entries
  async getProgressEntries(userId: string): Promise<{ entries: ProgressEntry[]; error: string | null }> {
    try {
      const response = await supabaseApi.get(`/progress_entries?user_id=eq.${userId}&order=entry_date.desc`);
      return { entries: response.data, error: null };
    } catch (error: any) {
      return { entries: [], error: error.response?.data?.message || 'Failed to get progress' };
    }
  },

  // Get latest progress entry
  async getLatestProgress(userId: string): Promise<{ progress: ProgressEntry | null; error: string | null }> {
    try {
      const response = await supabaseApi.get(`/progress_entries?user_id=eq.${userId}&order=entry_date.desc&limit=1`);
      const progress = response.data[0];
      return { progress, error: null };
    } catch (error: any) {
      return { progress: null, error: error.response?.data?.message || 'Failed to get latest progress' };
    }
  },
};

// Goal Services
export const goalService = {
  // Add goal
  async addGoal(userId: string, data: AddGoalForm): Promise<{ goal: UserGoal | null; error: string | null }> {
    try {
      const response = await supabaseApi.post('/user_goals', {
        user_id: userId,
        ...data,
      });
      const goal = response.data[0];
      return { goal, error: null };
    } catch (error: any) {
      return { goal: null, error: error.response?.data?.message || 'Failed to add goal' };
    }
  },

  // Get user goals
  async getUserGoals(userId: string): Promise<{ goals: UserGoal[]; error: string | null }> {
    try {
      const response = await supabaseApi.get(`/user_goals?user_id=eq.${userId}&order=created_at.desc`);
      return { goals: response.data, error: null };
    } catch (error: any) {
      return { goals: [], error: error.response?.data?.message || 'Failed to get goals' };
    }
  },

  // Update goal
  async updateGoal(goalId: string, data: Partial<AddGoalForm>): Promise<{ goal: UserGoal | null; error: string | null }> {
    try {
      const response = await supabaseApi.patch(`/user_goals?id=eq.${goalId}`, data);
      const goal = response.data[0];
      return { goal, error: null };
    } catch (error: any) {
      return { goal: null, error: error.response?.data?.message || 'Failed to update goal' };
    }
  },

  // Delete goal
  async deleteGoal(goalId: string): Promise<{ error: string | null }> {
    try {
      await supabaseApi.delete(`/user_goals?id=eq.${goalId}`);
      return { error: null };
    } catch (error: any) {
      return { error: error.response?.data?.message || 'Failed to delete goal' };
    }
  },
};

// Notification Services
export const notificationService = {
  // Get user notifications
  async getNotifications(userId: string): Promise<{ notifications: Notification[]; error: string | null }> {
    try {
      const response = await supabaseApi.get(`/notifications?user_id=eq.${userId}&order=created_at.desc`);
      return { notifications: response.data, error: null };
    } catch (error: any) {
      return { notifications: [], error: error.response?.data?.message || 'Failed to get notifications' };
    }
  },

  // Mark notification as read
  async markAsRead(notificationId: string): Promise<{ error: string | null }> {
    try {
      await supabaseApi.patch(`/notifications?id=eq.${notificationId}`, {
        is_read: true,
      });
      return { error: null };
    } catch (error: any) {
      return { error: error.response?.data?.message || 'Failed to mark as read' };
    }
  },
};

// Trainer Services
export const trainerService = {
  // Get all trainers
  async getAllTrainers(): Promise<{ trainers: any[] | null; error: string | null }> {
    try {
      const response = await supabaseApi.get('/profiles?role=eq.trainer&order=first_name.asc');
      return { trainers: response.data, error: null };
    } catch (error: any) {
      console.error('Error fetching trainers:', error.response?.data || error.message);
      return { trainers: null, error: 'Failed to fetch trainers' };
    }
  },

  // Lightweight count check - only fetches ids to compare with cache
  async getTrainerCount(): Promise<{ count: number; error: string | null }> {
    try {
      const response = await supabaseApi.get('/profiles?role=eq.trainer&select=id');
      return { count: response.data?.length ?? 0, error: null };
    } catch (error: any) {
      console.error('Error fetching trainer count:', error.response?.data || error.message);
      return { count: 0, error: 'Failed to fetch trainer count' };
    }
  },
};


// Schedule Services
export const scheduleService = {
  // Create a single class schedule
  async createClassSchedule(scheduleData: {
    class_id: string;
    trainer_id: string;
    scheduled_date: string;
    scheduled_time: string;
    difficulty_level: string;
    location: string;
    max_bookings: number;
    is_recurring?: boolean;
    recurring_type?: string;
    recurring_end_date?: string;
    parent_schedule_id?: string;
  }): Promise<{ schedule: any | null; error: string | null }> {
    try {
      console.log('Creating class schedule:', scheduleData);
      const response = await supabaseApi.post('/class_schedules', scheduleData);
      console.log('Class schedule created successfully:', response.data);
      return { schedule: response.data, error: null };
    } catch (error: any) {
      console.error('Error creating class schedule:', error.response?.data || error.message);
      return { schedule: null, error: error.response?.data?.message || 'Failed to create class schedule' };
    }
  },

  // Get scheduled classes for a date range
  async getScheduledClasses(startDate: string, endDate: string): Promise<{ schedules: any[] | null; error: string | null }> {
    try {
      const response = await supabaseApi.get(
        `/class_schedules?scheduled_date=gte.${startDate}&scheduled_date=lte.${endDate}&select=*,classes(name),profiles(first_name,last_name)`
      );
      return { schedules: response.data, error: null };
    } catch (error: any) {
      console.error('Error fetching scheduled classes:', error.response?.data || error.message);
      return { schedules: null, error: 'Failed to fetch scheduled classes' };
    }
  },

  // Update a class schedule
  async updateClassSchedule(
    scheduleId: string,
    updates: {
      trainer_id?: string;
      class_id?: string;
      scheduled_date?: string;
      scheduled_time?: string;
      difficulty_level?: string;
      location?: string;
      max_bookings?: number;
      status?: string;
    }
  ): Promise<{ success: boolean; error: string | null }> {
    try {
      await supabaseApi.patch(`/class_schedules?id=eq.${scheduleId}`, updates);
      return { success: true, error: null };
    } catch (error: any) {
      console.error('Error updating class schedule:', error.response?.data || error.message);
      return { success: false, error: error.response?.data?.message || 'Failed to update class schedule' };
    }
  },

  // Delete a class schedule
  async deleteClassSchedule(scheduleId: string): Promise<{ success: boolean; error: string | null }> {
    try {
      await supabaseApi.delete(`/class_schedules?id=eq.${scheduleId}`);
      return { success: true, error: null };
    } catch (error: any) {
      console.error('Error deleting class schedule:', error.response?.data || error.message);
      return { success: false, error: error.response?.data?.message || 'Failed to delete class schedule' };
    }
  },

  // Create recurring schedules
  async createRecurringSchedules(
    baseScheduleData: {
      class_id: string;
      trainer_id: string;
      scheduled_date: string;
      scheduled_time: string;
      difficulty_level: string;
      location: string;
      max_bookings: number;
      is_recurring: boolean;
      recurring_type?: string;
      recurring_end_date?: string;
    }
  ): Promise<{ schedules: any[] | null; error: string | null }> {
    try {
      const schedules = [];
      const startDate = new Date(baseScheduleData.scheduled_date);
      const endDate = baseScheduleData.recurring_end_date ? new Date(baseScheduleData.recurring_end_date) : new Date();
      
      // Create the parent schedule first
      const parentSchedule = await this.createClassSchedule({
        ...baseScheduleData,
        parent_schedule_id: undefined
      });
      
      if (parentSchedule.error) {
        return { schedules: null, error: parentSchedule.error };
      }
      
      schedules.push(parentSchedule.schedule);
      
      // Generate recurring instances
      let currentDate = new Date(startDate);
      const parentId = parentSchedule.schedule[0].id;
      
      if (baseScheduleData.recurring_type === 'daily') {
        // Daily: Only for the rest of the current week (Monday to Saturday, excluding Sunday)
        const currentDay = startDate.getDay(); // 0 = Sunday, 1 = Monday, etc.
        const daysUntilSaturday = currentDay === 0 ? 6 : 6 - currentDay; // If Sunday, go to next Saturday (6 days), otherwise go to Saturday of current week
        
        for (let i = 1; i <= daysUntilSaturday; i++) {
          currentDate.setDate(startDate.getDate() + i);
          
          // Skip Sunday (day 0)
          if (currentDate.getDay() === 0) {
            continue;
          }
          
          const scheduleData = {
            ...baseScheduleData,
            scheduled_date: currentDate.toISOString().split('T')[0],
            is_recurring: false, // Child schedules are not recurring
            parent_schedule_id: parentId
          };
          
          const childSchedule = await this.createClassSchedule(scheduleData);
          if (childSchedule.error) {
            console.error('Error creating child schedule:', childSchedule.error);
            continue;
          }
          schedules.push(childSchedule.schedule);
        }
      } else if (baseScheduleData.recurring_type === 'weekly') {
        // Weekly: 3 weeks in advance
        for (let week = 1; week <= 3; week++) {
          currentDate.setDate(startDate.getDate() + (week * 7));
          
          const scheduleData = {
            ...baseScheduleData,
            scheduled_date: currentDate.toISOString().split('T')[0],
            is_recurring: false, // Child schedules are not recurring
            parent_schedule_id: parentId
          };
          
          const childSchedule = await this.createClassSchedule(scheduleData);
          if (childSchedule.error) {
            console.error('Error creating child schedule:', childSchedule.error);
            continue;
          }
          schedules.push(childSchedule.schedule);
        }
      }
      
      return { schedules, error: null };
    } catch (error: any) {
      console.error('Error creating recurring schedules:', error);
      return { schedules: null, error: 'Failed to create recurring schedules' };
    }
  }
};

// Trainer Days Off Service
export const trainerDaysOffService = {
  // Get days off for a trainer
  async getTrainerDaysOff(trainerId: string, startDate?: string, endDate?: string): Promise<{ daysOff: any[] | null; error: string | null }> {
    try {
      let url = `/trainer_days_off?trainer_id=eq.${trainerId}`;
      if (startDate) {
        url += `&date=gte.${startDate}`;
      }
      if (endDate) {
        url += `&date=lte.${endDate}`;
      }
      url += `&order=date.asc`;
      
      const response = await supabaseApi.get(url);
      return { daysOff: response.data || [], error: null };
    } catch (error: any) {
      console.error('Error fetching trainer days off:', error.response?.data || error.message);
      return { daysOff: null, error: 'Failed to fetch trainer days off' };
    }
  },

  // Add a day off for a trainer
  async addTrainerDayOff(trainerId: string, date: string, type: 'day_off' | 'annual_leave' | 'sick_leave' = 'day_off', notes?: string): Promise<{ dayOff: any | null; error: string | null }> {
    try {
      const response = await supabaseApi.post('/trainer_days_off', {
        trainer_id: trainerId,
        date,
        type,
        notes: notes || null,
      });
      return { dayOff: response.data?.[0] || response.data, error: null };
    } catch (error: any) {
      console.error('Error adding trainer day off:', error.response?.data || error.message);
      if (error.response?.status === 409) {
        return { dayOff: null, error: 'Day off already exists for this date' };
      }
      return { dayOff: null, error: error.response?.data?.message || 'Failed to add trainer day off' };
    }
  },

  // Remove a day off for a trainer
  async removeTrainerDayOff(dayOffId: string): Promise<{ success: boolean; error: string | null }> {
    try {
      await supabaseApi.delete(`/trainer_days_off?id=eq.${dayOffId}`);
      return { success: true, error: null };
    } catch (error: any) {
      console.error('Error removing trainer day off:', error.response?.data || error.message);
      return { success: false, error: error.response?.data?.message || 'Failed to remove trainer day off' };
    }
  },

  // Update a day off (e.g., change type or notes)
  async updateTrainerDayOff(dayOffId: string, updates: { type?: string; notes?: string }): Promise<{ dayOff: any | null; error: string | null }> {
    try {
      const response = await supabaseApi.patch(`/trainer_days_off?id=eq.${dayOffId}`, updates);
      return { dayOff: response.data?.[0] || response.data, error: null };
    } catch (error: any) {
      console.error('Error updating trainer day off:', error.response?.data || error.message);
      return { dayOff: null, error: error.response?.data?.message || 'Failed to update trainer day off' };
    }
  },
};
