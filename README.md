# Dawaa Reminder

A medication reminder website. Add your medicines and dose times, mark doses as taken, track your streak, and get an email with an encouraging message at each dose time.

Stack (all free tiers): Next.js, Supabase (database + login), Resend (email), Vercel (hosting), cron-job.org (runs the reminder job every 5 minutes).

> A helper only. It does not replace a doctor's instructions or a phone alarm.

## What is inside
- `app/` pages: login, Today, Medicines, History, Messages
- `app/api/cron/remind/route.ts` the reminder job
- `supabase/schema.sql` the database tables and security rules
- `.env.example` the settings you need to fill

## Step 1: Run it on your computer (optional but recommended)
1. Install Node.js 18+ from nodejs.org.
2. In this folder: `npm install`
3. Do Step 3 first (Supabase), then copy `.env.example` to `.env.local` and fill it.
4. `npm run dev` and open http://localhost:3000

## Step 2: Put the code on GitHub
1. Create a GitHub account, then a new empty repository (name: `medication-reminder`, private is fine).
2. GitHub shows you the exact commands on the empty repo page ("push an existing repository"). In this folder they look like:
```
git init
git add .
git commit -m "first version"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/medication-reminder.git
git push -u origin main
```
(Or use GitHub Desktop: "Add local repository" then "Publish".)

## Step 3: Supabase (database + login)
1. Create an account at supabase.com, then "New project". Save the database password somewhere.
2. Open SQL Editor > New query. Paste all of `supabase/schema.sql` and press Run.
3. Project Settings > API. Copy: Project URL, `anon` public key, and `service_role` key (secret, never share it).
4. Authentication > Providers > Email: for easy testing, turn OFF "Confirm email". For real users, keep it on.
5. Authentication > URL Configuration: set Site URL to your Vercel link after Step 5.

## Step 4: Resend (emails)
1. Create an account at resend.com, then API Keys > Create. Copy the key.
2. Testing: use sender `onboarding@resend.dev`. It only delivers to the email you signed up to Resend with.
3. For other users: add and verify your own domain in Resend, then use `reminders@yourdomain.com` as `RESEND_FROM`.

## Step 5: Deploy on Vercel
1. Create an account at vercel.com with GitHub. "Add New > Project" and pick the repo.
2. Under Environment Variables add everything from `.env.example`:
   `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`, `RESEND_FROM`, `CRON_SECRET` (make up a long random text), `NEXT_PUBLIC_SITE_URL` (your Vercel link, update it after the first deploy and redeploy).
3. Deploy. Open the link, sign up, add a medicine.

## Step 6: Turn on the reminder job
Vercel's free plan only runs cron once a day, so use a free external service:
1. Create an account at cron-job.org.
2. New cronjob. URL: `https://YOUR-SITE.vercel.app/api/cron/remind`
3. Schedule: every 5 minutes.
4. Advanced > Headers: add `Authorization` = `Bearer YOUR_CRON_SECRET`.
5. Test: add a medicine with a dose time a few minutes from now. You should get an email within 5 to 10 minutes. Opening the URL with `?secret=YOUR_CRON_SECRET` in a browser also runs it once and shows `{"ok":true,"sent":N}`.

## How it works
- Times are stored per medicine. The site saves your browser's timezone, and the job uses it, so reminders arrive at your local time.
- The job looks for doses due in the last 10 minutes that are not marked taken, and sends one email each. A `reminders_sent` table stops duplicates.
- The message is picked randomly from the built-in list plus your own messages (Messages tab).
- Streak = consecutive days where every scheduled dose was marked taken.

## Ideas for next versions
Telegram reminders, Arabic/English toggle, sharing with family, refill reminders, installable phone app (PWA), AI-written messages.
