-- Create trainers table for MD Fitness
CREATE TABLE IF NOT EXISTS trainers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(10) UNIQUE NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(20),
    bio TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add some example trainers (you can modify these)
INSERT INTO trainers (name, code, email, is_active) 
VALUES 
    ('Sarah Johnson', '123456', 'sarah@mdfitness.com', true),
    ('Mike Chen', '789012', 'mike@mdfitness.com', true),
    ('Emma Davis', '345678', 'emma@mdfitness.com', true)
ON CONFLICT (code) DO UPDATE SET 
    name = EXCLUDED.name,
    email = EXCLUDED.email,
    is_active = EXCLUDED.is_active,
    updated_at = NOW();

-- Create index on code for faster lookups
CREATE INDEX IF NOT EXISTS idx_trainers_code ON trainers(code);

-- Create index on is_active for filtering active trainers
CREATE INDEX IF NOT EXISTS idx_trainers_active ON trainers(is_active);

-- Add RLS (Row Level Security) policies
ALTER TABLE trainers ENABLE ROW LEVEL SECURITY;

-- Policy to allow authenticated users to read trainer codes (for verification)
CREATE POLICY "Allow authenticated users to read trainer codes" ON trainers
    FOR SELECT USING (auth.role() = 'authenticated');

-- Policy to allow only admins to modify trainer table
CREATE POLICY "Allow admins to modify trainer table" ON trainers
    FOR ALL USING (auth.role() = 'service_role');

-- Grant necessary permissions
GRANT SELECT ON trainers TO authenticated;
GRANT ALL ON trainers TO service_role;

-- Add comment to table
COMMENT ON TABLE trainers IS 'Trainer users table for MD Fitness application';
COMMENT ON COLUMN trainers.code IS 'Unique 6-digit code for trainer access';
COMMENT ON COLUMN trainers.is_active IS 'Whether the trainer account is active';
