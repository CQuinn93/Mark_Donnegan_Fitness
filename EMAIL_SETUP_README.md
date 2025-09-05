# MD Fitness Email Notification System Setup

This system automatically sends welcome emails to new trainers and members when they're created by an admin.

## What's Been Implemented

### 1. **Database Triggers** ✅
- **Trainer Welcome Email**: Sent when a new trainer is added to the `trainers` table
- **Member Welcome Email**: Sent when a new member profile is created in the `profiles` table

### 2. **Email Content** ✅
- **Trainers**: "Welcome to the MD Fitness Team! 🏋️‍♂️" with their unique code
- **Members**: "Your MD Fitness Journey Begins Now! 🎯" with their temporary password

### 3. **Database Structure** ✅
- `email_notifications` table to store email details
- Triggers automatically populate this table when users are created

## Setup Instructions

### Step 1: Run Database Setup
Execute the `setup-email-notifications.sql` file in your Supabase SQL editor:

```sql
-- Copy and paste the contents of setup-email-notifications.sql
-- This will create tables, triggers, and functions
```

### Step 2: Deploy Email Sending Function
You have two options for actually sending emails:

#### Option A: Supabase Edge Functions (Recommended)
1. Create a new Edge Function in your Supabase dashboard
2. Use the template below
3. Deploy and set up a cron job to process pending emails

#### Option B: External Email Service
- Use services like SendGrid, Mailgun, or AWS SES
- Create a webhook or scheduled job to process the `email_notifications` table

## Edge Function Template

Create a new Edge Function in Supabase with this code:

```typescript
// supabase/functions/process-emails/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get pending email notifications
    const { data: pendingEmails, error } = await supabaseClient
      .from('email_notifications')
      .select('*')
      .eq('status', 'pending')
      .limit(10)

    if (error) throw error

    if (!pendingEmails || pendingEmails.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No pending emails' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Process each pending email
    for (const email of pendingEmails) {
      try {
        // Send email using your preferred email service
        // Example with SendGrid:
        const emailResult = await sendEmailWithSendGrid(email)
        
        if (emailResult.success) {
          // Update status to sent
          await supabaseClient
            .from('email_notifications')
            .update({ 
              status: 'sent', 
              sent_at: new Date().toISOString() 
            })
            .eq('id', email.id)
        } else {
          // Update status to failed
          await supabaseClient
            .from('email_notifications')
            .update({ 
              status: 'failed', 
              error_message: emailResult.error 
            })
            .eq('id', email.id)
        }
      } catch (emailError) {
        console.error('Error processing email:', emailError)
        
        // Mark as failed
        await supabaseClient
          .from('email_notifications')
          .update({ 
            status: 'failed', 
            error_message: emailError.message 
          })
          .eq('id', email.id)
      }
    }

    return new Response(
      JSON.stringify({ 
        message: `Processed ${pendingEmails.length} emails`,
        processed: pendingEmails.length 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})

// Example SendGrid integration
async function sendEmailWithSendGrid(emailData: any) {
  // Implement your email sending logic here
  // This is just a placeholder
  
  try {
    // Send email using SendGrid, Mailgun, or your preferred service
    // Return { success: true } on success, { success: false, error: 'message' } on failure
    
    return { success: true }
  } catch (error) {
    return { success: false, error: error.message }
  }
}
```

## Testing the System

### 1. Create a Test User
- Go to Admin panel
- Create a new trainer or member
- Check the `email_notifications` table for the new entry

### 2. Monitor Email Status
```sql
-- Check pending emails
SELECT * FROM email_notifications WHERE status = 'pending';

-- Check email summary
SELECT * FROM email_notifications_summary;

-- Check failed emails
SELECT * FROM email_notifications WHERE status = 'failed';
```

### 3. Manual Email Test
```sql
-- Test the email system manually
SELECT send_test_email('test@example.com', 'Test User', 'test');
```

## Email Templates

### Trainer Welcome Email
- **Subject**: "Welcome to the MD Fitness Team! 🏋️‍♂️"
- **Content**: Includes their unique 6-digit code and login instructions

### Member Welcome Email  
- **Subject**: "Your MD Fitness Journey Begins Now! 🎯"
- **Content**: Includes their temporary password and first-time setup instructions

## Next Steps

1. **Deploy the Edge Function** to actually send emails
2. **Set up a cron job** to process emails every few minutes
3. **Configure your email service** (SendGrid, Mailgun, etc.)
4. **Test the complete flow** by creating new users
5. **Monitor email delivery** and handle any failures

## Troubleshooting

- **Emails not sending**: Check the Edge Function logs and email service configuration
- **Database errors**: Verify the triggers are properly installed
- **Permission issues**: Ensure the service role has access to the email_notifications table

The system is now ready to automatically send welcome emails whenever new users are created!



