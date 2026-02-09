// Supabase Edge Function to send welcome emails using Resend
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface EmailRequest {
  email: string;
  firstName: string;
  role: 'member' | 'trainer' | 'admin';
  accessCode: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { email, firstName, role, accessCode }: EmailRequest = await req.json()

    if (!email || !firstName || !role || !accessCode) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Get Resend API key from environment
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
    if (!RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY not configured')
    }

    // Determine email content based on role
    let subject: string
    let htmlContent: string

    if (role === 'member') {
      subject = 'Welcome to Mark Donnegan Fitness! 🎯'
      htmlContent = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background-color: #000; color: #fff; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
              <h1 style="margin: 0;">Mark Donnegan Fitness</h1>
            </div>
            <div style="background-color: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px;">
              <h2 style="color: #000; margin-top: 0;">Welcome, ${firstName}! 🎯</h2>
              <p>Your fitness journey begins now! We're excited to have you join the Mark Donnegan Fitness community.</p>
              
              <div style="background-color: #fff; border: 2px solid #000; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center;">
                <p style="margin: 0 0 10px 0; font-size: 14px; color: #666;">Your 7-Digit Access Code:</p>
                <p style="font-size: 32px; font-weight: bold; color: #000; margin: 0; letter-spacing: 4px;">${accessCode}</p>
              </div>
              
              <p><strong>Next Steps:</strong></p>
              <ol>
                <li>Download the Mark Donnegan Fitness mobile app</li>
                <li>Open the app and tap "Login"</li>
                <li>Enter your email: <strong>${email}</strong></li>
                <li>Enter your access code: <strong>${accessCode}</strong></li>
                <li>You'll be prompted to create your password and complete your profile</li>
              </ol>
              
              <p style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; color: #666; font-size: 14px;">
                If you have any questions, please don't hesitate to reach out to us.
              </p>
              <p style="color: #666; font-size: 14px; margin: 0;">
                Welcome to the team!<br>
                <strong>Mark Donnegan Fitness</strong>
              </p>
            </div>
          </body>
        </html>
      `
    } else if (role === 'trainer') {
      subject = 'Welcome to the Mark Donnegan Fitness Team! 🏋️‍♂️'
      htmlContent = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background-color: #000; color: #fff; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
              <h1 style="margin: 0;">Mark Donnegan Fitness</h1>
            </div>
            <div style="background-color: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px;">
              <h2 style="color: #000; margin-top: 0;">Welcome to the Team, ${firstName}! 🏋️‍♂️</h2>
              <p>We're thrilled to have you join the Mark Donnegan Fitness team as a trainer!</p>
              
              <div style="background-color: #fff; border: 2px solid #000; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center;">
                <p style="margin: 0 0 10px 0; font-size: 14px; color: #666;">Your 6-Digit Access Code:</p>
                <p style="font-size: 32px; font-weight: bold; color: #000; margin: 0; letter-spacing: 4px;">${accessCode}</p>
              </div>
              
              <p><strong>Getting Started:</strong></p>
              <ol>
                <li>Download the Mark Donnegan Fitness mobile app</li>
                <li>Open the app and tap "Login"</li>
                <li>Enter your email: <strong>${email}</strong></li>
                <li>Enter your access code: <strong>${accessCode}</strong></li>
                <li>You'll be prompted to create your password and access the trainer dashboard</li>
              </ol>
              
              <p style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; color: #666; font-size: 14px;">
                If you have any questions, please contact the admin team.
              </p>
              <p style="color: #666; font-size: 14px; margin: 0;">
                Welcome aboard!<br>
                <strong>Mark Donnegan Fitness</strong>
              </p>
            </div>
          </body>
        </html>
      `
    } else {
      // Admin
      subject = 'Welcome to Mark Donnegan Fitness Admin! 👨‍💼'
      htmlContent = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background-color: #000; color: #fff; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
              <h1 style="margin: 0;">Mark Donnegan Fitness</h1>
            </div>
            <div style="background-color: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px;">
              <h2 style="color: #000; margin-top: 0;">Welcome, ${firstName}! 👨‍💼</h2>
              <p>Your admin account has been created for Mark Donnegan Fitness.</p>
              
              <div style="background-color: #fff; border: 2px solid #000; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center;">
                <p style="margin: 0 0 10px 0; font-size: 14px; color: #666;">Your 6-Digit Access Code:</p>
                <p style="font-size: 32px; font-weight: bold; color: #000; margin: 0; letter-spacing: 4px;">${accessCode}</p>
              </div>
              
              <p><strong>Getting Started:</strong></p>
              <ol>
                <li>Download the Mark Donnegan Fitness mobile app</li>
                <li>Open the app and tap "Login"</li>
                <li>Enter your email: <strong>${email}</strong></li>
                <li>Enter your access code: <strong>${accessCode}</strong></li>
                <li>You'll be prompted to create your password and access the admin dashboard</li>
              </ol>
              
              <p style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; color: #666; font-size: 14px;">
                If you have any questions, please contact support.
              </p>
              <p style="color: #666; font-size: 14px; margin: 0;">
                Welcome!<br>
                <strong>Mark Donnegan Fitness</strong>
              </p>
            </div>
          </body>
        </html>
      `
    }

    // Send email via Resend API
    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Mark Donnegan Fitness <onboarding@resend.dev>', // Update with your verified domain
        to: email,
        subject: subject,
        html: htmlContent,
      }),
    })

    if (!resendResponse.ok) {
      const errorData = await resendResponse.json()
      throw new Error(`Resend API error: ${JSON.stringify(errorData)}`)
    }

    const result = await resendResponse.json()

    return new Response(
      JSON.stringify({ 
        success: true,
        messageId: result.id,
        message: 'Email sent successfully'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error sending email:', error)
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Failed to send email',
        success: false
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})

