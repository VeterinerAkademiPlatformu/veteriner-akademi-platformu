# Supabase setup — Veteriner Akademi Platformu

## Current status
The browser app is now wired to Supabase Auth and the `student_workspaces` table. Email/password sign-up, sign-in, sign-out, per-user JSON workspace storage, local demo-data migration prompt, and debounced cloud saves are implemented in `index.html` and `script.js`. The browser uses only the project URL and a publishable key.

## Database and access control
The table `public.student_workspaces` has RLS enabled. Authenticated users can read/insert/update/delete only the row where `user_id = auth.uid()`. Anonymous access is revoked. The setup SQL is in `supabase/schema.sql`.

## Authentication setup
In the [Supabase project](https://supabase.com/dashboard/project/jvbpoibzjihznlljeech):
1. Open **Authentication → Sign In / Providers** and ensure Email is enabled.
2. Set the site's deployed URL as the Site URL and add the deployed URL plus any development URL to the redirect allow list.
3. Decide whether email confirmation is required. If enabled, new users must open the verification email before signing in.
4. Deploy the latest GitHub `main` branch so the new UI and client script are served.

## Important safety notes
- Only the publishable key is included in browser code. Never put a `service_role` key, secret key, database password, or personal access token in HTML/JavaScript or GitHub.
- A user's cloud row is loaded before cloud saves are enabled. Existing cloud data takes precedence over local demo data.
- For a new account with no cloud row, the app asks whether to migrate local data. If a different account was previously used in the same browser, local data is not silently migrated.
- Signing out switches the visible workspace back to demo data; the signed-in user's cloud data remains in Supabase.

## Verification checklist
Before treating this as fully production-verified:
- Test new email sign-up with the project's actual email-confirmation settings.
- Test sign-in and sign-out in the deployed site.
- Create a note/card, refresh, and verify it remains after sign-in.
- Sign in on a second browser/device and verify the same workspace loads.
- Test with two accounts and confirm each can only access their own row.
- Check the browser console and Supabase Security Advisor after deployment.
