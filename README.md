# Bloxyfied (test build)

A static website: login/create account, a marketplace home page, and a Bx shop with subscriptions.
No build step. Plain HTML, CSS and JavaScript, ready for **GitHub + Cloudflare Pages**.

## Files

| File | What it is |
|------|-----------|
| `index.html` | Log in / Create Account page |
| `home.html` | Main site after login (items, profile, users online, items sold) |
| `shop.html` | Buy Bx and subscriptions (test checkout) |
| `app.js` | Shared logic: accounts, Bx balance, subscriptions, items |
| `style.css` | All styling |
| `_headers` | Security headers for Cloudflare |

## How accounts work (important)

- Accounts (username + password) are saved in the visitor's **browser localStorage**, so they stay after closing the tab or refreshing.
- Passwords are **salted and hashed (SHA-256)** and never stored in plain text.
- Because it is browser-only storage, an account exists **only on the device/browser where it was created**. It will not follow the user to another phone/PC, and clearing site data deletes it. That is fine for testing.
- New accounts get **500 free test Bx**.
- Bx purchases and subscriptions are **simulated**. No money moves.

## Upload to GitHub

1. Create an empty repository on https://github.com/new (e.g. `bloxyfied`). Do not add a README there.
2. In this folder, run:

```bash
git init
git add .
git commit -m "Bloxyfied first version"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/bloxyfied.git
git push -u origin main
```

(No git installed? On the GitHub repo page use **Add file > Upload files**, drag in every file from this folder, and commit.)

## Deploy on Cloudflare Pages

1. Go to https://dash.cloudflare.com and open **Workers & Pages**.
2. Click **Create** > **Pages** > **Connect to Git** and pick your `bloxyfied` repo.
3. Build settings:
   - **Framework preset:** None
   - **Build command:** *(leave empty)*
   - **Build output directory:** `/` (or leave empty)
4. Click **Save and Deploy**. In about a minute you get a link like `https://bloxyfied.pages.dev`.
5. Every `git push` to `main` redeploys automatically.

Custom domain: Pages project > **Custom domains** > **Set up a custom domain**.

### Alternative: no GitHub, direct upload

```bash
npm install -g wrangler
wrangler login
wrangler pages deploy . --project-name bloxyfied
```

## Going beyond testing

- **Real accounts across devices:** add a Cloudflare Pages Function + **D1** database (or KV) for users, balances and listings, and move the login code from `app.js` to the server.
- **Real payments:** use Stripe Checkout (or another processor) with a server-side webhook that credits Bx. Never take card numbers on your own pages.
- **Google sign-in:** the button is a placeholder; it needs a Google OAuth client and a server endpoint.
- The "Users Online" and "Items Sold" numbers are demo data.
