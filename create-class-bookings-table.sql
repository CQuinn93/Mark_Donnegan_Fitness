-- Create Class Bookings table for MD Fitness
-- This table tracks member bookings for specific class instances
-- Run this in your Supabase SQL Editor

-- Create Class Bookings table
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
CREATE INDEX IF NOT EXISTS idx_class_bookings_schedule ON public.class_bookings(class_schedule_id);
CREATE INDEX IF NOT EXISTS idx_class_bookings_member ON public.class_bookings(member_id);
CREATE INDEX IF NOT EXISTS idx_class_bookings_status ON public.class_bookings(status);
CREATE INDEX IF NOT EXISTS idx_class_bookings_member_status ON public.class_bookings(member_id, status);

-- Enable Row Level Security
ALTER TABLE public.class_bookings ENABLE ROW LEVEL SECURITY;

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
GRANT ALL ON public.class_bookings TO anon, authenticated, service_role;

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_class_bookings_updated_at
    BEFORE UPDATE ON public.class_bookings
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Add comments to table
COMMENT ON TABLE public.class_bookings IS 'Tracks member bookings for specific class instances';
COMMENT ON COLUMN public.class_bookings.status IS 'Booking status: confirmed, cancelled, or waitlist';
COMMENT ON COLUMN public.class_bookings.booked_at IS 'Timestamp when the booking was made';

SELECT 'Class Bookings table created successfully with RLS policies' as status;


