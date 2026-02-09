-- Create Trainer Days Off / Annual Leave table
-- This table tracks when trainers have days off or annual leave

CREATE TABLE IF NOT EXISTS public.trainer_days_off (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    trainer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    type VARCHAR(20) NOT NULL DEFAULT 'day_off' CHECK (type IN ('day_off', 'annual_leave', 'sick_leave')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure one entry per trainer per date
    UNIQUE(trainer_id, date)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_trainer_days_off_trainer ON public.trainer_days_off(trainer_id);
CREATE INDEX IF NOT EXISTS idx_trainer_days_off_date ON public.trainer_days_off(date);
CREATE INDEX IF NOT EXISTS idx_trainer_days_off_trainer_date ON public.trainer_days_off(trainer_id, date);
CREATE INDEX IF NOT EXISTS idx_trainer_days_off_type ON public.trainer_days_off(type);

-- Enable Row Level Security
ALTER TABLE public.trainer_days_off ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Allow authenticated users to view days off" ON public.trainer_days_off
    FOR SELECT USING (auth.role() = 'authenticated' OR auth.role() = 'anon');

CREATE POLICY "Allow trainers to view own days off" ON public.trainer_days_off
    FOR SELECT USING (
        trainer_id = auth.uid() OR auth.role() = 'authenticated' OR auth.role() = 'anon'
    );

CREATE POLICY "Allow admins to manage days off" ON public.trainer_days_off
    FOR ALL USING (auth.role() = 'authenticated' OR auth.role() = 'anon');

-- Grant permissions
GRANT ALL ON public.trainer_days_off TO anon, authenticated, service_role;

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_trainer_days_off_updated_at
    BEFORE UPDATE ON public.trainer_days_off
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Add comments
COMMENT ON TABLE public.trainer_days_off IS 'Tracks trainer days off, annual leave, and sick leave';
COMMENT ON COLUMN public.trainer_days_off.type IS 'Type of leave: day_off, annual_leave, or sick_leave';
COMMENT ON COLUMN public.trainer_days_off.notes IS 'Optional notes about the day off';

SELECT 'Trainer days off table created successfully with RLS policies' as status;


