# Admin PC Setup

This repository has two apps:

- Frontend: Vite/React at the repo root
- Backend: Node/Express in `backend-node/`

Use GitHub for the source code only. Do not use GitHub as the place to move secrets, database contents, or uploaded challenge files.

## What should stay out of GitHub

- Root `.env`
- `backend-node/.env`
- `backend-node/uploads/`
- `backend-node/uploads_debug.log`
- Local `node_modules/`, `dist/`, `tmp/`, and generated test files

## Important migration note

This project stores uploaded challenge resources on disk in `backend-node/uploads/`, and challenge/resource records can reference those upload IDs from the database.

If you already created challenges or uploaded files on this laptop, moving only the GitHub repo is not enough. You also need to migrate:

- The MySQL database created from `complete_database_setup.sql`
- The full `backend-node/uploads/` directory

Without those two items, existing challenge resources and upload-backed files can be missing on the admin PC.

## Suggested transfer flow

1. Create a private GitHub repository.
2. Push this repo after confirming `.env` files and upload folders are not staged.
3. On the admin PC, clone the repo.
4. Install dependencies:

```powershell
npm install
cd backend-node
npm install
```

5. Create env files locally on the admin PC:
   - Copy `.env.example` to `.env`
   - Copy `backend-node/.env.example` to `backend-node/.env`
6. Make the frontend encryption key match the backend encryption key:
   - Root `.env`: `VITE_ENCRYPTION_KEY_HEX=...`
   - Backend `.env`: `ENCRYPTION_KEY=...`
7. Restore the MySQL database on the admin PC.
8. Copy `backend-node/uploads/` from the current machine to the admin PC if you need existing uploaded challenge resources.
9. Start the apps:

```powershell
# terminal 1
cd backend-node
npm run dev

# terminal 2
cd ..
npm run dev
```

On Windows, `start.bat` is also available as a convenience dev launcher.

## Quick pre-push check

Run this before pushing:

```powershell
git status --short
```

Make sure you do not see:

- `.env`
- `backend-node/.env`
- `backend-node/uploads/`
- `backend-node/uploads_debug.log`
- `node_modules/`

If you want a cleaner handoff, export the database and copy `backend-node/uploads/` over USB or another private channel instead of GitHub.
