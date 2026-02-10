-- Add test admin for Apple App Store review and beta testing
-- Run this in Supabase SQL Editor
-- Admin code: 123456 (for reviewers to access admin features)

INSERT INTO public.admins (name, code, email, is_active) 
VALUES ('Test Admin', '123456', 'test@mdfitness.com', true)
ON CONFLICT (code) DO UPDATE SET 
    name = EXCLUDED.name,
    email = EXCLUDED.email,
    is_active = EXCLUDED.is_active,
    updated_at = NOW();
