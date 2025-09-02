-- MD Fitness Mobile App Database Schema
-- Supabase SQL Schema

-- Create custom types
CREATE TYPE user_role AS ENUM ('member', 'trainer', 'admin');
CREATE TYPE class_status AS ENUM ('scheduled', 'ongoing', 'completed', 'cancelled');
CREATE TYPE booking_status AS ENUM ('confirmed', 'waitlist', 'cancelled');
CREATE TYPE meal_type AS ENUM ('breakfast', 'lunch', 'dinner', 'snack');

-- Users table (extends Supabase auth.users)
CREATE TABLE public.profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    phone TEXT,
    date_of_birth DATE,
    gender TEXT CHECK (gender IN ('male', 'female', 'other')),
    height_cm INTEGER,
    weight_kg DECIMAL(5,2),
    fitness_goals TEXT[],
    membership_type TEXT DEFAULT 'basic',
    role user_role DEFAULT 'member',
    profile_image_url TEXT,
    emergency_contact_name TEXT,
    emergency_contact_phone TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Classes table
CREATE TABLE public.classes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    trainer_id UUID REFERENCES public.profiles(id),
    max_capacity INTEGER NOT NULL,
    duration_minutes INTEGER NOT NULL,
    difficulty_level TEXT CHECK (difficulty_level IN ('beginner', 'intermediate', 'advanced')),
    category TEXT NOT NULL, -- e.g., 'yoga', 'cardio', 'strength', 'pilates'
    equipment_needed TEXT[],
    class_image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create class_schedules table
CREATE TABLE IF NOT EXISTS class_schedules (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    trainer_id UUID NOT NULL REFERENCES trainers(id) ON DELETE CASCADE,
    scheduled_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    max_capacity INTEGER NOT NULL DEFAULT 20,
    current_enrollment INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(class_id, trainer_id, scheduled_date, start_time)
);

-- Class bookings table
CREATE TABLE public.class_bookings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    class_schedule_id UUID REFERENCES public.class_schedules(id) ON DELETE CASCADE,
    booking_status booking_status DEFAULT 'confirmed',
    booked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    attended BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Nutrition/Food database
CREATE TABLE public.food_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    brand TEXT,
    serving_size TEXT,
    calories_per_serving INTEGER,
    protein_g DECIMAL(5,2),
    carbs_g DECIMAL(5,2),
    fat_g DECIMAL(5,2),
    fiber_g DECIMAL(5,2),
    sugar_g DECIMAL(5,2),
    sodium_mg INTEGER,
    barcode TEXT UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User meals table
CREATE TABLE public.user_meals (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    food_item_id UUID REFERENCES public.food_items(id),
    meal_type meal_type NOT NULL,
    serving_quantity DECIMAL(5,2) DEFAULT 1.0,
    custom_food_name TEXT, -- For user-added foods not in database
    custom_calories INTEGER,
    custom_protein_g DECIMAL(5,2),
    custom_carbs_g DECIMAL(5,2),
    custom_fat_g DECIMAL(5,2),
    consumed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Progress tracking table
CREATE TABLE public.progress_entries (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    entry_date DATE NOT NULL,
    weight_kg DECIMAL(5,2),
    body_fat_percentage DECIMAL(4,2),
    muscle_mass_kg DECIMAL(5,2),
    measurements JSONB, -- Store body measurements as JSON
    progress_photos TEXT[], -- Array of photo URLs
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Workouts table
CREATE TABLE public.workouts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    workout_type TEXT NOT NULL, -- 'strength', 'cardio', 'flexibility', 'custom'
    duration_minutes INTEGER,
    calories_burned INTEGER,
    completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Workout exercises table
CREATE TABLE public.workout_exercises (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    workout_id UUID REFERENCES public.workouts(id) ON DELETE CASCADE,
    exercise_name TEXT NOT NULL,
    sets INTEGER,
    reps INTEGER,
    weight_kg DECIMAL(5,2),
    duration_seconds INTEGER,
    distance_meters DECIMAL(8,2),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User goals table
CREATE TABLE public.user_goals (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    goal_type TEXT NOT NULL, -- 'weight_loss', 'muscle_gain', 'endurance', 'strength', 'custom'
    title TEXT NOT NULL,
    description TEXT,
    target_value DECIMAL(8,2),
    current_value DECIMAL(8,2),
    unit TEXT, -- 'kg', 'lbs', 'minutes', 'reps', etc.
    target_date DATE,
    is_completed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Notifications table
CREATE TABLE public.notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    notification_type TEXT NOT NULL, -- 'class_reminder', 'goal_achievement', 'system', 'promotion'
    is_read BOOLEAN DEFAULT FALSE,
    data JSONB, -- Additional data for the notification
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_profiles_email ON public.profiles(email);
CREATE INDEX idx_class_schedules_start_time ON public.class_schedules(start_time);
CREATE INDEX idx_class_bookings_user_id ON public.class_bookings(user_id);
CREATE INDEX idx_class_bookings_schedule_id ON public.class_bookings(class_schedule_id);
CREATE INDEX idx_user_meals_user_id ON public.user_meals(user_id);
CREATE INDEX idx_user_meals_consumed_at ON public.user_meals(consumed_at);
CREATE INDEX idx_progress_entries_user_id ON public.progress_entries(user_id);
CREATE INDEX idx_progress_entries_entry_date ON public.progress_entries(entry_date);
CREATE INDEX idx_workouts_user_id ON public.workouts(user_id);
CREATE INDEX idx_workouts_completed_at ON public.workouts(completed_at);
CREATE INDEX idx_user_goals_user_id ON public.user_goals(user_id);
CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_notifications_is_read ON public.notifications(is_read);

-- Enable Row Level Security on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.food_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_meals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.progress_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles table
CREATE POLICY "Users can view their own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" ON public.profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- RLS Policies for classes table (public read, admin write)
CREATE POLICY "Anyone can view classes" ON public.classes
    FOR SELECT USING (true);

CREATE POLICY "Only trainers and admins can create classes" ON public.classes
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() 
            AND role IN ('trainer', 'admin')
        )
    );

CREATE POLICY "Only trainers and admins can update classes" ON public.classes
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() 
            AND role IN ('trainer', 'admin')
        )
    );

-- RLS Policies for class_schedules table
CREATE POLICY "Anyone can view class schedules" ON public.class_schedules
    FOR SELECT USING (true);

CREATE POLICY "Only trainers and admins can manage schedules" ON public.class_schedules
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() 
            AND role IN ('trainer', 'admin')
        )
    );

-- Add RLS policies
ALTER TABLE class_schedules ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read class schedules
CREATE POLICY "Allow authenticated users to read class schedules" ON class_schedules
    FOR SELECT USING (auth.role() = 'authenticated');

-- Allow authenticated users to update enrollment
CREATE POLICY "Allow authenticated users to update enrollment" ON class_schedules
    FOR UPDATE USING (auth.role() = 'authenticated');

-- Allow service role to manage all class schedules
CREATE POLICY "Allow service role to manage class schedules" ON class_schedules
    FOR ALL USING (auth.role() = 'service_role');

-- Grant permissions
GRANT SELECT, UPDATE ON class_schedules TO authenticated;
GRANT ALL ON class_schedules TO service_role;

-- RLS Policies for class_bookings table
CREATE POLICY "Users can view their own bookings" ON public.class_bookings
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own bookings" ON public.class_bookings
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own bookings" ON public.class_bookings
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own bookings" ON public.class_bookings
    FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for food_items table (public read, admin write)
CREATE POLICY "Anyone can view food items" ON public.food_items
    FOR SELECT USING (true);

CREATE POLICY "Only admins can manage food items" ON public.food_items
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() 
            AND role = 'admin'
        )
    );

-- RLS Policies for user_meals table
CREATE POLICY "Users can view their own meals" ON public.user_meals
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own meals" ON public.user_meals
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own meals" ON public.user_meals
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own meals" ON public.user_meals
    FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for progress_entries table
CREATE POLICY "Users can view their own progress" ON public.progress_entries
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own progress entries" ON public.progress_entries
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own progress entries" ON public.progress_entries
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own progress entries" ON public.progress_entries
    FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for workouts table
CREATE POLICY "Users can view their own workouts" ON public.workouts
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own workouts" ON public.workouts
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own workouts" ON public.workouts
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own workouts" ON public.workouts
    FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for workout_exercises table
CREATE POLICY "Users can view exercises for their workouts" ON public.workout_exercises
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.workouts 
            WHERE id = workout_id 
            AND user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create exercises for their workouts" ON public.workout_exercises
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.workouts 
            WHERE id = workout_id 
            AND user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update exercises for their workouts" ON public.workout_exercises
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.workouts 
            WHERE id = workout_id 
            AND user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete exercises for their workouts" ON public.workout_exercises
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.workouts 
            WHERE id = workout_id 
            AND user_id = auth.uid()
        )
    );

-- RLS Policies for user_goals table
CREATE POLICY "Users can view their own goals" ON public.user_goals
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own goals" ON public.user_goals
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own goals" ON public.user_goals
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own goals" ON public.user_goals
    FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for notifications table
CREATE POLICY "Users can view their own notifications" ON public.notifications
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications" ON public.notifications
    FOR UPDATE USING (auth.uid() = user_id);

-- Create function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, first_name, last_name)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
        COALESCE(NEW.raw_user_meta_data->>'last_name', '')
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user registration
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at columns
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_classes_updated_at BEFORE UPDATE ON public.classes
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_class_schedules_updated_at BEFORE UPDATE ON public.class_schedules
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_food_items_updated_at BEFORE UPDATE ON public.food_items
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_progress_entries_updated_at BEFORE UPDATE ON public.progress_entries
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_goals_updated_at BEFORE UPDATE ON public.user_goals
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Insert some sample data
INSERT INTO public.food_items (name, brand, serving_size, calories_per_serving, protein_g, carbs_g, fat_g) VALUES
('Chicken Breast', 'Generic', '100g', 165, 31, 0, 3.6),
('Brown Rice', 'Generic', '100g', 111, 2.6, 23, 0.9),
('Broccoli', 'Generic', '100g', 34, 2.8, 7, 0.4),
('Banana', 'Generic', '1 medium', 105, 1.3, 27, 0.4),
('Greek Yogurt', 'Generic', '100g', 59, 10, 3.6, 0.4);

-- Insert sample classes
INSERT INTO public.classes (name, description, max_capacity, duration_minutes, difficulty_level, category) VALUES
('Yoga Flow', 'A dynamic yoga class focusing on strength and flexibility', 20, 60, 'intermediate', 'yoga'),
('HIIT Cardio', 'High-intensity interval training for maximum calorie burn', 15, 45, 'advanced', 'cardio'),
('Strength Training', 'Full-body strength workout using free weights', 12, 60, 'intermediate', 'strength'),
('Pilates', 'Core-focused workout for stability and posture', 18, 50, 'beginner', 'pilates');

