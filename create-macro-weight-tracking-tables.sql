-- Create Macro and Weight Tracking tables for MD Fitness
-- Run this in your Supabase SQL Editor

-- Create Weight Entries table
CREATE TABLE IF NOT EXISTS public.weight_entries (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    weight_kg NUMERIC(5, 2) NOT NULL,
    entry_date DATE NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure one weight entry per user per date
    UNIQUE(user_id, entry_date)
);

-- Create Macro Entries table (daily macro totals)
CREATE TABLE IF NOT EXISTS public.macro_entries (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    entry_date DATE NOT NULL,
    calories INTEGER DEFAULT 0,
    protein_g NUMERIC(6, 2) DEFAULT 0,
    carbs_g NUMERIC(6, 2) DEFAULT 0,
    fats_g NUMERIC(6, 2) DEFAULT 0,
    fiber_g NUMERIC(6, 2) DEFAULT 0,
    sugar_g NUMERIC(6, 2) DEFAULT 0,
    sodium_mg NUMERIC(8, 2) DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure one macro entry per user per date
    UNIQUE(user_id, entry_date)
);

-- Create Macro Goals table (user's target macros)
CREATE TABLE IF NOT EXISTS public.macro_goals (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    calories INTEGER NULL,
    protein_g NUMERIC(6, 2) NULL,
    carbs_g NUMERIC(6, 2) NULL,
    fats_g NUMERIC(6, 2) NULL,
    fiber_g NUMERIC(6, 2) NULL,
    is_active BOOLEAN NULL DEFAULT TRUE,
    start_date DATE NULL DEFAULT CURRENT_DATE,
    end_date DATE NULL,
    created_at TIMESTAMP WITH TIME ZONE NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NULL DEFAULT NOW(),
    CONSTRAINT macro_goals_pkey PRIMARY KEY (id),
    CONSTRAINT macro_goals_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE
) TABLESPACE pg_default;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_weight_entries_user ON public.weight_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_weight_entries_date ON public.weight_entries(entry_date);
CREATE INDEX IF NOT EXISTS idx_weight_entries_user_date ON public.weight_entries(user_id, entry_date);

CREATE INDEX IF NOT EXISTS idx_macro_entries_user ON public.macro_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_macro_entries_date ON public.macro_entries(entry_date);
CREATE INDEX IF NOT EXISTS idx_macro_entries_user_date ON public.macro_entries(user_id, entry_date);

CREATE INDEX IF NOT EXISTS idx_macro_goals_user ON public.macro_goals USING btree (user_id) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_macro_goals_active ON public.macro_goals USING btree (user_id, is_active) TABLESPACE pg_default
WHERE (is_active = TRUE);

-- Create partial unique index to ensure only one active goal per user
CREATE UNIQUE INDEX IF NOT EXISTS idx_macro_goals_user_active_unique 
    ON public.macro_goals USING btree (user_id) TABLESPACE pg_default
    WHERE (is_active = TRUE);

-- Enable Row Level Security
ALTER TABLE public.weight_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.macro_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.macro_goals ENABLE ROW LEVEL SECURITY;

-- RLS Policies for Weight Entries
CREATE POLICY "Allow users to view own weight entries" ON public.weight_entries
    FOR SELECT USING (user_id = auth.uid() OR auth.role() = 'authenticated' OR auth.role() = 'anon');

CREATE POLICY "Allow users to manage own weight entries" ON public.weight_entries
    FOR ALL USING (user_id = auth.uid() OR auth.role() = 'authenticated' OR auth.role() = 'anon');

-- RLS Policies for Macro Entries
CREATE POLICY "Allow users to view own macro entries" ON public.macro_entries
    FOR SELECT USING (user_id = auth.uid() OR auth.role() = 'authenticated' OR auth.role() = 'anon');

CREATE POLICY "Allow users to manage own macro entries" ON public.macro_entries
    FOR ALL USING (user_id = auth.uid() OR auth.role() = 'authenticated' OR auth.role() = 'anon');

-- RLS Policies for Macro Goals
CREATE POLICY "Allow users to view own macro goals" ON public.macro_goals
    FOR SELECT USING (user_id = auth.uid() OR auth.role() = 'authenticated' OR auth.role() = 'anon');

CREATE POLICY "Allow users to manage own macro goals" ON public.macro_goals
    FOR ALL USING (user_id = auth.uid() OR auth.role() = 'authenticated' OR auth.role() = 'anon');

-- Grant permissions
GRANT ALL ON public.weight_entries TO anon, authenticated, service_role;
GRANT ALL ON public.macro_entries TO anon, authenticated, service_role;
GRANT ALL ON public.macro_goals TO anon, authenticated, service_role;

-- Create triggers to automatically update updated_at
CREATE TRIGGER update_weight_entries_updated_at
    BEFORE UPDATE ON public.weight_entries
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_macro_entries_updated_at
    BEFORE UPDATE ON public.macro_entries
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_macro_goals_updated_at
    BEFORE UPDATE ON public.macro_goals
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Add comments to tables
COMMENT ON TABLE public.weight_entries IS 'Tracks daily weight entries for users';
COMMENT ON TABLE public.macro_entries IS 'Tracks daily macro totals (calories, protein, carbs, fats) for users';
COMMENT ON TABLE public.macro_goals IS 'Stores user macro goals/targets';

SELECT 'Macro and Weight Tracking tables created successfully with RLS policies' as status;

