// Supabase Configuration
const SUPABASE_URL = 'https://otqrknvbrlpehmdsvznj.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im90cXJrbnZicmxwZWhtZHN2em5qIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM2NjQ5MzMsImV4cCI6MjA3OTI0MDkzM30.HeVrKCP35g8_0Hok1YNP5Wrzcdxpunx6EEr_x5kNPyE';

// Initialize Supabase Client
const { createClient } = supabase;
const supabaseClient = createClient(SUPABASE_URL, SUPABASE_KEY);

// Module columns configuration
const MODULE_COLUMNS = [
    'Onboarding', 
    'Preseason Web', 
    'Preseason Data', 
    'Season 01 Arc 01', 
    'Season 01 Arc 02', 
    'Season 01 Cloud Devops', 
    'Season 02 Fullstack', 
    'Season 03 Fullstack Java', 
    'Season 03 Fullstack Python', 
    'Season 03 Frontend', 
    'Season 03 Backend', 
    'Season 03 Cloud Engineer', 
    'Season 02 Data Science', 
    'Season 02 Software Engineer', 
    'Season 03 Software Engineer Golang', 
    'Season 03 Software Engineer CPP', 
    'Season 03 Software Engineer Rust', 
    'Season 03 Machine Learning', 
    'Season 03 Data Science', 
    'Season 03 Agentic AI', 
    'Season 04 Masters'
];

// CSV Headers mapping
const CSV_HEADERS = {
    'User ID': 'UserID',
    'Name': 'Name',
    'Login': 'LoginName',
    'Status': 'Status',
    'Email': 'Email',
    'Last Login': 'LastLogin',
    'Cohort Name': 'CohortName'
};
