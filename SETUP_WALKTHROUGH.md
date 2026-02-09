# Email Setup Walkthrough - Step by Step

## Step 1: Create Resend Account (5 minutes)

1. **Go to Resend**: Open https://resend.com in your browser
2. **Sign Up**: Click "Sign Up" and create a free account
3. **Verify Email**: Check your email and click the verification link
4. **Get API Key**:
   - Once logged in, go to **API Keys** in the left sidebar
   - Click **"Create API Key"** button
   - Name it: `Supabase Edge Function`
   - Click **"Add"**
   - **IMPORTANT**: Copy the API key immediately (you can only see it once!)
   - It will look like: `re_1234567890abcdef...`
   - Save it somewhere safe (you'll need it in Step 3)

## Step 2: Install Supabase CLI (2 minutes)

**On macOS (using Homebrew)** - Run this in your terminal:

```bash
brew install supabase/tap/supabase
```

**On other systems**, see: https://github.com/supabase/cli#install-the-cli

Wait for it to install. You should see a success message.

Verify it's installed:
```bash
supabase --version
```

## Step 3: Login to Supabase (1 minute)

```bash
supabase login
```

This will:
- Open your browser
- Ask you to authorize the CLI
- Once authorized, you'll see "Successfully logged in" in the terminal

## Step 4: Link Your Project (1 minute)

Your Supabase project reference is: `iyywyoasvxxcndnxyiun`

Run this command:

```bash
supabase link --project-ref iyywyoasvxxcndnxyiun
```

You'll be asked to enter your database password. If you don't remember it:
- Go to https://supabase.com/dashboard/project/iyywyoasvxxcndnxyiun/settings/database
- You can reset it there if needed

## Step 5: Set Resend API Key (1 minute)

Replace `your_resend_api_key_here` with the API key you copied from Step 1:

```bash
supabase secrets set RESEND_API_KEY=your_resend_api_key_here
```

**Example** (don't use this, use your actual key):
```bash
supabase secrets set RESEND_API_KEY=re_1234567890abcdefghijklmnop
```

You should see: "Finished supabase secrets set."

## Step 6: Deploy the Edge Function (2 minutes)

```bash
supabase functions deploy send-welcome-email
```

This will:
- Upload the Edge Function code
- Deploy it to Supabase
- Show you a success message with the function URL

You should see something like:
```
Deployed Function send-welcome-email
Function URL: https://iyywyoasvxxcndnxyiun.supabase.co/functions/v1/send-welcome-email
```

## Step 7: Test It! (2 minutes)

1. **Open your app** and go to the Admin Dashboard
2. **Create a new member**:
   - Click "Add User" or "Add Member"
   - Enter a test email (use your own email so you can check it)
   - Enter a first name
   - Click "Create" or "Submit"
3. **Check your email inbox** - you should receive a welcome email within a few seconds!

## Troubleshooting

### If Step 2 fails (npm install):
- Make sure you have Node.js installed: `node --version`
- If not, install from https://nodejs.org

### If Step 3 fails (login):
- Make sure you're logged into Supabase in your browser
- Try: `supabase logout` then `supabase login` again

### If Step 4 fails (link):
- Make sure you have the correct project ref
- Check your Supabase dashboard URL matches: `iyywyoasvxxcndnxyiun`

### If Step 5 fails (secrets):
- Double-check your API key is correct (no extra spaces)
- Make sure you copied the entire key

### If Step 6 fails (deploy):
- Check that the `supabase/functions/send-welcome-email/index.ts` file exists
- Make sure you're in the project root directory

### If emails don't send:
1. **Check logs**:
   ```bash
   supabase functions logs send-welcome-email
   ```
   Look for any error messages

2. **Verify secret is set**:
   ```bash
   supabase secrets list
   ```
   You should see `RESEND_API_KEY` in the list

3. **Test the function directly**:
   ```bash
   curl -X POST https://iyywyoasvxxcndnxyiun.supabase.co/functions/v1/send-welcome-email \
     -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml5eXd5b2Fzdnh4Y25kbnh5aXVuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU5NDQwOTYsImV4cCI6MjA3MTUyMDA5Nn0.G6Bmbqo5O5MnMlPajHPsRedThm7RvloDS6SHcoNKYWs" \
     -H "Content-Type: application/json" \
     -d '{
       "email": "your-email@example.com",
       "firstName": "Test",
       "role": "member",
       "accessCode": "1234567"
     }'
   ```
   Replace `your-email@example.com` with your actual email

## Success Checklist

- ✅ Resend account created
- ✅ API key copied and saved
- ✅ Supabase CLI installed
- ✅ Logged into Supabase
- ✅ Project linked
- ✅ API key set as secret
- ✅ Edge Function deployed
- ✅ Test email received

## What Happens Next?

Once set up, the system will **automatically**:
- Send welcome emails when you create members
- Send welcome emails when you create trainers
- Send welcome emails when you create admins
- Include the access code in each email
- Provide clear login instructions

No additional work needed! Just create users as normal and they'll receive emails automatically.

