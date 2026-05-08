# Realtime Interpreter

A live speech translator that runs in the browser. Speak in one language and see the translation appear in real time, powered by the OpenAI Realtime API.

## How it works

1. The browser requests a short-lived session token from the `/api/translation/session` serverless function
2. The frontend opens a WebSocket directly to the OpenAI Realtime API using that token
3. Microphone audio is streamed to the model, which translates and streams text back live

## Stack

- **Frontend**: React 18, Vite, Tailwind CSS
- **API**: Vercel serverless function (Node.js)
- **AI**: OpenAI Realtime API (`gpt-4o-mini-realtime-preview`)

## Local development

```bash
# Install dependencies
npm --prefix server/client install

# Start the frontend dev server (proxies /api to localhost:3000)
npm run dev
```

For the API you can either run the Express server locally:

```bash
cd server
npm install
OPENAI_API_KEY=sk-... npm run dev
```

Or deploy to Vercel and point the frontend at the deployed URL.

## Deploy to Vercel

1. Import the repository in Vercel
2. Add the environment variable `OPENAI_API_KEY` in your project settings
3. Deploy — Vercel will run `npm run build` and serve the frontend from `server/client/dist`

The `/api/translation/session` route is handled automatically by Vercel's serverless function detection.

## Environment variables

| Variable | Description |
|---|---|
| `OPENAI_API_KEY` | Your OpenAI API key |
