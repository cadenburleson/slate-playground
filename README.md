# Slate Playground

A minimal static site used to test the [Slate CMS](https://github.com/cadenburleson/slate) — a headless CMS that drops into any site via a single `<script>` tag.

**Live:** _(Cloudflare Pages URL goes here once deployed)_

## What's in it

```
slate-playground/
├── index.html            Landing page
├── about.html            About page
├── contact.html          Contact page
├── 404.html              Not-found page
├── blog/
│   ├── index.html        Blog listing
│   └── hello-world.html  Sample post
├── js/slate.js           Local copy of the Slate snippet
├── css/style.css         Site styles + slate-* content classes
├── _headers              Cloudflare Pages response headers
└── .gitignore
```

Every page has:

- `<header role="banner">` and `<footer role="contentinfo">` — what Slate caches to `localStorage` so it can rebuild brand-new routes.
- `<main>` — the injection target. When the snippet finds a matching slug in the manifest, everything inside is replaced with the CMS blocks.
- The Slate `<script>` in `<head>` with `data-site-id="YOUR_SITE_ID"` — replace this with your real token.

## Connecting to a Slate site

1. In the Slate app, create a site and copy its `snippet_token`.
2. Open `js/slate.js` and set the `API` constant to your Supabase Edge Functions URL:
   ```js
   var API = "https://<your-project-ref>.supabase.co/functions/v1";
   ```
3. Replace `YOUR_SITE_ID` in each HTML file's `<head>`:
   ```html
   <script src="/js/slate.js" data-site-id="abcd1234..." defer></script>
   ```
   (Shell one-liner if you'd rather:)
   ```sh
   find . -name '*.html' -exec sed -i '' 's/YOUR_SITE_ID/your-real-token/g' {} +
   ```
4. Commit and push. Cloudflare Pages redeploys on every push to `main`.

## What's being tested

- **Manifest fetch + slug match** against `window.location.pathname`.
- **Content-area detection** — the snippet walks a selector priority list and prefers `<main>`.
- **Meta injection** — `<title>`, `meta[name=description]`, `og:title`, `og:image`.
- **Shell capture** — header and footer cached in `localStorage` so brand-new routes can be rebuilt without a full page refresh.
- **All block renderers** — heading, paragraph, quote, list, image, divider, service.

## Deploying

This repo is wired for **Cloudflare Pages** with auto-deploy on push to `main`.

### One-time setup in the Cloudflare dashboard

1. [dash.cloudflare.com](https://dash.cloudflare.com) → **Workers & Pages** → **Create** → **Pages** → **Connect to Git**.
2. Authorize the Cloudflare GitHub app and select `slate-playground`.
3. Project settings:
   - **Framework preset:** None
   - **Build command:** _(leave blank)_
   - **Build output directory:** `/`
4. Save and deploy. Future `git push origin main` triggers a deploy automatically.

### Local preview

Just open `index.html` in a browser — it's a plain static site. Or serve it:

```sh
python3 -m http.server 8000
# then visit http://localhost:8000
```

## Custom domain

In Cloudflare Pages → your project → **Custom domains** → add your domain. If the domain is already on Cloudflare, DNS is wired automatically.

## License

MIT.
