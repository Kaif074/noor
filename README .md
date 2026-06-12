# 🌸 Noor AI — Orchid AI Coding Assistant

Fullscreen personal AI coding assistant with animated face, Firebase storage, voice I/O, and custom Q&A.

## Files
- `index.html` — main app shell
- `app.css` — all styles (edit colors/layout here)
- `app.js` — all logic: Firebase, Groq API, voice, expressions, Q&A

## Setup

### 1. Get free Groq API key
Go to [console.groq.com](https://console.groq.com) → API Keys → Create Key (starts with `gsk_`)

### 2. Run locally
Just open `index.html` in Chrome. On first load tap ⚙ settings and paste your key.

### 3. Push to GitHub
```bash
git init
git add .
git commit -m "feat: noor ai — fullscreen coding assistant"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/noor-ai.git
git push -u origin main
```

### 4. Deploy to Vercel
1. Go to [vercel.com](https://vercel.com) → New Project → Import your repo
2. Framework: **Other**
3. Click **Deploy** ✦

### 5. Raspberry Pi kiosk mode
```bash
chromium-browser --kiosk --noerrdialogs https://your-noor-ai.vercel.app
```

## Features
- 🤖 Fullscreen animated robot face with 6 expressions
- 🎤 Voice input (Web Speech API) + female anime-style TTS voice
- 💬 Chat with Llama 3.1 via Groq (free, blazing fast)
- 📋 10 coding shortcut buttons + custom Q&A you can add
- 🔥 Firebase Realtime DB stores all conversations at `Noor_01`
- 📋 Attendance trigger → opens `https://te.eraind.org/auth`
- ⚙ Voice speed/pitch controls in settings
