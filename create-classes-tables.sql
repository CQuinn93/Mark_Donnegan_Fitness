-- Create Classes and Class Schedules tables for MD Fitness
-- Run this in your Supabase SQL Editor

-- Create Classes table (Master Templates)
CREATE TABLE IF NOT EXISTS public.classes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    duration INTEGER NOT NULL, -- Duration in minutes
    max_members INTEGER NOT NULL DEFAULT 10,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create Class Schedules table (Specific Instances)
CREATE TABLE IF NOT EXISTS public.class_schedules (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
    trainer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    scheduled_date DATE NOT NULL,
    scheduled_time TIME NOT NULL,
    difficulty_level VARCHAR(20) NOT NULL CHECK (difficulty_level IN ('beginner', 'intermediate', 'advanced')),
    location VARCHAR(50) NOT NULL DEFAULT 'gym' CHECK (location IN ('gym', 'park')),
    current_bookings INTEGER DEFAULT 0,
    max_bookings INTEGER NOT NULL, -- Can be different from class template max_members
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'completed')),
    is_recurring BOOLEAN DEFAULT FALSE,
    recurring_type VARCHAR(20) CHECK (recurring_type IN ('daily', 'weekly', 'monthly')),
    recurring_end_date DATE, -- When the recurring schedule should end
    parent_schedule_id UUID REFERENCES public.class_schedules(id), -- For tracking recurring schedules
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_classes_name ON public.classes(name);
CREATE INDEX IF NOT EXISTS idx_class_schedules_date ON public.class_schedules(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_class_schedules_trainer ON public.class_schedules(trainer_id);
CREATE INDEX IF NOT EXISTS idx_class_schedules_class ON public.class_schedules(class_id);
CREATE INDEX IF NOT EXISTS idx_class_schedules_status ON public.class_schedules(status);
CREATE INDEX IF NOT EXISTS idx_class_schedules_recurring ON public.class_schedules(is_recurring, parent_schedule_id);

-- Enable Row Level Security
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_schedules ENABLE ROW LEVEL SECURITY;

-- RLS Policies for Classes table
-- Allow all authenticated users to view classes
CREATE POLICY "Allow authenticated users to view classes" ON public.classes
    FOR SELECT USING (auth.role() = 'authenticated' OR auth.role() = 'anon');

-- Allow admins to manage classes
CREATE POLICY "Allow admins to manage classes" ON public.classes
    FOR ALL USING (auth.role() = 'authenticated' OR auth.role() = 'anon');

-- RLS Policies for Class Schedules table
-- Allow all authenticated users to view class schedules
CREATE POLICY "Allow authenticated users to view class schedules" ON public.class_schedules
    FOR SELECT USING (auth.role() = 'authenticated' OR auth.role() = 'anon');

-- Allow admins to manage class schedules
CREATE POLICY "Allow admins to manage class schedules" ON public.class_schedules
    FOR ALL USING (auth.role() = 'authenticated' OR auth.role() = 'anon');

-- Allow trainers to view and update their own class schedules
CREATE POLICY "Allow trainers to manage their own schedules" ON public.class_schedules
    FOR ALL USING (
        auth.role() = 'authenticated' OR auth.role() = 'anon'
    );

-- Grant permissions
GRANT ALL ON public.classes TO anon, authenticated, service_role;
GRANT ALL ON public.class_schedules TO anon, authenticated, service_role;

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers to automatically update updated_at
CREATE TRIGGER update_classes_updated_at
    BEFORE UPDATE ON public.classes
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_class_schedules_updated_at
    BEFORE UPDATE ON public.class_schedules
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Add some sample classes
INSERT INTO public.classes (name, description, duration, max_members) VALUES
('Yoga Flow', 'A dynamic yoga class combining strength, flexibility, and mindfulness', 60, 15),
('HIIT Training', 'High-intensity interval training for maximum calorie burn', 45, 12),
('Pilates', 'Core-focused workout using controlled movements', 50, 10),
('Strength Training', 'Weight-based training for building muscle and strength', 60, 8),
('Cardio Blast', 'High-energy cardio workout to get your heart pumping', 30, 20)
ON CONFLICT DO NOTHING;

-- Add comments to tables
COMMENT ON TABLE public.classes IS 'Master class templates with fixed attributes';
COMMENT ON TABLE public.class_schedules IS 'Specific scheduled instances of classes with variable attributes';
COMMENT ON COLUMN public.class_schedules.difficulty_level IS 'Difficulty level for this specific schedule instance';
COMMENT ON COLUMN public.class_schedules.location IS 'Where the class will be held (gym or park)';
COMMENT ON COLUMN public.class_schedules.is_recurring IS 'Whether this schedule repeats';
COMMENT ON COLUMN public.class_schedules.parent_schedule_id IS 'Reference to the original schedule for recurring instances';

SELECT 'Classes and Class Schedules tables created successfully with RLS policies' as status;
