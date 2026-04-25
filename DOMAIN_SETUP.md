# SansarPay Domain Setup

This guide explains how to connect a custom domain to SansarPay and make shared links render properly on WhatsApp, Facebook, X, and other link preview clients.

## Before You Start

You need:

- A deployed SansarPay app on Vercel or Railway
- A domain name you control
- Access to your DNS provider
- The final public site URL, for example:

```text
https://app.example.com
```

Important:

- Do not include a trailing slash in `VITE_APP_BASE_URL`
- Use the final HTTPS URL only
- Example:

```env
VITE_APP_BASE_URL=https://app.example.com
```

## What This Variable Does

`VITE_APP_BASE_URL` is used to build public family links such as:

```text
https://app.example.com/family/<token>
```

It is also used for:

- Open Graph `og:url`
- Open Graph `og:image`
- the canonical URL in `index.html`

If this value is wrong, WhatsApp shares can open the wrong site or show missing previews.

## Vercel Setup

1. Open your project in Vercel.
2. Go to `Settings` -> `Domains`.
3. Click `Add Domain`.
4. Enter your custom domain, for example `app.example.com`.
5. Follow the DNS records Vercel shows you.
6. After the domain is connected, go to `Settings` -> `Environment Variables`.
7. Add:

```env
VITE_APP_BASE_URL=https://app.example.com
```

8. Redeploy the project so Vite rebuilds the metadata with the correct URL.
9. Open the deployed site on the custom domain and confirm the app loads.

## Railway Setup

1. Open your service in Railway.
2. Go to `Settings` or `Networking` for the service.
3. Add a custom domain such as `app.example.com`.
4. Copy the DNS target Railway gives you.
5. In Railway service variables, set:

```env
VITE_APP_BASE_URL=https://app.example.com
```

6. Trigger a fresh deployment after the variable is saved.
7. Open the custom domain and confirm the app loads from that address.

## DNS Instructions

Your hosting provider will tell you which record to create. Usually it will be one of these:

- `CNAME` for a subdomain like `app.example.com`
- `A` or `ALIAS/ANAME` for an apex domain like `example.com`

Typical flow:

1. Open your DNS provider dashboard.
2. Find the DNS records section.
3. Add the exact record type, name, and target shown by Vercel or Railway.
4. Save the record.
5. Wait for DNS propagation.

Notes:

- Use only the DNS values shown by your host.
- Do not guess record values.
- DNS changes can take a few minutes or longer to appear globally.

## HTTPS Check

After the domain is connected:

1. Visit `https://your-domain`.
2. Confirm the browser shows a secure lock icon.
3. Confirm `http://your-domain` redirects to HTTPS.
4. Confirm a family route loads over HTTPS:

```text
https://your-domain/family/testtoken
```

If HTTPS is not active yet:

- wait for the platform certificate to finish provisioning
- check the domain status in Vercel or Railway
- confirm the DNS record exactly matches the host instructions

## WhatsApp Preview Check

To avoid blank previews:

1. Make sure `VITE_APP_BASE_URL` matches the real public domain.
2. Redeploy after changing the variable.
3. Confirm these files load in the browser:

```text
https://your-domain/og-image.png
https://your-domain/favicon.ico
```

4. Open page source on `https://your-domain` and verify these tags use the correct HTTPS domain:
   - `og:title`
   - `og:description`
   - `og:image`
   - `og:url`
   - `twitter:card`
   - `twitter:image`
5. Share the root URL in WhatsApp and confirm the title, description, and image appear.

Important limitation:

- This static app ships app-level preview metadata.
- Family links such as `/family/<token>` should still use the correct domain, but they will show the shared SansarPay preview unless you later add server-rendered per-route metadata.

## Final Verification Checklist

Run these checks after domain setup:

1. `VITE_APP_BASE_URL` is set to the final HTTPS domain without a trailing slash.
2. `npm run build` passes.
3. `https://your-domain/og-image.png` loads.
4. `https://your-domain/favicon.ico` loads.
5. The home page opens on the custom domain.
6. A family link uses this format:

```text
https://your-domain/family/<token>
```

7. A pasted link in WhatsApp shows:
   - title
   - description
   - preview image
