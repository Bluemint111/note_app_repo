# Database Schema

The application uses Supabase tables for authentication and notes storage. The backend also includes a fallback JSON file for local development when Supabase is unavailable.

## Core tables

### users
| Column | Type | Constraints | Description |
| --- | --- | --- | --- |
| id | bigint | primary key, auto-generated | Unique user identifier |
| username | text | unique, not null | Lowercased username |
| password_hash | text | not null | SHA-256 hash of password + auth secret |

### notes
| Column | Type | Constraints | Description |
| --- | --- | --- | --- |
| id | bigint | primary key, auto-generated | Unique note identifier |
| user_id | bigint | foreign key -> users.id | Owner of the note |
| title | text | nullable | Note title |
| grid | jsonb | nullable | Spreadsheet-style note content |
| labels | jsonb | nullable | Array of labels |
| created_at | timestamptz | default now() | Creation timestamp |
| updated_at | timestamptz | default now() | Last update timestamp |

## Relationships

- `users.id` -> `notes.user_id` (one-to-many)
- Each user can own many notes.
- Each note belongs to exactly one user.

## Fallback storage

When Supabase cannot be reached, the backend uses a local file:
- [backend/notes.json](backend/notes.json)

This fallback stores the same note structure and is used for local demos and resilience.

## ER diagram (text form)
```text
users
  1 ───< notes
```
