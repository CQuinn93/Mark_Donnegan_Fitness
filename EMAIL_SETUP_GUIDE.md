owards the yop # Free Email Setup Guide - Resend + Supabase Edge Functions

This guide will help you set up a **completely free** email system to send welcome emails when users are created.

## Free Tier Limits

- **Resend**: 3,000 emails/month free
- **Supabase Edge Functions**: 500,000 invocations/month free
- **Total Cost**: $0/month (as long as you stay under limits)

## Step 1: Create Resend Account

1. Go to [https://resend.com](https://resend.com)
2. Sign up for a free account
3. Verify your email address
4. Go to **API Keys** in the dashboard
5. Click **Create API Key**
6. Name it "Supabase Edge Function" and copy the key (you'll need this in Step 3)

## Step 2: Verify Your Domain (Optional but Recommended)

For production, you should verify your domain:
1. In Resend dashboard, go to **Domains**
2. Click **Add Domain**
3. Follow the DNS setup instructions
4. Once verified, update the `from` field in the Edge Function

**Note**: For testing, you can use `onboarding@resend.dev` (already configured in the code)

## Step 3: Deploy Supabase Edge Function

1. **Install Supabase CLI** (if not already installed):
   ```bash
   npm install -g supabase
   ```

2. **Login to Supabase**:
   ```bash
   supabase login
   ```

3. **Link your project**:
   ```bash
   supabase link --project-ref your-project-ref
   ```
   (Find your project ref in Supabase dashboard URL: `https://supabase.com/dashboard/project/[PROJECT_REF]`)

4. **Set the Resend API Key as a secret**:
   ```bash
   supabase secrets set RESEND_API_KEY=your_resend_api_key_here
   ```

5. **Deploy the Edge Function**:
   ```bash
   supabase functions deploy send-welcome-email
   ```

## Step 4: Update Your Code

The Edge Function is now ready! The `createUser` function in `src/services/api.ts` will be updated to call this Edge Function after user creation.

## Step 5: Test the System

1. Create a new user through the admin panel
2. Check the user's email inbox
3. Verify the welcome email was received

## Troubleshooting

### Emails not sending?

1. **Check Edge Function logs**:
   ```bash
   supabase functions logs send-welcome-email
   ```

2. **Verify API key is set**:
   ```bash
   supabase secrets list
   ```

3. **Test the Edge Function directly**:
   ```bash
   curl -X POST https://[YOUR_PROJECT_REF].supabase.co/functions/v1/send-welcome-email \
     -H "Authorization: Bearer [YOUR_ANON_KEY]" \
     -H "Content-Type: application/json" \
     -d '{
       "email": "test@example.com",
       "firstName": "Test",
       "role": "member",
       "accessCode": "1234567"
     }'
   ```

### Rate Limits

- Resend free tier: 3,000 emails/month
- If you exceed this, you'll need to upgrade to a paid plan ($20/month for 50,000 emails)

## Alternative Free Options

If Resend doesn't work for you, here are other free options:

1. **SendGrid**: 100 emails/day free (3,000/month)
2. **Mailgun**: 5,000 emails/month free (first 3 months, then 1,000/month)
3. **Brevo (formerly Sendinblue)**: 300 emails/day free

The Edge Function can be easily modified to use any of these services.

## Next Steps

After setup, the system will automatically:
- ✅ Send welcome emails when members are created
- ✅ Send welcome emails when trainers are created  
- ✅ Send welcome emails when admins are created
- ✅ Include access codes in the emails
- ✅ Provide clear login instructions

No additional code changes needed once the Edge Function is deployed!


