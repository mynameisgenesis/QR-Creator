# QR Creator

Vite React app for creating QR inventory labels.

## Supabase Auth Setup

Create a Supabase project, then copy the project URL and a publishable key from the Supabase dashboard.

```bash
cp .env.example .env
```

Fill in:

```bash
VITE_SUPABASE_URL="https://your-project-ref.supabase.co"
VITE_SUPABASE_PUBLISHABLE_KEY="your-supabase-publishable-key"
```

Restart the dev server after changing `.env`.

```bash
npm run dev
```

The QR workspace is protected by Supabase Auth. Users can sign up, sign in, and sign out with email and password.

## Supabase Template Storage

Run the SQL in `supabase-template-schema.sql` in your Supabase SQL editor. It creates `public.qr_templates` with row-level security so each signed-in user only reads and writes their own templates.

Templates saved in the app are scoped to `auth.uid()` through the `user_id` column. Built-in starter templates remain local in the app and are visible to everyone.
