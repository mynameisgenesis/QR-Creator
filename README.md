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
