#!/usr/bin/env node

/**
 * Cleanup script to remove old completed classes
 * Removes class schedules where scheduled_date is 1 day old or older
 * This script is designed to run as a GitHub Action cron job
 */

console.log('🚀 Starting cleanup-old-classes.js script...');
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

async function cleanupOldClasses() {
  try {
    console.log('🧹 Starting cleanup of old completed classes...');
    
    // Calculate the cutoff date (yesterday)
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const cutoffDate = yesterday.toISOString().split('T')[0]; // Format as YYYY-MM-DD
    
    console.log(`📅 Removing classes with scheduled_date <= ${cutoffDate}`);
    
    // First, let's see how many classes we're about to delete
    const countResponse = await supabaseApi.get('/class_schedules', {
      params: {
        select: 'id',
        scheduled_date: `lte.${cutoffDate}`,
        status: 'eq.completed'
      }
    });
    
    const classesToDelete = countResponse.data;
    console.log(`📊 Found ${classesToDelete.length} completed classes to delete`);
    
    if (classesToDelete.length === 0) {
      console.log('✅ No old completed classes found. Cleanup complete.');
      return;
    }
    
    // Delete related attendance records first (due to foreign key constraints)
    for (const classSchedule of classesToDelete) {
      try {
        await supabaseApi.delete('/class_attendance', {
          params: {
            class_schedule_id: `eq.${classSchedule.id}`
          }
        });
        
        await supabaseApi.delete('/class_bookings', {
          params: {
            class_schedule_id: `eq.${classSchedule.id}`
          }
        });
      } catch (error) {
        console.log(`⚠️  Warning: Could not delete related records for class ${classSchedule.id}:`, error.message);
      }
    }
    
    // Delete the old completed classes
    const deleteResponse = await supabaseApi.delete('/class_schedules', {
      params: {
        scheduled_date: `lte.${cutoffDate}`,
        status: 'eq.completed'
      }
    });
    
    console.log(`🗑️  Successfully deleted ${classesToDelete.length} old completed classes and their related records`);
    console.log('✅ Cleanup completed successfully');
    
  } catch (error) {
    console.error('❌ Error during cleanup:', error.message);
    
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
    
    process.exit(1);
  }
}

// Run the cleanup
cleanupOldClasses();
