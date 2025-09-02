-- Update Existing Users Script for MD Fitness
-- Run this in your Supabase SQL Editor to fix existing users

-- First, let's see what users we have and their metadata
SELECT 
    id,
    email,
    raw_user_meta_data,
    created_at
FROM auth.users
ORDER BY created_at DESC;

-- Update users who don't have first_name and last_name in metadata
-- Extract email prefix as first name (before @ symbol)
UPDATE auth.users 
SET raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || 
    jsonb_build_object(
        'first_name', COALESCE(raw_user_meta_data->>'first_name', SPLIT_PART(email, '@', 1)),
        'last_name', COALESCE(raw_user_meta_data->>'last_name', 'User')
    )
WHERE raw_user_meta_data->>'first_name' IS NULL 
   OR raw_user_meta_data->>'last_name' IS NULL;

-- Create profiles for existing users who don't have them
INSERT INTO public.profiles (id, email, first_name, last_name, created_at, updated_at)
SELECT 
    u.id,
    u.email,
    COALESCE(u.raw_user_meta_data->>'first_name', SPLIT_PART(u.email, '@', 1)) as first_name,
    COALESCE(u.raw_user_meta_data->>'last_name', 'User') as last_name,
    u.created_at,
    NOW() as updated_at
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id
WHERE p.id IS NULL;

-- Show the updated users
SELECT 
    id,
    email,
    raw_user_meta_data,
    created_at
FROM auth.users
ORDER BY created_at DESC;

-- Show all profiles
SELECT 
    id,
    email,
    first_name,
    last_name,
    created_at
FROM public.profiles
ORDER BY created_at DESC;

