import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://hixmjkytrbthobllqrqo.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhpeG1qa3l0cmJ0aG9ibGxxcnFvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIxOTI0NzgsImV4cCI6MjA3Nzc2ODQ3OH0.GEzRUTUUHa0p5DXMc36xP3FyH-uzPGJIpWOukEC1_mY'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)