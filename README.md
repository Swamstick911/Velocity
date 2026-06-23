# Velocity

Velocity is a platform for the YSWS (You ship, We ship) reviewers to review the projects faster and in an efficient manner.
It lets reviewer see the warnings and detects if any fraud is with the project saving ton of time for the reviewer and making real quality reviews!

## The usual suspects it catches
| Suspects | Their Crime |
|---|---|
| The double dip | Same repo submitted to 3 diff programs |
| The AI Slop | Pasting 2000 lines of code in one or 2 commits.. yeah totally not by AI |
| The Ghost demo | playable link returning 404s or a parked vercel app |
| The Time inflation | Logged 40h on 200 lines of code, seriously that slow typer?? |

That also checks the age eligibility, dead demos and empty READMEs

Every submission is classified into "clean"/ "flagged"/ "review" categories to make it easier for reviewers to catch any fraud that is going on 

*Not on Velocity's watch bro*

## How it works

1. **Connect to Airtable**: Just login with your airtable and give access to your table. (you can trust it I promise the data won't be leaked)
2. **Velocity scans**: It runs 12 preflight checks on the go for the projects so the whole queue just organises itself (yeah its not the among us medbay scan)
3. **You decide**: demo, code, stats, and risks all in one place, your choice if it shows 10 risks and still want to approve (It won't be my fault if you get out from the team)

The engine checks that all, while you catch 'em all (pokemon context)

## Tech Stack

- **Backend**- FastAPI, SQLite, with a modular signal engine. [Don't ask the coding language it's obviously Python]
- **Frontend** - Next.js, TailwindCSS
- **Friends it talks to** - Airtable, GitHub, Slack, Hackatime

## Setup (the not so tricky part)

### 1. Airtable - name your columns exactly like this (for now)

The app is picky about names. So it wants exactly same names. One typo and it will show "Unknown"

| Column | Type | Needed? |
|---|---|---|
| `GitHub URL` | Single line text | YES |
| `Playable URL` | Single line text | YES |
| `Target Program` | Single line text | YES |
| `Status` | Single line text | YES (app yeets `Approved`/`Rejected` in here) |
| `Birth Year` | Number | recommended |
| `Description` | Long text | optional |
| `Public Comment` / `Private Comment` | Long text | optional (app-written) |
| `Hackatime Hours` | Number | optional |
| `Hackatime Projects` | Single line text | optional (comma-separated) |
| `Slack ID` | Single line text | optional (for the DMs) |

### upcoming 2 are for localhost work, if you want to work locally

### 2. Backend
```bash
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000
```

You could `cd` to your `backend/.env` file and then fill out these

AIRTABLE_CLIENT_ID=...
AIRTABLE_CLIENT_SECRET=...
AIRTABLE_REDIRECT_URI=https://<backend-host>/api/auth/callback
FRONTEND_URL=https://<frontend-host>
ALLOWED_ORIGINS=https://<frontend-host>
SESSION_SECRET=``<run: python -c "import secrets; print(secrets.token_hex(32))">``
SLACK_BOT_TOKEN=xoxb-...   optional- turns on approve/reject DMs
GITHUB_TOKEN=ghp_...       optional- GitHub rate-limits you like an overprotective
                           parent (60/hr)m a token chills it out to 5000/hr

### 3. frontend

```bash
cd frontend
npm install
npm run dev
frontend/.env.local:
NEXT_PUBLIC_BACKEND_URL=https://<backend-host>
```

### 4. Slack Bot (optional but kinda fun)

New Slack app, then set bot scope to chat:write, install and then grap the Slack OAuth Token drop that in .env. Put each submitter's Slack ID so that bot can inform them about the status of their project

---
Deploy

- Frontend - just push to the main, use vercel for deployment and will automatically set all the things up
- Backend - use nest for it, git pull and run uvicorn

Tests

```bash
cd backend && python -m test
```
Does all the 43 test and make it work

---

Built with love (with some sleep deprivation) for Hack Club reviewers
(I'd say still WIP because some more features can be added to this! If you have any idea free to Open a PR)