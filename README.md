# Velocity

Velocity is the anti-fraud, auto-checking, lightning-fast platform for Hack Club's YSWS reviewers.
It connects directly to the Airtable database, runs preflight checks and gives the ability to accept or reject the submissions without any tabs switching!

## Setup Instructions

1. **Clone and install**
   ```bash
   npm install
   ```

2. **Environment Variables**
    Create a `.env.local` file in the root directory and add your Airtable credentials:
    ```env
    AIRTABLE_API_KEY="patYourPersonalAccessTokenHere"
    AIRTABLE_BASE_ID="appYourBaseIdHere"
    ```

    *PS: The Airtable should have a table named "Submissions" with a "Status" column.*

3. **Run the development server**
    ```bash
    npm run dev
    ```

    Open [http://localhost:3000](http://localhost:3000) with your browser to see the landing page.

*This project is still WIP so some features might not work properly. You're free to open an issue to flag them!*