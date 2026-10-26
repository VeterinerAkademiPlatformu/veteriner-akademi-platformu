# Supabase setup — Veteriner Akademi Platformu

## Current status
The web app currently uses browser localStorage for demo data. This repository does not yet connect to Supabase. Do not describe the app as cloud-synced until sign-in, data migration, and cross-account isolation have been tested.

## 1. Create the correct project
Create a NEW Supabase project specifically for **Veteriner Akademi Platformu**. Do not reuse the unrelated `ciftlik-simulasyonu` project. Choose a region near the intended users where available.

## 2. Create the private student-data table
In the new project's SQL Editor, open and run `supabase/schema.sql`. The table stores one JSON workspace per authenticated user. Row Level Security (RLS) ensures each account can access only the row whose `user_id` matches its authenticated user ID.

After running the script, verify that `student_workspaces` appears in Table Editor and RLS is enabled. The final SELECT in the script reports the RLS status.

## 3. Get browser-safe client settings
From the new project's Connect/API settings, obtain:
- Project URL
- Publishable key (preferred), or legacy anon key if the project only provides that

These values are intended for browser clients. Never put a `service_role`, secret key, database password, or personal access token in `index.html`, JavaScript files, GitHub, or chat.

## 4. Configure authentication
In Authentication settings:
- Enable Email provider.
- Configure the site's allowed redirect URLs for the deployed site and local development URL.
- Decide whether email confirmation should be required before sign-in.

## 5. Integration and verification checklist
The next implementation step is to add a configuration module and sign-in/sign-up/sign-out UI, then safely migrate each account's local demo data to `student_workspaces`.
Before calling the integration complete, verify:
- a new user can sign up and sign in;
- a signed-out visitor cannot read or write student data;
- user A cannot read or update user B's workspace;
- notes, courses, flashcards, and review status survive a refresh and sign-in on another device;
- local demo data is not silently overwritten during first sync.

Until these checks pass, localStorage remains the app's working storage and this SQL file is only the prepared database schema.
