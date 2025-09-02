-- Fix RLS policy for admin code verification
-- Allow anonymous access to admin codes for verification

-- Drop the existing policy
DROP POLICY IF EXISTS "Allow authenticated users to read admin codes" ON admins;

-- Create new policy that allows anonymous access for admin code verification
CREATE POLICY "Allow admin code verification" ON admins
    FOR SELECT USING (true);

-- Also create a policy for admin management
CREATE POLICY "Allow super admins to modify admin table" ON admins
    FOR ALL USING (auth.role() = 'service_role');

-- Grant necessary permissions
GRANT SELECT ON admins TO anon;
GRANT SELECT ON admins TO authenticated;
GRANT ALL ON admins TO service_role;
