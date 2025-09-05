import axios from 'axios';

const SUPABASE_URL = 'https://iyywyoasvxxcndnxyiun.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml5eXd5b2Fzdnh4Y25kbnh5aXVuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU5NDQwOTYsImV4cCI6MjA3MTUyMDA5Nn0.G6Bmbqo5O5MnMlPajHPsRedThm7RvloDS6SHcoNKYWs';

// Create axios instance for Supabase REST API
export const supabaseApi = axios.create({
  baseURL: `${SUPABASE_URL}/rest/v1`,
  headers: {
    'apikey': SUPABASE_ANON_KEY,
    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation'
  }
});

// Auth endpoints
export const authApi = axios.create({
  baseURL: `${SUPABASE_URL}/auth/v1`,
  headers: {
    'apikey': SUPABASE_ANON_KEY,
    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    'Content-Type': 'application/json'
  }
});

export const SUPABASE_CONFIG = {
  url: SUPABASE_URL,
  anonKey: SUPABASE_ANON_KEY
};


