-- Add activity_type column to macro_entries table
-- This allows users to select daily activity (Cardio, Weight, Mix, Rest)
-- and adjust their macro goals accordingly

ALTER TABLE public.macro_entries 
ADD COLUMN IF NOT EXISTS activity_type VARCHAR(20) DEFAULT 'rest' CHECK (activity_type IN ('cardio', 'weight', 'mix', 'rest'));

-- Add comment to explain the column
COMMENT ON COLUMN public.macro_entries.activity_type IS 'Daily activity type: cardio, weight, mix, or rest. Used to adjust macro goals.';

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_macro_entries_activity_type ON public.macro_entries(user_id, entry_date, activity_type);

SELECT 'Activity type column added successfully to macro_entries table' as status;

