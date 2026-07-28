import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://qsnenqpjhnaidrcmxcdn.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFzbmVucXBqaG5haWRyY214Y2RuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUxNzIzMTIsImV4cCI6MjEwMDc0ODMxMn0.2w9wAYqdwV9hQANYGuwxHKq6osWPtzKumZOHVi-qgh4'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)