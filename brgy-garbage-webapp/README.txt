Barangay Garbage Collection Web App
===================================

Stack: HTML + CSS + Vanilla JS + Supabase (Auth + DB)

1) Open index.html in a browser.
2) Replace Supabase credentials in main.js if you make a new project.
3) Create these tables in Supabase (SQL):
   - users (id uuid pk, name text, role text, barangay text, email text unique)
   - schedules (id uuid pk, collector_id uuid, barangay text, date date, time text, status text default 'pending')
   - confirmations (id uuid pk, schedule_id uuid, resident_id uuid, status text)
4) Insert user rows with matching 'email' and set 'role' = admin/collector/resident and 'barangay'.
5) Login with that email/password; the app redirects by role.
6) Residents can Accept or Report Not Collected; Collectors can mark Missed on accepted residents; Admin sees summaries.
