# GPT Flappy Bird (React + Vite)

A tiny Flappy Bird clone built with React + Canvas. Ready for Azure Static Web Apps.

## Local dev

```bash
npm i
npm run dev
```

## Build

```bash
npm run build
npm run preview
```

## Deploy to Azure Static Web Apps (Free)

1. Push this repo to GitHub.
2. In the Azure Portal, create a **Static Web App** (Free plan), connect this GitHub repo, and choose the React preset.
   - **Build command:** `npm run build`
   - **App location:** `/` (root)
   - **Output location:** `dist`
3. Azure will create a GitHub Actions workflow in your repo (`.github/workflows/azure-static-web-apps.yml`).
4. On each push to your chosen branch, Azure will build & deploy automatically.
