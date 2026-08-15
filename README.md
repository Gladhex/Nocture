# Nocturne — Dream Interpreter

This is the Vercel-ready version. The UI is identical to the Claude preview;
what changed is the plumbing underneath — API calls now go through a
server route, and storage runs on Supabase instead of the artifact's
built-in storage.

## What you need to do, in order

### 1. Get a Supabase project (free)
1. Go to supabase.com → New Project.
2. Once it's created, open the **SQL Editor** and paste in the contents
   of `supabase-setup.sql` from this folder → Run. This creates the two
   tables the app needs (`dream_wall_posts`, `dream_history`).
3. Go to **Settings → API** and copy your **Project URL** and **anon public key**.

### 2. Get an Anthropic API key
Go to console.anthropic.com → API Keys → Create Key. Copy it.
(This is separate from your claude.ai chat login — it's billed per use.)

### 3. Set up locally (optional, to test before deploying)
```
npm install
cp .env.example .env
```
Paste your three values into `.env`, then:
```
npm run dev
```

### 4. Push to GitHub
```
git init
git add .
git commit -m "Nocturne dream interpreter"
```
Create a new empty repo on GitHub, then follow GitHub's own instructions
to push (the "…or push an existing repository" section it shows you).

### 5. Deploy on Vercel
1. Go to vercel.com → New Project → import your GitHub repo.
2. Before deploying, open **Environment Variables** and add all three:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `ANTHROPIC_API_KEY`
3. Click Deploy.

That's it — Vercel gives you a live URL immediately, and redeploys
automatically every time you push to GitHub.

## What you'll only have to do once
Steps 1 and 2 (Supabase + Anthropic key) are one-time setup.
After that, any future changes are just: edit code → git push →
Vercel redeploys on its own.

## Notes
- The Dream Wall is public — anyone visiting the site can read every
  posted dream. Say so somewhere visible if that's not obvious to visitors.
- Personal history is scoped by an anonymous device ID stored in the
  visitor's browser (no login) — it won't follow them to a different
  device or browser.
- Your Anthropic key is only ever used inside `/api/interpret.js`,
  which runs on Vercel's servers — it's never sent to the browser.
