import { supabaseApi, authApi } from '../config/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
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
      console.error('Error headers:', error.response?.headers);
      
      // Handle specific Supabase errors
      if (error.response?.data?.error_description) {
        if (error.response.data.error_description.includes('Invalid login credentials')) {
          return { user: null, error: 'Invalid email or password' };
        }
        return { user: null, error: error.response.data.error_description };
      }
      
      return { user: null, error: 'Sign in failed. Please try again.' };
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

    const response = await authApi.get('/user');
    if (response.data) {
      const profileResponse = await supabaseApi.get(`/profiles?id=eq.${response.data.id}`);
      const user = profileResponse.data[0];
      return { user, error: null };
    }
    return { user: null, error: 'No user found' };
    
  } catch (error: any) {
    console.error('Get current user error:', error.response?.data || error.message);
    
    // Only clear the session if we get a 401 (unauthorized)
    // Don't clear on 403 (forbidden) as that might be temporary
    if (error.response?.status === 401) {
      console.log('Session expired (401), clearing stored session');
      await this.clearStoredSession();
      delete authApi.defaults.headers.common['Authorization'];
      delete supabaseApi.defaults.headers.common['Authorization'];
    } else if (error.response?.status === 403) {
      console.log('Access forbidden (403), but keeping session intact');
      // Don't clear the session on 403 errors
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
        await authApi.post('/recover', {
          email: email,
        });
        return { error: null };
      } catch (error: any) {
        console.error('Reset password error:', error.response?.data || error.message);
        
        // Handle specific Supabase errors
        if (error.response?.data?.error_description) {
          return { error: error.response.data.error_description };
        }
        
        return { error: 'Failed to send reset email. Please try again.' };
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
        console.error('Error headers:', error.response?.headers);
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
        console.error('Error headers:', error.response?.headers);
        return { trainer: null, error: 'Failed to verify trainer code' };
      }
    },

    // Change password (for first-time login)
    async changePassword(newPassword: string): Promise<{ error: string | null }> {
      try {
        console.log('Attempting to change password...');
        
        // First, check if we have a valid auth token
        if (!authApi.defaults.headers.common['Authorization']) {
          console.log('No auth token found, cannot change password');
          return { error: 'Not authenticated. Please log in again.' };
        }
        
        // Store the current auth token to restore it if needed
        const currentAuthToken = authApi.defaults.headers.common['Authorization'];
        
        const response = await authApi.put('/user', {
          password: newPassword
        });
        
        console.log('Password changed successfully');
        return { error: null };
      } catch (error: any) {
        console.error('Error changing password:', error);
        
        // Don't clear the session on password change failure
        // The session should remain valid even if password change fails
        
        if (error.response?.status === 403) {
          return { error: 'Cannot change password at this time. You can change it later in your profile settings.' };
        }
        
        return { error: 'Failed to change password' };
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
        return { user: null, error: 'Failed to update profile' };
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

  // Create new user (admin function) - UPDATED VERSION
  async createUser(userData: {
    email: string;
    first_name: string;
    role: 'member' | 'trainer' | 'admin';
  }): Promise<{ user: any | null; access_code?: string; error: string | null }> {
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
        try {
          const profileResponse = await supabaseApi.post('/profiles', profileData);
          console.log('Profile created successfully:', profileResponse.data);
        } catch (profileError: any) {
          console.error('Failed to create profile:', {
            error: profileError.response?.data || profileError.message,
            status: profileError.response?.status
          });
          return { user: null, error: 'Failed to create user profile' };
        }

        // Email notifications removed - no longer needed

        return { 
          user: authResponse.data.user, 
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
        try {
          const profileResponse = await supabaseApi.post('/profiles', profileData);
          console.log('Trainer profile created successfully:', profileResponse.data);
        } catch (profileError: any) {
          console.error('Failed to create trainer profile:', {
            error: profileError.response?.data || profileError.message,
            status: profileError.response?.status
          });
          return { user: null, error: 'Failed to create trainer profile' };
        }

        // Email notifications removed - no longer needed

        return { 
          user: authResponse.data.user, 
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
        try {
          const profileResponse = await supabaseApi.post('/profiles', profileData);
          console.log('Admin profile created successfully:', profileResponse.data);
        } catch (profileError: any) {
          console.error('Failed to create admin profile:', {
            error: profileError.response?.data || profileError.message,
            status: profileError.response?.status
          });
          return { user: null, error: 'Failed to create admin profile' };
        }

        // Email notifications removed - no longer needed

        return { 
          user: authResponse.data.user, 
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
  }): Promise<{ user: User | null; error: string | null }> {
    try {
      const response = await supabaseApi.patch(`/profiles?id=eq.${userId}`, data);
      const user = response.data[0];
      return { user, error: null };
    } catch (error: any) {
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
      const response = await supabaseApi.get('/profiles?role=eq.trainer');
      return { trainers: response.data, error: null };
    } catch (error: any) {
      console.error('Error fetching trainers:', error.response?.data || error.message);
      return { trainers: null, error: 'Failed to fetch trainers' };
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

