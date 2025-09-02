-- Setup Email Notification System for MD Fitness
-- This file sets up automatic welcome emails for new trainers and members

-- 1. Create email_notifications table
CREATE TABLE IF NOT EXISTS email_notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  recipient_email TEXT NOT NULL,
  recipient_name TEXT,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  notification_type TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  sent_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Add temp_password column to profiles table if it doesn't exist
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS temp_password TEXT;

-- 3. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_email_notifications_status ON email_notifications(status);
CREATE INDEX IF NOT EXISTS idx_email_notifications_type ON email_notifications(notification_type);
CREATE INDEX IF NOT EXISTS idx_email_notifications_created ON email_notifications(created_at);

-- 4. Create trigger function for trainer welcome emails
CREATE OR REPLACE FUNCTION send_trainer_welcome_email()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO email_notifications (
    recipient_email,
    recipient_name,
    subject,
    body,
    notification_type,
    status,
    created_at
  ) VALUES (
    NEW.email,
    NEW.name,
    'Welcome to the MD Fitness Team! 🏋️‍♂️',
    'Hi ' || NEW.name || ',

Welcome to the MD Fitness team! We''re excited to have you on board.

Your unique trainer code is: **' || NEW.code || '**

Please use this code to access your trainer dashboard. You can log in by:
1. Going to the MD Fitness app
2. Tapping the logo 4 times to activate trainer mode
3. Entering your unique code: ' || NEW.code || '

If you have any questions or need assistance, please don''t hesitate to reach out.

Welcome aboard!

Best regards,
The MD Fitness Team',
    'trainer_welcome',
    'pending',
    NOW()
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. Create trigger function for member welcome emails
CREATE OR REPLACE FUNCTION send_member_welcome_email()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO email_notifications (
    recipient_email,
    recipient_name,
    subject,
    body,
    notification_type,
    status,
    created_at
  ) VALUES (
    NEW.email,
    NEW.first_name,
    'Your MD Fitness Journey Begins Now! 🎯',
    'Hi ' || NEW.first_name || ',

Welcome to MD Fitness! Your fitness journey starts today.

Your temporary password is: **' || COALESCE(NEW.temp_password, 'Contact admin for password') || '**

Please log in with your email and this temporary password. You''ll be prompted to:
1. Change your password to something secure
2. Complete your profile information

Important: Please change your password on first login for security.

If you have any questions or need assistance, please don''t hesitate to reach out.

Let''s get started on your fitness goals!

Best regards,
The MD Fitness Team',
    'member_welcome',
    'pending',
    NOW()
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6. Create triggers
DROP TRIGGER IF EXISTS trigger_send_trainer_welcome_email ON trainers;
CREATE TRIGGER trigger_send_trainer_welcome_email
  AFTER INSERT ON trainers
  FOR EACH ROW
  EXECUTE FUNCTION send_trainer_welcome_email();

DROP TRIGGER IF EXISTS trigger_send_member_welcome_email ON profiles;
CREATE TRIGGER trigger_send_member_welcome_email
  AFTER INSERT ON profiles
  FOR EACH ROW
  WHEN (NEW.role = 'member')
  EXECUTE FUNCTION send_member_welcome_email();

-- 7. Create function to manually send emails (for testing)
CREATE OR REPLACE FUNCTION send_test_email(
  p_email TEXT,
  p_name TEXT,
  p_type TEXT DEFAULT 'test'
)
RETURNS TEXT AS $$
BEGIN
  INSERT INTO email_notifications (
    recipient_email,
    recipient_name,
    subject,
    body,
    notification_type,
    status,
    created_at
  ) VALUES (
    p_email,
    p_name,
    'Test Email from MD Fitness',
    'Hi ' || p_name || ',

This is a test email to verify the email notification system is working.

Best regards,
MD Fitness Team',
    p_type,
    'pending',
    NOW()
  );
  
  RETURN 'Test email queued for: ' || p_email;
END;
$$ LANGUAGE plpgsql;

-- 8. Grant necessary permissions (adjust as needed for your setup)
-- GRANT EXECUTE ON FUNCTION send_trainer_welcome_email() TO authenticated;
-- GRANT EXECUTE ON FUNCTION send_member_welcome_email() TO authenticated;
-- GRANT EXECUTE ON FUNCTION send_test_email(TEXT, TEXT, TEXT) TO authenticated;

-- 9. Create a view to monitor email notifications
CREATE OR REPLACE VIEW email_notifications_summary AS
SELECT 
  notification_type,
  status,
  COUNT(*) as count,
  MIN(created_at) as oldest_pending,
  MAX(created_at) as newest_pending
FROM email_notifications 
GROUP BY notification_type, status
ORDER BY notification_type, status;

-- 10. Insert a sample notification for testing (optional)
-- INSERT INTO email_notifications (recipient_email, recipient_name, subject, body, notification_type, status)
-- VALUES ('test@example.com', 'Test User', 'Test Subject', 'Test body content', 'test', 'pending');

-- Display setup completion message
SELECT 'Email notification system setup complete!' as status;


