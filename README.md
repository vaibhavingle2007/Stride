# Stride — AI Deadline Companion & Google Calendar Sync

Stride is an AI-powered deadline and productivity companion. This document explains how to set up and configure the **Google Calendar Sync** integration.

## How It Works

Stride's Google Calendar integration synchronizes your tasks bidirectionally with Google Calendar:
1. **Pushes Stride Tasks to Google Calendar**: Tasks created in Stride automatically appear as all-day events on a dedicated "Stride Tasks" secondary calendar or your primary calendar.
2. **Imports Google Calendar Events**: Events on Google Calendar containing `[stride]` in their description or title are automatically imported into Stride.
3. **Automatic Live Updates**: Modifying a task's name, description, or deadline, or completing/deleting a task in Stride, automatically updates the corresponding Google Calendar event (debounced to avoid rate limit issues).

---

## Step-by-Step Setup Guide

To enable Google Calendar synchronization, you must configure a Google OAuth 2.0 Web Client.

### Step 1: Create a Project on Google Cloud Console
1. Go to the [Google Cloud Console](https://console.cloud.google.com/).
2. Create a new project named **Stride Calendar Sync** (or select an existing one).

### Step 2: Enable the Google Calendar API
1. In the Cloud Console, search for **Google Calendar API** in the top search bar.
2. Click **Enable** to turn on the Google Calendar API for your project.

### Step 3: Configure the OAuth Consent Screen
1. Go to **APIs & Services** > **OAuth consent screen**.
2. Select **External** user type and click **Create**.
3. Fill in the required fields:
   - **App name**: `Stride`
   - **User support email**: Your email address
   - **Developer contact information**: Your email address
4. Click **Save and Continue**.
5. On the **Scopes** screen, click **Add or Remove Scopes**, find and check `.../auth/calendar.events` (Google Calendar API - View and edit events on all your calendars), then click **Update** and **Save and Continue**.
6. On the **Test Users** screen, add your personal Google account email address so you can test the authentication flow.

### Step 4: Create OAuth 2.0 Client Credentials
1. Go to **APIs & Services** > **Credentials**.
2. Click **+ Create Credentials** at the top and select **OAuth client ID**.
3. Set the **Application type** to **Web application**.
4. Set the **Name** to `Stride Web App`.
5. Under **Authorized redirect URIs**, click **+ Add URI** and enter:
   - `https://<YOUR_APP_URL>/api/calendar/callback`
   *(Replace `<YOUR_APP_URL>` with your actual app hosting domain, e.g. from the AI Studio browser preview bar, or `http://localhost:3000/api/calendar/callback` for local development).*
6. Click **Create** to generate your credentials.
7. Copy the **Client ID** and **Client Secret**.

### Step 5: Configure Secrets in AI Studio
1. Open the **Secrets** or **Settings** panel in the AI Studio UI for your application.
2. Add the following environment variables with your credentials:
   - `GOOGLE_CLIENT_ID`: (Your Google OAuth Client ID)
   - `GOOGLE_CLIENT_SECRET`: (Your Google OAuth Client Secret)
3. Ensure that `APP_URL` is configured to match your deployed URL (AI Studio handles this automatically).

---

## Technical Architecture Overview

### Backend OAuth Callback & Storage
- **Consent URL**: Directed to Google's OAuth 2.0 servers with parameters `access_type=offline`, `prompt=consent`, and a cryptographically signed secure `state` parameter to prevent CSRF attacks.
- **Callback (`/api/calendar/callback`)**: Exposes an endpoint that exchanges the authorization code for access and refresh tokens, parses the `state`, validates authenticity, and stores the tokens securely in Cloud Firestore under `calendar_connections/{uid}`.
- **Server-to-Server Sync**: The server uses `firebase-admin` and `googleapis` to fetch the cached tokens, dynamically refresh them when expired, resolve task modifications, and synchronize bidirectionally with the user's calendars.
