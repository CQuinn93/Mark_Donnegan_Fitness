-- Create admin table for MD Fitness
CREATE TABLE IF NOT EXISTS admins (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(10) UNIQUE NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(20),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add Mark as an admin with code 247810
INSERT INTO admins (name, code, email, is_active) 
VALUES ('Mark', '247810', 'mark@mdfitness.com', true)
ON CONFLICT (code) DO UPDATE SET 
    name = EXCLUDED.name,
    email = EXCLUDED.email,
    is_active = EXCLUDED.is_active,
    updated_at = NOW();

-- Create index on code for faster lookups
CREATE INDEX IF NOT EXISTS idx_admins_code ON admins(code);

-- Create index on is_active for filtering active admins
CREATE INDEX IF NOT EXISTS idx_admins_active ON admins(is_active);

-- Add RLS (Row Level Security) policies
ALTER TABLE admins ENABLE ROW LEVEL SECURITY;

-- Policy to allow authenticated users to read admin codes (for verification)
CREATE POLICY "Allow authenticated users to read admin codes" ON admins
    FOR SELECT USING (auth.role() = 'authenticated');

-- Policy to allow only super admins to modify admin table
CREATE POLICY "Allow super admins to modify admin table" ON admins
    FOR ALL USING (auth.role() = 'service_role');

-- Grant necessary permissions
GRANT SELECT ON admins TO authenticated;
GRANT ALL ON admins TO service_role;

-- Add comment to table
COMMENT ON TABLE admins IS 'Admin users table for MD Fitness application';
COMMENT ON COLUMN admins.code IS 'Unique 6-digit code for admin access';
COMMENT ON COLUMN admins.is_active IS 'Whether the admin account is active';
