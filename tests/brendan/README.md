# Tests

This folder contains documented test cases for the current implementation.

## Suggested unit test coverage
- Authentication helpers: login/register validation
- Note normalization: labels parsing and fallback note storage
- AI summary input validation and error handling
- CORS allowlist behavior for localhost and Vercel origins

## Example assertions
- Rejects missing username/password
- Rejects duplicate usernames during registration
- Returns 404 for missing note IDs
- Returns 400 for empty transcripts
- Allows localhost and configured frontend origins
