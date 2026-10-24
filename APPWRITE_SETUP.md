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

## 3. Create the Database & Collection

1. In the left sidebar, click **Databases**.
2. Click **Create Database**:
   - **Name:** `F1 Community`
   - **Database ID:** `f1_community` (or click create and copy the generated ID).
3. Inside this database, click **Create Collection**:
   - **Name:** `Poll Votes`
   - **Collection ID:** `votes`

---

## 4. Add Collection Attributes

Inside the `votes` collection, click the **Attributes** tab and add the following 4 attributes:

| Type | Key | Size / Details | Required |
|---|---|---|---|
| **String** | `pollId` | Size: `64` | Yes |
| **String** | `driverId` | Size: `64` | Yes |
| **Integer** | `count` | Min: `1`, Max: `1000` | No (Default: `1`) |
| **String** | `timestamp` | Size: `64` | No |

---

## 5. Set Public Permissions (Allow Visitors to Vote)

To allow visitors on GitHub Pages to read and submit votes without logging in:

1. In the `votes` collection, click the **Settings** tab.
2. Scroll to **Permissions**.
3. Click **+ Add Role** → select **`Any`**.
4. Check both:
   - ✅ **Create** (Allows visitors to submit a vote)
   - ✅ **Read** (Allows the site to display vote totals)
5. Click **Update** at the bottom.

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
