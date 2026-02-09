-- Add columns to profiles table for macro calculations and fitness goals
-- Run this in your Supabase SQL Editor if you get "fitness_goals not found" errors

-- Add fitness_goals (array of goal types: weight_loss, maintain, muscle_gain)
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS fitness_goals TEXT[] DEFAULT '{}';

-- Add height_cm if not exists
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS height_cm INTEGER;

-- Add weight_kg if not exists  
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS weight_kg NUMERIC(5, 2);

-- Add comments for clarity
COMMENT ON COLUMN public.profiles.fitness_goals IS 'Array of fitness goals: weight_loss, maintain, muscle_gain';
COMMENT ON COLUMN public.profiles.height_cm IS 'Height in centimeters, used for macro calculations';
COMMENT ON COLUMN public.profiles.weight_kg IS 'Latest weight in kg on profile; macro calcs use weight_entries for most recent';
