-- Load Mock Classes for Next 2 Weeks
-- This script creates class schedules for the next 2 weeks
-- 10 classes per day (except Sundays which only have Running)
-- Same classes repeat for week 2
-- All classes are assigned to Mark (the trainer)

-- Step 1: Get Mark's trainer ID and existing class IDs
DO $$
DECLARE
  mark_trainer_id UUID;
  -- All class IDs
  bars_bands_id UUID := '0aed05ee-f48a-4797-b5b1-75dd8703e398';
  strength_id UUID := '16ebd9c0-4a3e-4869-9cce-c7e1925c1656';
  hiit_id UUID := '33a74b40-0dc8-45f5-b490-093463ed575e';
  cardio_blast_id UUID := '3b759ea2-5300-42f5-93b6-d17b9179bc70';
  crossfit_id UUID := '41ce4fef-8299-4b0c-ad26-cb1cace492e4';
  yoga_flow_id UUID := '4768ec3b-641f-48e7-8672-2409f032de01';
  strength_training_id UUID := '4a74f372-5ef9-4aaf-99a5-f31f7a54109d';
  strength_conditioning_id UUID := '551e85cc-eefc-4d61-bf4a-41970ac3e8ff';
  circuit_id UUID := '8bdab9bd-d7f2-4243-aab6-5fa3de1a0e92';
  pilates_id UUID := '8ceb7d30-a17f-4a7b-ba81-dc7e5365ef12';
  plyometrics_id UUID := '9b851569-6f53-4bf3-881a-a8cb7b454401';
  boxfit_id UUID := 'ac15847a-a801-4a95-aaad-82ec436e0293';
  trx_id UUID := 'c0dc1aba-b557-4a4a-8576-efac56af217b';
  running_id UUID := 'cfdad0a7-dd65-41e2-b919-ce116e98c0bf';
  hyrox_id UUID := 'f24f516f-7da0-449c-997f-b57ecc044c5f';
  
  current_date_var DATE;
  schedule_date DATE;
  day_of_week INTEGER;
  class_1_id UUID;
  class_2_id UUID;
  class_3_id UUID;
  class_4_id UUID;
  class_5_id UUID;
  class_6_id UUID;
  class_7_id UUID;
  class_8_id UUID;
  class_9_id UUID;
  class_10_id UUID;
BEGIN
  -- Find Mark's trainer ID
  SELECT id INTO mark_trainer_id
  FROM profiles
  WHERE role = 'trainer' AND first_name ILIKE '%mark%'
  LIMIT 1;

  IF mark_trainer_id IS NULL THEN
    RAISE EXCEPTION 'Mark (trainer) not found in profiles table. Please ensure Mark exists as a trainer.';
  END IF;

  RAISE NOTICE 'Found trainer Mark with ID: %', mark_trainer_id;
  RAISE NOTICE 'Using existing class templates from database';

  -- Step 2: Generate schedules for next 2 weeks
  current_date_var := CURRENT_DATE;
  
  -- Loop through next 14 days
  FOR day_offset IN 0..13 LOOP
    schedule_date := current_date_var + (day_offset || ' days')::INTERVAL;
    day_of_week := EXTRACT(DOW FROM schedule_date);
    
    -- Check if it's Sunday (day of week: 0 = Sunday, 6 = Saturday)
    IF day_of_week = 0 THEN
      -- Sunday: Only Running at 9:00 AM
      INSERT INTO class_schedules (
        class_id,
        trainer_id,
        scheduled_date,
        scheduled_time,
        difficulty_level,
        location,
        max_bookings,
        current_bookings,
        status
      ) VALUES (
        running_id,
        mark_trainer_id,
        schedule_date,
        '09:00:00',
        'all_levels',
        'park',
        999,
        0,
        'active'
      );
      
      RAISE NOTICE 'Created Running for %', schedule_date;
    ELSE
      -- Other days: 10 classes throughout the day
      -- Rotate classes based on day of week for variety
      -- Same classes repeat for week 2
      -- Monday (1): Yoga Flow, Strength Training, HIIT, Cardio Blast, Boxfit, Pilates, Strength, Circuit, TRX, CrossFit
      -- Tuesday (2): Pilates, Strength, Circuit, TRX, CrossFit, Yoga Flow, Strength & Conditioning, HIIT, Plyometrics, Boxfit
      -- Wednesday (3): Yoga Flow, Strength & Conditioning, HIIT, Plyometrics, Boxfit, Pilates, Bars & Bands, Circuit, Cardio Blast, TRX
      -- Thursday (4): Pilates, Bars & Bands, Circuit, Cardio Blast, TRX, Yoga Flow, Strength Training, HIIT, Hyrox, Boxfit
      -- Friday (5): Yoga Flow, Strength Training, HIIT, Hyrox, Boxfit, Pilates, Strength & Conditioning, Circuit, Cardio Blast, CrossFit
      -- Saturday (6): Pilates, Strength & Conditioning, Circuit, Cardio Blast, CrossFit, Yoga Flow, Strength Training, HIIT, Cardio Blast, Boxfit
      
      CASE day_of_week
        WHEN 1 THEN -- Monday
          class_1_id := yoga_flow_id;
          class_2_id := strength_training_id;
          class_3_id := hiit_id;
          class_4_id := cardio_blast_id;
          class_5_id := boxfit_id;
        WHEN 2 THEN -- Tuesday
          class_1_id := pilates_id;
          class_2_id := strength_id;
          class_3_id := circuit_id;
          class_4_id := trx_id;
          class_5_id := crossfit_id;
        WHEN 3 THEN -- Wednesday
          class_1_id := yoga_flow_id;
          class_2_id := strength_conditioning_id;
          class_3_id := hiit_id;
          class_4_id := plyometrics_id;
          class_5_id := boxfit_id;
        WHEN 4 THEN -- Thursday
          class_1_id := pilates_id;
          class_2_id := bars_bands_id;
          class_3_id := circuit_id;
          class_4_id := cardio_blast_id;
          class_5_id := trx_id;
        WHEN 5 THEN -- Friday
          class_1_id := yoga_flow_id;
          class_2_id := strength_training_id;
          class_3_id := hiit_id;
          class_4_id := hyrox_id;
          class_5_id := boxfit_id;
        WHEN 6 THEN -- Saturday
          class_1_id := pilates_id;
          class_2_id := strength_conditioning_id;
          class_3_id := circuit_id;
          class_4_id := cardio_blast_id;
          class_5_id := crossfit_id;
        ELSE
          -- Fallback (shouldn't happen)
          class_1_id := yoga_flow_id;
          class_2_id := strength_training_id;
          class_3_id := hiit_id;
          class_4_id := cardio_blast_id;
          class_5_id := boxfit_id;
      END CASE;
      
      -- Set additional 5 classes (6-10) based on day
      CASE day_of_week
        WHEN 1 THEN -- Monday: Add Pilates, Strength, Circuit, TRX, CrossFit
          class_6_id := pilates_id;
          class_7_id := strength_id;
          class_8_id := circuit_id;
          class_9_id := trx_id;
          class_10_id := crossfit_id;
        WHEN 2 THEN -- Tuesday: Add Yoga Flow, Strength & Conditioning, HIIT, Plyometrics, Boxfit
          class_6_id := yoga_flow_id;
          class_7_id := strength_conditioning_id;
          class_8_id := hiit_id;
          class_9_id := plyometrics_id;
          class_10_id := boxfit_id;
        WHEN 3 THEN -- Wednesday: Add Pilates, Bars & Bands, Circuit, Cardio Blast, TRX
          class_6_id := pilates_id;
          class_7_id := bars_bands_id;
          class_8_id := circuit_id;
          class_9_id := cardio_blast_id;
          class_10_id := trx_id;
        WHEN 4 THEN -- Thursday: Add Yoga Flow, Strength Training, HIIT, Hyrox, Boxfit
          class_6_id := yoga_flow_id;
          class_7_id := strength_training_id;
          class_8_id := hiit_id;
          class_9_id := hyrox_id;
          class_10_id := boxfit_id;
        WHEN 5 THEN -- Friday: Add Pilates, Strength & Conditioning, Circuit, Cardio Blast, CrossFit
          class_6_id := pilates_id;
          class_7_id := strength_conditioning_id;
          class_8_id := circuit_id;
          class_9_id := cardio_blast_id;
          class_10_id := crossfit_id;
        WHEN 6 THEN -- Saturday: Add Yoga Flow, Strength Training, HIIT, Cardio Blast, Boxfit
          class_6_id := yoga_flow_id;
          class_7_id := strength_training_id;
          class_8_id := hiit_id;
          class_9_id := cardio_blast_id;
          class_10_id := boxfit_id;
        ELSE
          class_6_id := pilates_id;
          class_7_id := strength_id;
          class_8_id := circuit_id;
          class_9_id := trx_id;
          class_10_id := crossfit_id;
      END CASE;

      -- Class 1: 7:00 AM
      INSERT INTO class_schedules (
        class_id,
        trainer_id,
        scheduled_date,
        scheduled_time,
        difficulty_level,
        location,
        max_bookings,
        current_bookings,
        status
      ) VALUES (
        class_1_id,
        mark_trainer_id,
        schedule_date,
        '07:00:00',
        'beginner',
        'gym',
        10,
        0,
        'active'
      );

      -- Class 2: 9:00 AM
      INSERT INTO class_schedules (
        class_id,
        trainer_id,
        scheduled_date,
        scheduled_time,
        difficulty_level,
        location,
        max_bookings,
        current_bookings,
        status
      ) VALUES (
        class_2_id,
        mark_trainer_id,
        schedule_date,
        '09:00:00',
        'intermediate',
        'gym',
        10,
        0,
        'active'
      );

      -- Class 3: 12:00 PM
      INSERT INTO class_schedules (
        class_id,
        trainer_id,
        scheduled_date,
        scheduled_time,
        difficulty_level,
        location,
        max_bookings,
        current_bookings,
        status
      ) VALUES (
        class_3_id,
        mark_trainer_id,
        schedule_date,
        '12:00:00',
        'all_levels',
        'gym',
        10,
        0,
        'active'
      );

      -- Class 4: 5:00 PM
      INSERT INTO class_schedules (
        class_id,
        trainer_id,
        scheduled_date,
        scheduled_time,
        difficulty_level,
        location,
        max_bookings,
        current_bookings,
        status
      ) VALUES (
        class_4_id,
        mark_trainer_id,
        schedule_date,
        '17:00:00',
        'intermediate',
        'gym',
        10,
        0,
        'active'
      );

      -- Class 5: 6:30 PM
      INSERT INTO class_schedules (
        class_id,
        trainer_id,
        scheduled_date,
        scheduled_time,
        difficulty_level,
        location,
        max_bookings,
        current_bookings,
        status
      ) VALUES (
        class_5_id,
        mark_trainer_id,
        schedule_date,
        '18:30:00',
        'advanced',
        'gym',
        10,
        0,
        'active'
      );

      -- Class 6: 8:00 AM
      INSERT INTO class_schedules (
        class_id,
        trainer_id,
        scheduled_date,
        scheduled_time,
        difficulty_level,
        location,
        max_bookings,
        current_bookings,
        status
      ) VALUES (
        class_6_id,
        mark_trainer_id,
        schedule_date,
        '08:00:00',
        'beginner',
        'gym',
        10,
        0,
        'active'
      );

      -- Class 7: 10:00 AM
      INSERT INTO class_schedules (
        class_id,
        trainer_id,
        scheduled_date,
        scheduled_time,
        difficulty_level,
        location,
        max_bookings,
        current_bookings,
        status
      ) VALUES (
        class_7_id,
        mark_trainer_id,
        schedule_date,
        '10:00:00',
        'intermediate',
        'gym',
        10,
        0,
        'active'
      );

      -- Class 8: 1:00 PM
      INSERT INTO class_schedules (
        class_id,
        trainer_id,
        scheduled_date,
        scheduled_time,
        difficulty_level,
        location,
        max_bookings,
        current_bookings,
        status
      ) VALUES (
        class_8_id,
        mark_trainer_id,
        schedule_date,
        '13:00:00',
        'all_levels',
        'gym',
        10,
        0,
        'active'
      );

      -- Class 9: 4:00 PM
      INSERT INTO class_schedules (
        class_id,
        trainer_id,
        scheduled_date,
        scheduled_time,
        difficulty_level,
        location,
        max_bookings,
        current_bookings,
        status
      ) VALUES (
        class_9_id,
        mark_trainer_id,
        schedule_date,
        '16:00:00',
        'intermediate',
        'gym',
        10,
        0,
        'active'
      );

      -- Class 10: 7:30 PM
      INSERT INTO class_schedules (
        class_id,
        trainer_id,
        scheduled_date,
        scheduled_time,
        difficulty_level,
        location,
        max_bookings,
        current_bookings,
        status
      ) VALUES (
        class_10_id,
        mark_trainer_id,
        schedule_date,
        '19:30:00',
        'advanced',
        'gym',
        10,
        0,
        'active'
      );

      RAISE NOTICE 'Created 10 classes for % (day of week: %)', schedule_date, day_of_week;
    END IF;
  END LOOP;

  RAISE NOTICE 'Successfully created class schedules for the next 2 weeks!';
END $$;

-- Verify the data
SELECT 
  scheduled_date,
  TO_CHAR(scheduled_date, 'Day') as day_name,
  COUNT(*) as class_count,
  STRING_AGG(c.name || ' at ' || cs.scheduled_time::TEXT, ', ' ORDER BY cs.scheduled_time) as classes
FROM class_schedules cs
JOIN classes c ON cs.class_id = c.id
WHERE cs.scheduled_date >= CURRENT_DATE 
  AND cs.scheduled_date < CURRENT_DATE + INTERVAL '14 days'
GROUP BY scheduled_date
ORDER BY scheduled_date;
