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
      await authApi.post('/logout');
      // Clear the token
      delete supabaseApi.defaults.headers.common['Authorization'];
      delete authApi.defaults.headers.common['Authorization'];
      return { error: null };
    } catch (error: any) {
      console.error('Sign out error:', error.response?.data || error.message);
      // Even if logout fails, clear the tokens
      delete supabaseApi.defaults.headers.common['Authorization'];
      delete authApi.defaults.headers.common['Authorization'];
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
    
    // If we get a 401, clear the stored session as it's invalid
    if (error.response?.status === 401) {
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
        
        const response = await supabaseApi.get(`/trainers?code=eq.${code}&is_active=eq.true`);
        
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
        const response = await authApi.put('/user', {
          password: newPassword
        });
        
        return { error: null };
      } catch (error: any) {
        console.error('Error changing password:', error);
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
        const response = await authApi.get('/user');
        if (response.data?.user_metadata?.is_temp_password) {
          return { hasTempPassword: true, error: null };
        }
        return { hasTempPassword: false, error: null };
      } catch (error: any) {
        console.error('Error checking temp password:', error);
        return { hasTempPassword: false, error: 'Failed to check password status' };
      }
    },
  }



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

  // Create new user (admin function)
  async createUser(userData: {
    email: string;
    first_name: string;
    role: 'member' | 'trainer';
  }): Promise<{ user: any | null; temp_password?: string; trainer_code?: string; error: string | null }> {
    try {
      if (userData.role === 'member') {
        // For members: create auth user with temp password
        const tempPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8);
        
        // Create auth user
        const authResponse = await authApi.post('/signup', {
          email: userData.email,
          password: tempPassword,
          options: {
            data: {
              first_name: userData.first_name,
              role: 'member',
              is_temp_password: true, // Flag to indicate first-time login
            },
          },
        });

        if (!authResponse.data.user) {
          return { user: null, error: 'Failed to create auth user' };
        }

        // Create profile
        const profileData = {
          id: authResponse.data.user.id,
          email: userData.email,
          first_name: userData.first_name,
          last_name: '', // Will be filled by user
          role: 'member',
          temp_password: tempPassword, // Store temp password for email trigger
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        const profileResponse = await supabaseApi.post('/profiles', profileData);
        
        return { 
          user: profileResponse.data[0], 
          temp_password: tempPassword,
          error: null 
        };

      } else if (userData.role === 'trainer') {
        // For trainers: generate 6-digit code as password
        const trainerCode = Math.floor(100000 + Math.random() * 900000).toString();
        
        // Create auth user with the code as password
        const authResponse = await authApi.post('/signup', {
          email: userData.email,
          password: trainerCode, // Use code as password
          options: {
            data: {
              first_name: userData.first_name,
              role: 'trainer',
              trainer_code: trainerCode, // Store code in metadata
            },
          },
        });

        if (!authResponse.data.user) {
          return { user: null, error: 'Failed to create auth user' };
        }

        // Create profile
        const profileData = {
          id: authResponse.data.user.id,
          email: userData.email,
          first_name: userData.first_name,
          last_name: '', // Will be filled by user
          role: 'trainer',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        const profileResponse = await supabaseApi.post('/profiles', profileData);
        
        // Add to trainers table
        await supabaseApi.post('/trainers', {
          name: userData.first_name,
          code: trainerCode,
          email: userData.email,
          is_active: true,
        });

        return { 
          user: profileResponse.data[0], 
          trainer_code: trainerCode,
          error: null 
        };
      }

      return { user: null, error: 'Invalid role specified' };
    } catch (error: any) {
      console.error('Error creating user:', error.response?.data || error.message);
      
      // Handle specific Supabase errors
      if (error.response?.data?.error_description) {
        if (error.response.data.error_description.includes('already registered')) {
          return { user: null, error: 'An account with this email already exists' };
        }
        return { user: null, error: error.response.data.error_description };
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

  // Get trainer's classes
  async getTrainerClasses(trainerId: string, endDate: string): Promise<{ classes: any[] | null; error: string | null }> {
    try {
      const response = await supabaseApi.get(
        `/class_schedules?trainer_id=eq.${trainerId}&scheduled_date=lte.${endDate}&is_active=eq.true&select=*,classes(name,description,difficulty_level,duration_minutes)`
      );
      
      // Transform the response to flatten the class data
      const transformedClasses = response.data?.map((schedule: any) => ({
        ...schedule,
        class_name: schedule.classes?.name,
        class_description: schedule.classes?.description,
        difficulty_level: schedule.classes?.difficulty_level,
        duration_minutes: schedule.classes?.duration_minutes,
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
      const response = await supabaseApi.get('/trainers?is_active=eq.true&order=name.asc');
      // Transform the data to match the expected format
      const trainers = response.data.map((trainer: any) => ({
        id: trainer.id,
        first_name: trainer.name.split(' ')[0] || trainer.name,
        last_name: trainer.name.split(' ').slice(1).join(' ') || '',
        email: trainer.email,
        code: trainer.code,
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
        ...scheduleData,
        current_enrollment: 0,
        is_active: true,
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
      const response = await supabaseApi.get(`/class_schedules?scheduled_date=eq.${date}&is_active=eq.true&select=*,classes(name),profiles!trainer_id(first_name,last_name)`);
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
      const response = await supabaseApi.get('/trainers?is_active=eq.true');
      return { trainers: response.data, error: null };
    } catch (error: any) {
      console.error('Error fetching trainers:', error.response?.data || error.message);
      return { trainers: null, error: 'Failed to fetch trainers' };
    }
  },
};

