import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://zsaqxsztmqbstuicguqh.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpzYXF4c3p0bXFic3R1aWNndXFoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU0NTUxNzAsImV4cCI6MjA4MTAzMTE3MH0.zvG7UTBQyf5U2-pylm-aArknanEwK0wP7ezZNFWePYk';

export const supabase = createClient(supabaseUrl, supabaseKey);
