# TerraScope AI — Satellite Land-Use Classification

A browser-based satellite-tile classifier for the AI Sansad project. The UI runs
in React/Vite, the real model runs with TensorFlow Lite in the browser, and
Supabase stores account-specific classification records, images, human
reviews, settings, and evaluation reports.

## Architecture

- **Model inference:** TensorFlow Lite/WASM in the user's browser. The model
  artifacts are hosted separately on GitHub Pages; Colab trains/exports models,
  **not** an always-on prediction server.
- **Account data:** Supabase Auth + PostgreSQL with row-level security.
- **Images:** private Supabase Storage bucket (`terrascope-images`).
- **Frontend:** React, TypeScript, Vite. No server-side service-role key.

## Set up the backend — entirely online

1. Create or open your [Supabase](https://supabase.com/dashboard) project.
2. In **SQL Editor**:
   - For a new project with no TerraScope tables, run
     [`SUPABASE_SETUP.sql`](SUPABASE_SETUP.sql).
   - If you already created four tables using earlier instructions, run
     [`BACKEND_MIGRATION.sql`](BACKEND_MIGRATION.sql) instead. This preserves
     existing predictions and adds the `in_review_queue` column. Do not reset
     your database. Existing tables must have the columns referenced in
     `src/services/supabaseStorageService.ts`.
3. In **Authentication > Providers**, enable Email authentication (and configure
   confirmation behavior for your testing). In **Authentication > URL
   Configuration**, add the actual website origin and allowed redirect URLs.
4. In Google AI Studio's environment/secrets panel or the hosting provider's
   **client build** environment, set:

   ```env
   VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_YOUR_PUBLISHABLE_KEY
   ```

   Legacy anon keys can use `VITE_SUPABASE_ANON_KEY` instead. Use only the
   public/publishable key: **never** use `service_role`, `sb_secret_...`, or a
   database password in any `VITE_` variable. These values are embedded in the
   browser build, so row-level security and private bucket policies are mandatory.

5. Rebuild and publish the frontend. `VITE_` values are read at **build time**;
   a GitHub commit does not automatically alter an already-open AI Studio app.

## Verify persistence

1. Sign in with your Supabase account.
2. Classify a JPEG/PNG using the **actual connected TFLite model**.
3. Confirm one new `terrascope_predictions` row and a private image in
   `Storage > terrascope-images > <YOUR_USER_ID>/`.
4. Add the saved prediction to review; check `in_review_queue = true`.
5. Approve or reclassify; confirm a row in `terrascope_review_events`.
6. Remove it from the queue; the prediction **must remain** in the database.
7. Import an evaluation JSON and confirm it survives a refresh and a new login.
8. Export a backup periodically. JSON exports do not contain the image binaries;
   those remain in private Supabase Storage.

Only claim these tests passed after checking your live Supabase dashboard.
Synthetic practice-model scores are **not** official competition results.

## Development

The project can be edited via GitHub and Google AI Studio. If you do use a
development machine, the optional commands are:

```bash
npm install
npm run lint
npm run build
```

See [`.env.example`](.env.example) for variable names. Never commit `.env`.
