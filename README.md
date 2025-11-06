# Jammer

Jammer helps musicians discover new collaborators and organise jam sessions. The project is built with the Next.js 16 App Router, TypeScript, Tailwind CSS, and Supabase for authentication, Postgres, storage, and realtime updates. Leaflet and React Leaflet render the interactive map, while React Hook Form and Zod power the onboarding and jam creation flows.

## Application highlights

- Authentication with email plus OAuth providers (Google, Spotify) through Supabase Auth.
- Musician onboarding that collects instruments, genres, biography, location, availability, and social links.
- A searchable homepage that combines faceted filters, keyword search, and a Leaflet-powered map of upcoming jams.
- Jam management that lets hosts publish sessions, define desired instruments, and review incoming join requests.
- Requests tooling so musicians can track the jams they have applied to and hosts can approve or decline attendees.
- Messaging spaces for direct messages and jam-specific group chats backed by Supabase Realtime.

## Get started locally

1. Install Node.js 18 or later and npm.
2. Create a Supabase project and make note of the project URL, anon key, and service role key.
3. Clone the repository and install dependencies:

```bash
npm install
```

### Configure environment variables

Create a `.env.local` file in the project root and add the Supabase credentials:

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

Restart the dev server after any changes to environment variables.

### Prepare the Supabase project

1. In the Supabase SQL Editor run the contents of `supabase/schema.sql` to create tables, policies, and helper functions.
2. Enable the providers you need under Authentication → Providers (email, Google, Apple, Spotify).
3. Turn on Realtime for the `messages` table under Database → Replication so chat rooms update live.
4. Create a public storage bucket named `avatars` and apply the storage policies from the schema file so users can upload their own images.

Once Supabase is configured, sign up through the app to create an initial profile.

### Optional seed data

After at least one user exists, populate sample profiles and jams by running:

```bash
npm run seed
```

## Run the app

- `npm run dev` starts the Next.js development server on http://localhost:3000.
- `npm run lint` checks the codebase with the Next.js ESLint config.
- `npm run build` followed by `npm start` runs the production build.

## Project layout

```
app/             Next.js App Router routes, layouts, and pages
components/      Reusable UI including map, filters, requests, and messaging widgets
lib/             Supabase helpers, shared types, and validation logic
supabase/        SQL schema and TypeScript seed script
public/          Static assets
```

## Deployment notes

Set the same environment variables (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`) in your hosting provider and supply Supabase credentials for any edge or server runtime. The application expects secure HTTPS callbacks for OAuth providers that match the URLs configured inside Supabase.

## License

MIT
