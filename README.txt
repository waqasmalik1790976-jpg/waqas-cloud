PAYMENT SLIP MANAGER — OPTION B

This is a GitHub-ready web app using Supabase as the online database.
It supports many payment slips in one app, with Login, New Slip, Search,
Date Filter, Edit and Delete.

SETUP
1. Create/open a Supabase project.
2. In Supabase SQL Editor, run schema.sql.
3. In Supabase Project Settings -> API, copy Project URL and anon public key.
4. Open index.html and replace:
   PASTE_YOUR_SUPABASE_URL_HERE
   PASTE_YOUR_SUPABASE_ANON_KEY_HERE
5. Upload ALL files in this folder to a GitHub repository.
6. Enable GitHub Pages for the repository.
7. Open the HTTPS GitHub Pages URL and create your account.

IMPORTANT
- The database is online and user-owned through Supabase Auth + Row Level Security.
- "Unlimited" means the app has no artificial slip-count limit; actual storage is subject to your Supabase plan/database capacity.
- Keep the anon public key in the frontend; NEVER put a Supabase service_role/secret key in this file.
- The current app stores the slip rows as JSON in each database record and calculates Amount + Previous Balance - Advance Payment.
