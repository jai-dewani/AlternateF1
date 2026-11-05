# ⚡ Appwrite Cloud Setup Guide for AlternateF1

This document guides you through setting up a **100% free** Appwrite Cloud backend for live community voting on [AlternateF1](https://jai-dewani.github.io/AlternateF1/).

> **Note:** The app already works immediately in offline/local-storage mode. Following these steps enables **live real-time voting across all users**.

---

## 1. Create a Free Account & Project

1. Go to [cloud.appwrite.io](https://cloud.appwrite.io/) and sign up / log in.
2. Click **Create Project**.
3. Name it: **`AlternateF1`** (or any name you prefer).
4. Copy your **Project ID** from the Project Overview settings.

---

## 2. Add Your Web Platform (CORS Authorization)

To allow your GitHub Pages site and localhost to talk to Appwrite:

1. Inside your project dashboard, scroll to **Integrations** or **Platforms**.
2. Click **Add Platform** → Select **Web App**.
3. Fill in:
   - **Name:** `AlternateF1 Web`
   - **Hostname 1:** `jai-dewani.github.io`
   - **Hostname 2:** `localhost` (for local development)
4. Click **Next** to save.

---

## 3. Create the Database & Collections

1. In the left sidebar, click **Databases**.
2. Click **Create Database**:
   - **Name:** `F1 Community`
   - **Database ID:** `f1_community` (or click create and copy the generated ID).
3. Inside this database, create two collections:
   - Collection 1: **Poll Votes** (Collection ID: `votes`)
   - Collection 2: **Podium Predictions** (Collection ID: `predictions`)

---

## 4. Add Collection Attributes

### A. Inside the `votes` collection:
Click the **Attributes** tab and add the following 4 attributes:

| Type | Key | Size / Details | Required |
|---|---|---|---|
| **String** | `pollId` | Size: `64` | Yes |
| **String** | `driverId` | Size: `64` | Yes |
| **Integer** | `count` | Min: `1`, Max: `1000` | No (Default: `1`) |
| **String** | `timestamp` | Size: `64` | No |

### B. Inside the `predictions` collection:
Click the **Attributes** tab and add the following 6 attributes:

| Type | Key | Size / Details | Required |
|---|---|---|---|
| **Integer** | `round` | Min: `1`, Max: `30` | Yes |
| **String** | `userId` | Size: `64` | Yes |
| **String** | `p1` | Size: `64` | Yes |
| **String** | `p2` | Size: `64` | Yes |
| **String** | `p3` | Size: `64` | Yes |
| **String** | `timestamp` | Size: `64` | No |

---

## 5. Set Public Permissions (Allow Visitors to Vote & Predict)

To allow visitors on GitHub Pages to read and submit votes/predictions without logging in:

1. For **both** the `votes` and `predictions` collections:
2. Click the **Settings** tab.
3. Scroll to **Permissions**.
4. Click **+ Add Role** → select **`Any`**.
5. Check:
   - ✅ **Create** (Allows visitors to submit a vote or prediction)
   - ✅ **Read** (Allows the site to display vote totals and community consensus)
   - ✅ **Update** (Allows visitors to edit their prediction before qualifying)
6. Click **Update** at the bottom.

---

## 6. Connect to Your Codebase

Create a `.env` file in the root of `/Users/jaikumardewani/Projects/alt-f1` (or set repository secrets in GitHub):

```env
VITE_APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1
VITE_APPWRITE_PROJECT_ID=your_project_id_here
VITE_APPWRITE_DATABASE_ID=f1_community
VITE_APPWRITE_COLLECTION_ID=votes
```

For automatic GitHub Actions deployments with Appwrite enabled:
- Go to your repo on GitHub: **Settings → Secrets and variables → Actions**.
- Add a new repository secret: `VITE_APPWRITE_PROJECT_ID` with your Appwrite Project ID.

That's it! Your site will now sync votes live with real-time WebSocket updates.
