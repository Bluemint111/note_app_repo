# API Documentation

Base URL: `http://localhost:4000` locally, or the deployed backend URL.

## Authentication

### POST /login
Creates a session token for an existing user.

Request body:
```json
{
  "username": "demo",
  "password": "secret123"
}
```

Success response (200):
```json
{
  "user": { "id": 1, "username": "demo" },
  "token": "<base64-token>"
}
```

Error responses:
- 400: Missing username or password
- 401: Invalid username or password
- 500: Login failed

### POST /register
Registers a new user account.

Request body:
```json
{
  "username": "demo",
  "password": "secret123"
}
```

Success response (201):
```json
{
  "user": { "id": 2, "username": "demo" },
  "token": "<base64-token>"
}
```

Error responses:
- 400: Missing username or password
- 409: Username already taken
- 500: Registration failed

## Notes

### GET /
Health check endpoint.

Success response (200):
```json
{
  "message": "Notes API is running.",
  "routes": ["GET /notes", "GET /note/:id", "POST /note", "PUT /note/:id", "DELETE /note/:id"]
}
```

### GET /notes
Returns all notes for the authenticated user.

Headers:
- `Authorization: Bearer <token>`

Success response (200):
```json
[
  {
    "id": 1,
    "title": "Meeting notes",
    "grid": [["Name", "Email"]],
    "labels": ["work"],
    "user_id": 1,
    "created_at": "2026-01-01T00:00:00.000Z",
    "updated_at": "2026-01-01T00:00:00.000Z"
  }
]
```

### GET /note/:id
Returns one specific note for the authenticated user.

Error responses:
- 404: Note not found
- 500: Server or fallback error

### POST /note
Creates a new note.

Headers:
- `Authorization: Bearer <token>`

Request body:
```json
{
  "title": "Meeting notes",
  "grid": [["Name", "Email"], ["Alice", "alice@example.com"]],
  "labels": ["work", "follow-up"]
}
```

Success response (200):
```json
{
  "id": 1,
  "title": "Meeting notes",
  "grid": [["Name", "Email"], ["Alice", "alice@example.com"]],
  "labels": ["work", "follow-up"],
  "user_id": 1,
  "created_at": "2026-01-01T00:00:00.000Z",
  "updated_at": "2026-01-01T00:00:00.000Z"
}
```

### PUT /note/:id
Updates a note.

Headers:
- `Authorization: Bearer <token>`

### DELETE /note/:id
Deletes a note.

Success response (200):
```json
{
  "success": true,
  "note": { "id": 1 }
}
```

## AI summary

### POST /ai-summary
Summarizes a transcript using Gemini.

Request body:
```json
{
  "transcript": "Alice met with the team and discussed launch plans."
}
```

Success response (200):
```json
{
  "summary": "Alice discussed launch plans with the team."
}
```

Error responses:
- 400: Transcript missing
- 500: Missing API key or Gemini request failure
