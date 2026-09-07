# Cloudflare Pages Deployment Guide — Plant-Tech Arabia QMS

This package is configured for zero-friction deployment to **Cloudflare Pages**.

---

## ⚡ Option 1: Fast One-Command CLI Deployment (Recommended)

You can deploy directly from your local terminal using Wrangler:

### Step 1: Login to Cloudflare (one-time)
```bash
npx wrangler login
```
*A browser window will open asking you to authorize Cloudflare.*

### Step 2: Deploy to Production
```bash
npm run deploy
```
*This will:*
1. Run strict TypeScript validation (`tsc -b`)
2. Build the optimized production bundle (`vite build`) with `_redirects` and `_headers`
3. Upload the build directly to Cloudflare Pages and output your live `*.pages.dev` URL!

### Step 3: Deploy to a Preview / Staging Branch (Optional)
```bash
npm run deploy:preview
```

---

## 🌐 Option 2: Connect Git Repository to Cloudflare Dashboard

If your repository is on GitHub or GitLab, you can set up continuous deployment:

1. Go to the [Cloudflare Dashboard](https://dash.cloudflare.com/) ➔ **Compute (Workers & Pages)** ➔ **Create application** ➔ **Pages** ➔ **Connect to Git**.
2. Select your repository (`QMS Dashboard` / `QAtrial`).
3. Set the build settings:
   - **Framework preset**: `Vite`
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
   - **Root directory**: `/` (or `QAtrial` if monorepo)
4. Under **Environment variables**, set:
   - `NODE_VERSION`: `20` (or `22`)
5. Click **Save and Deploy**.

Cloudflare will automatically build and deploy every time you push to `main` (production) or PR branches (preview URLs).

---

## 🛡️ Built-in Cloudflare Configuration

- **`wrangler.toml`**: Configures the project name (`planttech-qms`) and build output directory (`dist`).
- **`public/_redirects`**: Automatically copied to `dist/_redirects` during build. Ensures Single Page Application (SPA) client-side routing functions seamlessly without 404 errors on deep routes (e.g. `/audit/...`, `/supplier/...`).
- **`public/_headers`**: Enforces security headers (`X-Frame-Options`, `X-Content-Type-Options: nosniff`, strict referrer policy) and static asset caching (`Cache-Control: immutable` on `/assets/*`).
- **`.gitignore`**: Configured to ignore `.wrangler` local state and credentials.
