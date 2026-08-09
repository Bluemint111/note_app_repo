# Note Taking App 3.0

This project contains:

- `front end/` - React front-end styled like a notes app with spreadsheet-style notes.
- `backend/` - Node.js back-end with Supabase integration for notes storage.
- `export/` - Node.js export service to generate Excel files.

## Setup

1. Install Node.js.
2. Install dependencies for each app:
   - `cd "front end" && npm install`
   - `cd backend && npm install`
   - `cd export && npm install`

## Run

From the repo root, start everything together:

- `npm start`

The root script will launch the backend, frontend, and export service and automatically choose free ports if the defaults are already occupied.

To stop everything again:

- `npm run stop`

Or run each service separately:

- Front-end: `cd "front end" && npm start`
- Back-end: `cd backend && npm start`
- Export service: `cd export && npm start`
