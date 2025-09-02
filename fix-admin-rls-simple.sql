-- Fix RLS policy for admin code verification
-- Allow anonymous access to admin codes for verification

-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "Allow authenticated users to read admin codes" ON admins;

-- Create new policy that allows anonymous access for admin code verification
CREATE POLICY "Allow admin code verification" ON admins
    FOR SELECT USING (true);

-- Grant SELECT permission to anonymous users
GRANT SELECT ON admins TO anon;
