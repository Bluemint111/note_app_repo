# Use Cases

## Primary user roles

### 1. Authenticated note writer
- Signs up or logs in with a username and password.
- Creates, views, edits, and deletes spreadsheet-style notes.
- Adds labels and metadata to organize notes.
- Uses transcript capture and AI summarization to populate note content.

### 2. Returning user
- Reuses existing auth token from local storage to stay signed in.
- Loads previously saved notes from the backend.
- Updates notes without losing prior content.

### 3. Guest / unauthenticated user
- Can reach the authentication screen.
- Cannot access notes until a valid account exists.

## Core use cases

1. Register a new account
2. Sign in with valid credentials
3. Create a new note with title, labels, and grid content
4. Edit an existing note
5. Delete an existing note
6. Export note data to XLSX
7. Record or paste a transcript and summarize it
8. View transcript and summary alongside note content

## Edge cases

- Invalid or missing login credentials
- Duplicate username during registration
- Attempting to access notes without a valid token
- Note not found when loading or updating by ID
- Empty transcript submitted to the summary endpoint
- Missing Google AI API key
- Backend fallback mode if Supabase is unavailable
- Empty note title or empty grid content
- Deleting a note that no longer exists
