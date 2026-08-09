# AI Log 2 - Deployment Debugging

Date: 2026-08-09

## Prompt
"Help me make the app work on Render and Vercel and fix the blank screen / microphone issues."

## Output
- Added environment-based API/export URLs.
- Updated backend CORS to support Vercel origins.
- Adjusted frontend microphone access handling.
- Repaired a frontend render regression.

## Decision
Use environment variables for deployment to avoid hard-coded URLs and keep local and production behavior consistent.
