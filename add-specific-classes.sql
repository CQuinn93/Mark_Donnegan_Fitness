-- Add specific classes for MD Fitness
-- Run this in your Supabase SQL Editor

-- Insert the specific classes with descriptions
INSERT INTO public.classes (name, description, duration, max_members) VALUES
('Strength & Conditioning', 'A comprehensive workout combining strength training with conditioning exercises to build power and endurance', 60, 10),
('Strength', 'Focused strength training using weights and resistance to build muscle mass and increase overall strength', 60, 10),
('Hyrox', 'High-intensity functional fitness combining running with functional movements for ultimate endurance challenge', 60, 10),
('Plyometrics', 'Explosive jumping and bounding exercises to develop power, speed, and athletic performance', 45, 10),
('Boxfit', 'Boxing-inspired fitness class combining cardio, strength, and technique for a full-body workout', 50, 10),
('Bars & Bands', 'Resistance training using barbells, dumbbells, and resistance bands for strength and muscle building', 60, 10),
('Circuit', 'High-energy circuit training moving between different exercise stations for maximum calorie burn', 45, 10),
('TRX', 'Suspension training using TRX straps to build strength, stability, and flexibility using body weight', 50, 10),
('Running', 'Outdoor running sessions in the park focusing on endurance, speed, and technique improvement', 60, 999); -- Unlimited capacity

-- Verify the classes were added
SELECT 
    name,
    description,
    duration,
    max_members,
    created_at
FROM public.classes 
ORDER BY name;

SELECT 'Specific classes added successfully' as status;
