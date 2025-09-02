-- Fix RLS policy for trainer code verification
-- Allow anonymous access to trainer codes for verification

-- Drop the existing policy
DROP POLICY IF EXISTS "Allow authenticated users to read trainer codes" ON trainers;

-- Create new policy that allows anonymous access for trainer code verification
CREATE POLICY "Allow trainer code verification" ON trainers
    FOR SELECT USING (true);

-- Also create a policy for admin access
CREATE POLICY "Allow admins to manage trainers" ON trainers
    FOR ALL USING (auth.role() = 'service_role');

-- Grant necessary permissions
GRANT SELECT ON trainers TO anon;
GRANT SELECT ON trainers TO authenticated;
GRANT ALL ON trainers TO service_role;
