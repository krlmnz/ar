# Andean Road Studio

A private writing desk for [andean-road.com](https://andean-road.com). Karol opens `https://editor.andean-road.com`, picks one of the twelve templates, writes in the TipTap Simple Editor, and Save / Publish commits markdown into `krlmnz/ar`. Netlify rebuilds the public Eleventy site from that commit.

The public site stays Eleventy. This folder is a separate Next.js app. `npm run build` at the repo root still writes `_site` and ignores `editor/`.

## Local

```bash
cd editor
npm install
cp .env.example .env.local
```

Put a password in `EDITOR_PASSWORD` (and the same value works as the session secret if `AUTH_SECRET` is empty). Then:

```bash
npm run dev
```

Open `http://localhost:3000`. Without `GITHUB_TOKEN`, the studio reads and writes markdown on disk (`CONTENT_SOURCE` defaults to `local` outside production). Point `CONTENT_ROOT` at a checkout if this app is not sitting next to `content/`.

To commit for real from your machine, set `GITHUB_TOKEN` and `CONTENT_SOURCE=github`.

`npm run build` in this folder produces the Next.js output Netlify serves.

## Env vars

| Name | Purpose |
| --- | --- |
| `EDITOR_PASSWORD` | Shared password. httpOnly session cookie. Optional if GitHub OAuth is set. |
| `AUTH_SECRET` | Signs the session cookie. Use a long random string in production. |
| `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` | GitHub OAuth app. Only needed for “Continue with GitHub”. |
| `EDITOR_GITHUB_LOGIN` | Allowlist. Default `krlmnz`. Comma-separated. |
| `CONTENT_OWNER` | Same allowlist fallback. Default `krlmnz`. |
| `GITHUB_TOKEN` | Server-only fine-grained PAT or classic token with **contents: write** on `krlmnz/ar`. |
| `GITHUB_REPO` | Default `krlmnz/ar`. |
| `GITHUB_BRANCH` | Default `main`. |
| `CONTENT_SOURCE` | `github` or `local`. |
| `CONTENT_ROOT` | Disk root for local mode. Defaults to the parent of `editor/`. |
| `PUBLIC_SITE_URL` | Default `https://andean-road.com`. Shown after a commit. |
| `EDITOR_URL` | Default `https://editor.andean-road.com`. Used as the OAuth origin. |

Nothing in this list with a secret is prefixed `NEXT_PUBLIC_`. The browser only receives the session cookie.

### GitHub token

Create a fine-grained personal access token on the account that can push to `krlmnz/ar`:

- Repository access: `krlmnz/ar` only
- Permissions: Contents **Read and write**

Paste it as `GITHUB_TOKEN` in the editor site’s Netlify environment (or `.env.local`). The token is read in server route handlers only.

### GitHub OAuth

Create an OAuth app at GitHub → Settings → Developer settings.

- Homepage: `https://editor.andean-road.com`
- Callback: `https://editor.andean-road.com/api/auth/callback`

Set `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET`. Sign-in is rejected unless the GitHub login is on `EDITOR_GITHUB_LOGIN` (default `krlmnz`). OAuth only proves identity. Commits still use `GITHUB_TOKEN`.

A password gate is enough if you do not want an OAuth app. Set `EDITOR_PASSWORD` and `AUTH_SECRET`.

## How publish works

1. The studio loads `content/**/*.md` (places live at `content/places/<slug>/index.md`).
2. New pages copy `editor/starters/*.md`, which match `_starters/` and `scripts/new.js`: `__TITLE__`, `__SLUG__`, `__DATE__`, `published: false`.
3. The body is TipTap markdown. Front matter stays YAML, including comments from the starter when the file is round-tripped.
4. **Save draft** sets `published: false` and commits `content: update <title>`.
5. **Publish** sets `published: true` and commits `content: publish <title>`.
6. **Unpublish** sets `published: false` and commits `content: unpublish <title>`.
7. The screen links to the public URL (`https://andean-road.com/<slug>/` or `/places/<slug>/`). The page is in the repo immediately. Netlify’s rebuild of the public site usually takes about a minute. Drafts still build, so the URL previews, and they stay out of listings until published.

Images added from the toolbar are committed under `assets/uploads/`.

## Page themes

The theme swatches write `theme:` (`light`, `night`, `note`, `signal`, `news`, `draft`). Leave “Site default” selected to omit the key.

On the public site, that value is the first-paint theme only when the visitor has no `roadtrip-theme` in `localStorage`. A saved Customize view choice wins. **Reset to page theme** clears the saved choice and applies the page theme again. The editor’s sun/moon control is only the writing chrome, not the public theme.

## Netlify and DNS

The public site keeps the repo-root `netlify.toml` (Eleventy, publish `_site`). Do not point that site at `editor/`.

Create a **second** Netlify site from the same repo:

1. Site configuration → Build & deploy → Base directory: `editor`
2. Build command: `npm run build` (also in `editor/netlify.toml`)
3. Node version: `20` (also in `editor/netlify.toml`)
4. The Next.js runtime plugin is listed in `editor/netlify.toml` (`@netlify/plugin-nextjs`). Netlify runs it when the base directory is `editor`.
5. Add the env vars above in Site configuration → Environment variables. Mark `GITHUB_TOKEN`, `AUTH_SECRET`, `EDITOR_PASSWORD`, and `GITHUB_CLIENT_SECRET` as secret.

### DNS

At the DNS host for `andean-road.com`:

```
editor  CNAME  <editor-site-name>.netlify.app
```

In the editor site: Domain management → Add domain `editor.andean-road.com`. Netlify will provision HTTPS after the CNAME resolves.

`CONTENT_SOURCE` should be `github` on Netlify (or simply set `GITHUB_TOKEN` and leave `CONTENT_SOURCE` empty — production will not fall back to local disk).

## Editor

The canvas is TipTap’s open-source Simple Editor template (MIT): toolbar, light/dark chrome, highlight, find and replace, links, lists, tasks, alignment, images. Tables and markdown serialization are added on top (`@tiptap/extension-table`, `@tiptap/markdown`).

Pasting SVG markup into the prose inserts a figure the reader can see. Pasting the same markup inside a code block inserts the source text. Markdown pasted as plain text is parsed into the document.
