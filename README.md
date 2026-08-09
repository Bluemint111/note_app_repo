# Note Taking App 3.0

This project contains:

- `frontend/` - React front-end styled like a notes app with spreadsheet-style notes.
- `backend/` - Node.js back-end with Supabase integration for notes storage.
- `export/` - Node.js export service to generate Excel files.

## Setup

1. Install Node.js 18+.
2. Install dependencies for each app:
   - `cd frontend && npm install`
   - `cd backend && npm install`
   - `cd export && npm install`
3. Copy [.env.example](.env.example) to `.env` in the backend and fill in your secrets.

## Run locally

From the repo root, start everything together:

- `npm start`

The root script will launch the backend, frontend, and export service and automatically choose free ports if the defaults are already occupied.

To stop everything again:

- `npm run stop`

Or run each service separately:

- Front-end: `cd frontend && npm start`
- Back-End: `cd backend && npm start`
- Export service: `cd export && npm start`

## Deployment

### Render backend
- Root Directory: `backend`
- Build Command: `npm install`
- Start Command: `npm start`

Required environment variables:
- `AUTH_SECRET`
- `SUPABASE_URL`
- `SUPABASE_KEY`
- `GOOGLE_API_KEY`
- `FRONTEND_URL`
- `NODE_ENV=production`

### Vercel frontend
- Root Directory: `frontend`
- Build Command: `npm run build`
- Output Directory: `build`
- Install Command: `npm install`

Required environment variables:
- `REACT_APP_API_URL=<your Render backend URL>`
- `REACT_APP_EXPORT_URL=<your Render export URL>`

## Live URL
[A public deployment can be served from Vercel for the frontend and Render for the backend/export services.](https://note-app-repo.vercel.app/)
