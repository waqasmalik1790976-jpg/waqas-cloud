# WAQAS CLOUD — Glassmorphism Storage

This is a simple static cloud-storage dashboard using Supabase Storage + Auth.

## Already configured
- Supabase URL
- Supabase publishable key
- Storage bucket: `waqas`
- Login / signup
- Upload multiple files
- Drag & drop
- Search
- Download
- Delete
- File count and approximate storage usage
- Responsive glassmorphism UI

## Deploy on Vercel
1. Create a GitHub repository.
2. Upload `index.html`, `styles.css`, and `app.js`.
3. On Vercel choose "Add New Project" and import that GitHub repo.
4. Framework preset: Other.
5. Build command: leave empty.
6. Output directory: leave empty.
7. Deploy.

No secret/service_role key is used in this project.

## Important
For signup, Supabase may require email confirmation depending on your Authentication settings.
The storage bucket is private, so files are accessed through the logged-in user's session.

If Storage returns a policy/RLS error, check that authenticated SELECT/INSERT/UPDATE/DELETE policies exist for bucket `waqas`.
