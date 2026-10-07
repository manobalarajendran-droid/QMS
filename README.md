# Plant-Tech Arabia QMS

The quality management dashboard, as a single self-contained folder.
Everything in here is what the app needs to build and go live on Cloudflare
Pages — nothing else.

## What is in here

```
index.html            The page shell, including the boot watchdog
src/                  All application code
public/               Static files copied into the build as-is
  _headers            Cache rules (see "Why the caching rules matter")
  _redirects          Sends every URL to index.html so deep links work
  sw.js               Service worker
  locales/            Translations, 12 languages
  favicon.svg, icons.svg, manifest.json
vite.config.ts        Build settings
tsconfig*.json        TypeScript settings
eslint.config.js      Lint rules
wrangler.toml         Cloudflare project name and output folder
package.json          Dependencies and the commands below
.env.example          Copy to .env only if you run the optional API server
```

## Running it locally

```bash
npm install
npm run dev
```

Opens on http://localhost:5174.

## Deploying to Cloudflare

### Option A — from your machine

```bash
npm install
npm run deploy
```

That builds into `dist/` and uploads it. The first run asks you to log in to
Cloudflare in the browser. The project name comes from `wrangler.toml`
(`planttech-qms`); change it there if you want a different one.

For a test URL that does not touch the live site:

```bash
npm run deploy:preview
```

### Option B — connect the folder to Cloudflare Pages

Push this folder to a Git repository, then in the Cloudflare dashboard choose
**Workers & Pages → Create → Pages → Connect to Git** and set:

| Setting | Value |
| --- | --- |
| Framework preset | Vite |
| Build command | `npm run build` |
| Build output directory | `dist` |
| Node version | 20 or newer |

Every push then rebuilds and publishes automatically.

## Why the caching rules matter

`public/_headers` is not decoration. It is half the fix for the blank-screen
problem:

- Files under `/assets/` have a content hash in their name, so they are cached
  forever. A changed file gets a new name, so a cached copy can never be wrong.
- `index.html`, `sw.js` and `manifest.json` are marked *must-revalidate*, so the
  browser always asks the server whether it has a newer copy.

That second rule is the important one. `index.html` names the exact asset files
for one build. If a browser keeps an old copy after you deploy again, it asks
for files that no longer exist, every request fails, and the page sits on the
loading spinner forever with nothing running. Keeping the HTML fresh stops that
happening in the first place; the boot watchdog in `index.html` catches the rest
and reloads cleanly.

Do not remove `_headers` or `_redirects` from `public/`.

## The optional API server

The dashboard, all the registers, the charts and the reports run entirely in
the browser and save data locally, so they need no server.

Five screens do talk to a backend: Scheduled Reports, Submissions, Quizzes,
Global Search and Impact Analysis. If you run that server, copy `.env.example`
to `.env` and point `VITE_API_URL` at it, then rebuild. If you do not, leave it
unset — those screens simply report that they cannot reach the server, and
nothing else is affected.

The server code itself is not part of this folder. It lives in the full
development repository.
