// User types
export interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone?: string;
  date_of_birth?: string;
  gender?: 'male' | 'female' | 'other';
  height_cm?: number;
  weight_kg?: number;
  fitness_goals?: string[];
  membership_type?: string;
  role: 'member' | 'trainer' | 'admin';
  profile_image_url?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  created_at: string;
  updated_at: string;
}

// Class types
export interface Class {
  id: string;
  name: string;
  description?: string;
  trainer_id?: string;
  max_capacity: number;
  duration_minutes: number;
  difficulty_level: 'beginner' | 'intermediate' | 'advanced';
  category: string;
  equipment_needed?: string[];
  class_image_url?: string;
  created_at: string;
  updated_at: string;
}

export interface ClassSchedule {
  id: string;
  class_id: string;
  start_time: string;
  end_time: string;
  room_location?: string;
  status: 'scheduled' | 'ongoing' | 'completed' | 'cancelled';
  current_attendees: number;
  created_at: string;
  updated_at: string;
  class?: Class; // Joined data
}

export interface ClassBooking {
  id: string;
  user_id: string;
  class_schedule_id: string;
  booking_status: 'confirmed' | 'waitlist' | 'cancelled';
  booked_at: string;
  attended: boolean;
  created_at: string;
  class_schedule?: ClassSchedule; // Joined data
}

// Nutrition types
export interface FoodItem {
  id: string;
  name: string;
  brand?: string;
  serving_size?: string;
  calories_per_serving?: number;
  protein_g?: number;
  carbs_g?: number;
  fat_g?: number;
  fiber_g?: number;
  sugar_g?: number;
  sodium_mg?: number;
  barcode?: string;
  created_at: string;
  updated_at: string;
}

export interface UserMeal {
  id: string;
  user_id: string;
  food_item_id?: string;
  meal_type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  serving_quantity: number;
  custom_food_name?: string;
  custom_calories?: number;
  custom_protein_g?: number;
  custom_carbs_g?: number;
  custom_fat_g?: number;
  meal_date: string;
  meal_time?: string;
  notes?: string;
  created_at: string;
  food_item?: FoodItem; // Joined data
}

// Progress types
export interface ProgressEntry {
  id: string;
  user_id: string;
  entry_date: string;
  weight_kg?: number;
  body_fat_percentage?: number;
  muscle_mass_kg?: number;
  measurements?: Record<string, number>;
  progress_photos?: string[];
  notes?: string;
  created_at: string;
}

// Workout types
export interface Workout {
  id: string;
  user_id: string;
  workout_name: string;
  workout_date: string;
  duration_minutes?: number;
  calories_burned?: number;
  workout_type?: string;
  notes?: string;
  created_at: string;
}

export interface WorkoutExercise {
  id: string;
  workout_id: string;
  exercise_name: string;
  sets?: number;
  reps?: number;
  weight_kg?: number;
  duration_seconds?: number;
  distance_meters?: number;
  rest_seconds?: number;
  order_index?: number;
  notes?: string;
  created_at: string;
}

// Goal types
export interface UserGoal {
  id: string;
  user_id: string;
  goal_type: string;
  target_value?: number;
  current_value?: number;
  unit?: string;
  target_date?: string;
  is_completed: boolean;
  created_at: string;
  updated_at: string;
}

// Notification types
export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  notification_type?: string;
  is_read: boolean;
  related_entity_type?: string;
  related_entity_id?: string;
  created_at: string;
}

// API Response types
export interface ApiResponse<T> {
  data: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  count: number;
  page: number;
  limit: number;
  total_pages: number;
}

// Navigation types
export type RootStackParamList = {
  Login: undefined;
  Plans: undefined;
  ForgotPassword: undefined;
  Main: undefined;
  Admin: { user: User };
  Trainer: { user: User };
  FirstTimeSetup: { user: User; onComplete?: (updatedUser?: User) => void };
  Welcome: { user: User; onComplete: () => void };
};

export type MainTabParamList = {
  Dashboard: undefined;
  Classes: undefined;
  Nutrition: undefined;
  Progress: undefined;
  Profile: undefined;
};

export type ClassesStackParamList = {
  ClassesList: undefined;
  ClassDetails: { classId: string };
  ClassBooking: { scheduleId: string };
  MyBookings: undefined;
};

export type NutritionStackParamList = {
  NutritionDashboard: undefined;
  AddMeal: undefined;
  FoodSearch: undefined;
  MealHistory: undefined;
};

export type ProgressStackParamList = {
  ProgressDashboard: undefined;
  AddProgress: undefined;
  ProgressHistory: undefined;
  Goals: undefined;
  AddGoal: undefined;
};

// Form types
export interface LoginForm {
  email: string;
  password: string;
}

export interface RegisterForm {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
}

export interface ProfileForm {
  first_name: string;
  last_name: string;
  phone?: string;
  date_of_birth?: string;
  gender?: 'male' | 'female' | 'other';
  height_cm?: number;
  weight_kg?: number;
  fitness_goals?: string[];
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
}

export interface AddMealForm {
  meal_type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  food_item_id?: string;
  serving_quantity: number;
  custom_food_name?: string;
  custom_calories?: number;
  custom_protein_g?: number;
  custom_carbs_g?: number;
  custom_fat_g?: number;
  meal_date: string;
  meal_time?: string;
  notes?: string;
}

export interface AddProgressForm {
  entry_date: string;
  weight_kg?: number;
  body_fat_percentage?: number;
  muscle_mass_kg?: number;
  measurements?: Record<string, number>;
  notes?: string;
}

export interface AddGoalForm {
  goal_type: string;
  target_value?: number;
  current_value?: number;
  unit?: string;
  target_date?: string;
}

// Theme types
export interface Theme {
  colors: {
    primary: string;
    secondary: string;
    background: string;
    surface: string;
    text: string;
    textSecondary: string;
    border: string;
    success: string;
    error: string;
    warning: string;
    info: string;
  };
  spacing: {
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
  };
  borderRadius: {
    sm: number;
    md: number;
    lg: number;
  };
  typography: {
    h1: {
      fontSize: number;
      fontWeight: string;
    };
    h2: {
      fontSize: number;
      fontWeight: string;
    };
    h3: {
      fontSize: number;
      fontWeight: string;
    };
    body: {
      fontSize: number;
      fontWeight: string;
    };
    caption: {
      fontSize: number;
      fontWeight: string;
    };
  };
}

