#!/usr/bin/env node

/**
 * Script to automatically update class statuses based on time
 * - Sets status to 'ongoing' when class start time is reached
 * - Sets status to 'completed' when class duration has passed
 * This script is designed to run frequently (every 5-15 minutes)
 */

console.log('🚀 Starting update-class-statuses.js script...');
console.log('📁 Current working directory:', process.cwd());
console.log('📄 Script file path:', __filename);

const axios = require('axios');

// Supabase configuration
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://iyywyoasvxxcndnxyiun.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_SERVICE_KEY) {
  console.error('❌ SUPABASE_SERVICE_KEY environment variable is required');
  process.exit(1);
}

// Create axios instance for Supabase REST API with service role key
const supabaseApi = axios.create({
  baseURL: `${SUPABASE_URL}/rest/v1`,
  headers: {
    'apikey': SUPABASE_SERVICE_KEY,
    'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation'
  }
});

async function updateClassStatuses() {
  try {
    console.log('🔄 Starting class status update...');
    
    const now = new Date();
    const currentDate = now.toISOString().split('T')[0]; // YYYY-MM-DD
    const currentTime = now.toTimeString().split(' ')[0]; // HH:MM:SS
    
    console.log(`📅 Current date: ${currentDate}`);
    console.log(`⏰ Current time: ${currentTime}`);
    
    // Get all active classes for today
    const activeClassesResponse = await supabaseApi.get('/class_schedules', {
      params: {
        select: `
          id,
          scheduled_date,
          scheduled_time,
          status,
          class_id,
          classes!inner(
            id,
            duration
          )
        `,
        scheduled_date: `eq.${currentDate}`,
        status: 'eq.active'
      }
    });
    
    const activeClasses = activeClassesResponse.data;
    console.log(`📊 Found ${activeClasses.length} active classes for today`);
    
    if (activeClasses.length === 0) {
      console.log('✅ No active classes found for today. Status update complete.');
      return;
    }
    
    let ongoingCount = 0;
    let completedCount = 0;
    
    for (const classSchedule of activeClasses) {
      const scheduledDateTime = new Date(`${classSchedule.scheduled_date}T${classSchedule.scheduled_time}`);
      const classEndTime = new Date(scheduledDateTime.getTime() + (classSchedule.classes.duration * 60000)); // duration in minutes
      
      let newStatus = null;
      
      // Check if class should be ongoing (start time reached but not finished)
      if (now >= scheduledDateTime && now < classEndTime) {
        newStatus = 'ongoing';
        ongoingCount++;
      }
      // Check if class should be completed (end time passed)
      else if (now >= classEndTime) {
        newStatus = 'completed';
        completedCount++;
      }
      
      // Update status if needed
      if (newStatus && newStatus !== classSchedule.status) {
        await supabaseApi.patch(`/class_schedules?id=eq.${classSchedule.id}`, {
          status: newStatus,
          updated_at: new Date().toISOString()
        });
        
        console.log(`✅ Updated class ${classSchedule.id} status to ${newStatus}`);
      }
    }
    
    console.log(`📈 Status update summary:`);
    console.log(`   - Classes set to ongoing: ${ongoingCount}`);
    console.log(`   - Classes set to completed: ${completedCount}`);
    console.log('✅ Class status update completed successfully');
    
  } catch (error) {
    console.error('❌ Error during status update:', error.message);
    
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
    
    process.exit(1);
  }
}

// Run the status update
updateClassStatuses();
