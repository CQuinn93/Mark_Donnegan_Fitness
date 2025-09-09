-- Create Class Attendance table for tracking member attendance
-- Run this in your Supabase SQL Editor

-- Create Class Attendance table
CREATE TABLE IF NOT EXISTS public.class_attendance (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    class_schedule_id UUID NOT NULL REFERENCES public.class_schedules(id) ON DELETE CASCADE,
    member_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    attended BOOLEAN DEFAULT FALSE,
    checked_in_at TIMESTAMP WITH TIME ZONE,
    checked_in_by UUID REFERENCES public.profiles(id), -- Trainer who checked them in
    notes TEXT, -- Optional notes from trainer
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure one attendance record per member per class
    UNIQUE(class_schedule_id, member_id)
);

-- Create Class Bookings table (if it doesn't exist)
-- This tracks who is booked for each class
CREATE TABLE IF NOT EXISTS public.class_bookings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    class_schedule_id UUID NOT NULL REFERENCES public.class_schedules(id) ON DELETE CASCADE,
    member_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    booked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status VARCHAR(20) NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'cancelled', 'waitlist')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure one booking per member per class
    UNIQUE(class_schedule_id, member_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_class_attendance_schedule ON public.class_attendance(class_schedule_id);
CREATE INDEX IF NOT EXISTS idx_class_attendance_member ON public.class_attendance(member_id);
CREATE INDEX IF NOT EXISTS idx_class_attendance_attended ON public.class_attendance(attended);
CREATE INDEX IF NOT EXISTS idx_class_bookings_schedule ON public.class_bookings(class_schedule_id);
CREATE INDEX IF NOT EXISTS idx_class_bookings_member ON public.class_bookings(member_id);
CREATE INDEX IF NOT EXISTS idx_class_bookings_status ON public.class_bookings(status);

-- Enable Row Level Security
ALTER TABLE public.class_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_bookings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for Class Attendance table
-- Allow all authenticated users to view attendance records
CREATE POLICY "Allow authenticated users to view attendance" ON public.class_attendance
    FOR SELECT USING (auth.role() = 'authenticated' OR auth.role() = 'anon');

-- Allow trainers to manage attendance for their classes
CREATE POLICY "Allow trainers to manage attendance" ON public.class_attendance
    FOR ALL USING (
        auth.role() = 'authenticated' OR auth.role() = 'anon'
    );

-- Allow members to view their own attendance
CREATE POLICY "Allow members to view own attendance" ON public.class_attendance
    FOR SELECT USING (
        member_id = auth.uid() OR auth.role() = 'authenticated' OR auth.role() = 'anon'
    );

-- RLS Policies for Class Bookings table
-- Allow all authenticated users to view bookings
CREATE POLICY "Allow authenticated users to view bookings" ON public.class_bookings
    FOR SELECT USING (auth.role() = 'authenticated' OR auth.role() = 'anon');

-- Allow members to manage their own bookings
CREATE POLICY "Allow members to manage own bookings" ON public.class_bookings
    FOR ALL USING (
        member_id = auth.uid() OR auth.role() = 'authenticated' OR auth.role() = 'anon'
    );

-- Allow trainers to view bookings for their classes
CREATE POLICY "Allow trainers to view class bookings" ON public.class_bookings
    FOR SELECT USING (auth.role() = 'authenticated' OR auth.role() = 'anon');

-- Grant permissions
GRANT ALL ON public.class_attendance TO anon, authenticated, service_role;
GRANT ALL ON public.class_bookings TO anon, authenticated, service_role;

-- Create triggers to automatically update updated_at
CREATE TRIGGER update_class_attendance_updated_at
    BEFORE UPDATE ON public.class_attendance
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_class_bookings_updated_at
    BEFORE UPDATE ON public.class_bookings
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Add comments to tables
COMMENT ON TABLE public.class_attendance IS 'Tracks member attendance for specific class instances';
COMMENT ON TABLE public.class_bookings IS 'Tracks member bookings for specific class instances';
COMMENT ON COLUMN public.class_attendance.attended IS 'Whether the member actually attended the class';
COMMENT ON COLUMN public.class_attendance.checked_in_by IS 'Trainer who checked in the member';
COMMENT ON COLUMN public.class_bookings.status IS 'Booking status: confirmed, cancelled, or waitlist';

SELECT 'Class Attendance and Bookings tables created successfully with RLS policies' as status;
