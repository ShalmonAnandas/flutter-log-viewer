# Flutter Log Viewer

A modern web platform for visualizing Flutter app logs with rich analytics, timeline views, and deep data inspection.

## Features

- **📊 Rich Dashboard** — Status codes, response times, endpoint performance, error rates, lifecycle timeline
- **🔍 Deep Analysis** — Filter by type (request, response, error, lifecycle, heartbeat, debug, webview, validation), search bodies, inspect headers
- **🖼️ Base64 Image Rendering** — Detects and renders embedded JPEG/PNG images from log bodies with lightbox preview
- **⏱️ Timeline View** — Request-response pair matching, waterfall chart, activity timeline
- **🔗 Shareable Links** — Upload logs and generate unique shareable URLs via Vercel Blob Storage
- **🔐 Optional Login** — Sign in to save logs for later viewing (auto-registration on first login)
- **📱 Modern UI** — Dark theme, responsive design, smooth animations

## Supported Log Patterns

- HTTP Request/Response blocks with headers, bodies, extras
- DioError blocks with exception details
- App lifecycle events (resumed, inactive, paused, hidden)
- Heartbeat timer events (start, stop, tick, API calls)
- WebView messages and page loads
- Debug/state listener messages
- Validation input data
- PersonalDetails keys
- Base64-encoded images (JPEG `/9j/...` and PNG `iVBOR...`)
- Dart map notation and JSON response bodies
- File upload requests with document metadata

## Deploy to Vercel

1. Push this repository to GitHub
2. Import the project on [Vercel](https://vercel.com)
3. Keep the **Root Directory** at the repository root. The included root `package.json` and `vercel.json` forward install/build commands to `web/`, where the actual Next.js app lives.
4. Add the following environment variable:
   - `BLOB_READ_WRITE_TOKEN` — Create a Vercel Blob store and copy the token
5. Deploy!

## Local Development

```bash
cd web
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

> **Note:** Sharing and saving features require `BLOB_READ_WRITE_TOKEN` to be set. Log viewing works fully without it.

## Tech Stack

- **Next.js 16** (App Router)
- **Tailwind CSS v4**
- **Vercel Blob Storage** for shareable links and saved logs
- **TypeScript** throughout
