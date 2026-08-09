# System Architecture

## Overview
The application is a three-part system:
1. A React frontend served by Vercel or a local dev server.
2. An Express backend served by Render or a local Node process.
3. An Express export service for generating Excel files.

## Components

### Frontend
- Built with React and React Scripts.
- Uses Axios for API calls to the backend.
- Uses environment variables for API and export URLs.
- Supports auth, note editing, transcript capture, and Excel export.

### Backend
- Built with Express.
- Handles authentication, note CRUD, and AI summary generation.
- Uses Supabase for durable storage.
- Falls back to a local JSON file when Supabase is unavailable.

### Export service
- Built with Express and ExcelJS.
- Accepts note data and returns an `.xlsx` file.

## Request flow
1. User signs in or registers from the frontend.
2. Frontend sends API requests to the backend with a bearer token.
3. Backend reads or writes notes via Supabase.
4. Transcript-based summaries call Gemini via the backend.
5. Export requests are handled by the export service.

## Deployment topology
- Frontend: Vercel
- Backend: Render
- Export: Render
- Database: Supabase
- AI: Google Gemini API

## Notes
The documented architecture matches the final build and the deployment settings described in the project README.
