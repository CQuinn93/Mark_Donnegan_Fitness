-- Update the difficulty_level check constraint to include 'all_levels'
ALTER TABLE public.class_schedules 
DROP CONSTRAINT IF EXISTS class_schedules_difficulty_level_check;

ALTER TABLE public.class_schedules 
ADD CONSTRAINT class_schedules_difficulty_level_check 
CHECK (difficulty_level IN ('beginner', 'intermediate', 'advanced', 'all_levels'));
