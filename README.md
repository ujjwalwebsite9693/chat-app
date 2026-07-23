# Relay — Real-Time Chat Application

A full-stack MERN chat app: React + Vite on the frontend, Node/Express +
Socket.IO + MongoDB on the backend. Users register, message each other (or
groups) instantly, see who's online, and share files — all without a page
refresh.

## Features

- **Fixed**: other people's profile photos now actually render everywhere
  (sidebar, chat header, group members, search results) - previously only
  your own photo displayed
- **Fixed**: "About" bio now visible to other people (was accidentally
  excluded from the data sent to the frontend)
- **Fixed**: the message action menu (reply/edit/delete/react) is now a
  single instance across the whole chat, and its trigger button no longer
  relies on `:hover` - which made it invisible/unreliable on touchscreens
  and was the likely cause of the reported "overlapping" menu
- **Display names & private nicknames** — set an optional display name for
  yourself, and a custom nickname for any contact that only you see
- **Delete & lock chats** — remove a chat from your own list (it comes back
  if there's new activity), or PIN-lock specific chats into a hidden
  "Locked Chats" section
- **Message search** — search inside any conversation and jump straight to
  a result
- **Seen at / read by** — tap the read-tick on your own message to see
  exactly when it was read
- **Media gallery** — tap Files/GIFs/Stickers on someone's profile to
  browse everything shared in that conversation

- **Landing page** — a marketing homepage at `/` for logged-out visitors, with
  a feature overview and sign-up/login links
- **Auth** — register/login with hashed passwords (bcrypt) and JWT sessions
- **Real-time messaging** — Socket.IO delivers messages instantly to everyone
  in the conversation
- **Private, group & Saved Messages chats** — 1:1 conversations, groups with
  admin controls (rename, add/remove members, leave), and a Telegram-style
  "Saved Messages" note-to-self space, always pinned at the top
- **Online/offline presence** — a live status dot (animated "signal pulse"
  when online), with a per-user privacy toggle to hide it
- **Typing indicators & read receipts** — "so-and-so is typing…" plus
  sent/read checkmarks on your own messages
- **Message actions** — reply-to-quote, edit, delete (for me / for everyone),
  and emoji reactions, all live via Socket.IO
- **Emoji, stickers & GIFs** — a built-in emoji picker, a bundled original
  sticker pack, and GIF search (via a server-side Giphy proxy so the API key
  is never exposed to the browser)
- **Voice messages** — record and send audio clips right from the browser
  (MediaRecorder), with in-bubble playback
- **File & image sharing** — upload images/PDFs/docs; images render inline,
  other files show as a download link
- **Profile customization** — profile photo upload, username, bio/status, and
  an "about" section, all editable from Settings
- **Theme customization** — light/dark mode, 6 accent colors, and 8 chat
  wallpapers (presets + custom photo upload), synced to your account
- **Pin, mute & block** — pin important chats to the top, mute noisy ones,
  and block a user to stop them messaging you
- **Profile view** — click anyone's name/avatar (in a 1:1 header or a
  group's member list) to see their photo, bio, last seen, and their
  message/file/GIF/sticker counts *within that conversation only*
- **Private-by-default user lookup** — there is no browsable user directory.
  You can only start a chat with someone by typing their **exact username**;
  nobody is listed by default and partial-match searches reveal nothing
- **Developer page** — an `/developer` route with the app author's bio,
  skills, and project links, reachable from the landing page footer and
  Settings → About
- **Unread counts & notifications** — sidebar badges for unread conversations,
  plus browser desktop notifications for new messages (skipped for muted
  chats)
- **Responsive UI** — usable on mobile: the sidebar and chat pane swap into a
  single-column, back-button navigation below 760px
- **Installable (PWA)** — manifest + service worker + app icons, so it can be
  added to a phone's home screen and launched full-screen once deployed

Not implemented, but the architecture leaves room for them: voice/video
*calls* (as opposed to voice messages - would need WebRTC), end-to-end
encryption, and link-preview cards for shared URLs.

## Project structure

```
chat-app/
├── server/
│   ├── config/db.js            MongoDB connection
│   ├── models/                 User, Conversation, Message (Mongoose)
│   ├── middleware/              auth.js (JWT guard), upload.js (multer)
│   ├── controllers/             route handlers (incl. gifController for Giphy proxy)
│   ├── routes/                  /api/auth, /api/users, /api/conversations, /api/messages, /api/gifs
│   ├── socket/socketHandler.js  all Socket.IO events
│   └── server.js                app entry point
└── client/
    ├── public/
    │   ├── icons/                PWA app icons
    │   └── stickers/             bundled sticker pack (original artwork)
    └── src/
        ├── pages/                Landing, Login, Register, ChatDashboard
        ├── components/           Sidebar, ChatWindow, MessageBubble, SettingsModal,
        │                         GroupInfoModal, EmojiPicker, StickerPicker, GifPicker, etc.
        ├── context/              AuthContext.jsx, AppearanceContext.jsx
        ├── data/                 emojiData.js, stickerData.js
        └── services/             api.js (REST), socket.js (Socket.IO client)
```

## Prerequisites

- Node.js 18+
- A MongoDB database — either running locally, or a free
  [MongoDB Atlas](https://www.mongodb.com/atlas) cluster
- Optional: a free [Giphy API key](https://developers.giphy.com) if you want
  the GIF picker to work (everything else runs fine without it)

## Setup

### 1. Backend

```bash
cd server
cp .env.example .env
# edit .env: set MONGO_URI to your database, and JWT_SECRET to a random string
# optional: set GIPHY_API_KEY to enable the GIF picker
npm install
npm run dev        # starts on http://localhost:5000
```

### 2. Frontend

```bash
cd client
cp .env.example .env    # defaults already point at localhost:5000
npm install
npm run dev              # starts on http://localhost:5173
```

Open `http://localhost:5173`, register two different accounts (e.g. in a
normal window and an incognito window) to try real-time messaging between
them.

## Using it on your phone permanently

A PWA manifest, app icons, and a service worker are already wired in
(`vite-plugin-pwa` in `vite.config.js`), so once it's reachable over HTTPS
you can add it to your home screen like a real app — it opens full-screen,
with its own icon, no browser chrome.

**This requires deploying it.** Service workers and reliable "Add to Home
Screen" behavior need a stable HTTPS URL — a local dev server on your home
Wi-Fi will stop working the moment your phone leaves that network, which
isn't "permanent." Deploy first, then install:

### 1. Deploy

- **Database** — create a free cluster at
  [MongoDB Atlas](https://www.mongodb.com/atlas), get its connection string.
- **Backend** — push `server/` to [Render](https://render.com) or
  [Railway](https://railway.app) as a Node web service. Set its environment
  variables: `MONGO_URI` (from Atlas), `JWT_SECRET` (any long random string),
  `CLIENT_ORIGIN` (your frontend's URL, added after step below).
- **Frontend** — push `client/` to [Vercel](https://vercel.com). Set
  `VITE_API_URL` to `https://your-backend.onrender.com/api` and
  `VITE_SOCKET_URL` to `https://your-backend.onrender.com`. Redeploy, then go
  back and set the backend's `CLIENT_ORIGIN` to your Vercel URL.

### 2. Install it on your phone

- **iPhone (Safari)**: open your deployed URL → Share icon → **Add to Home
  Screen**.
- **Android (Chrome)**: open your deployed URL → ⋮ menu → **Install app** (or
  **Add to Home screen**).

It'll now sit on your home screen with the Relay icon and launch full-screen,
just like any other installed app.

## Using it from your phone during local development

If you just want to test the responsive layout before deploying anything,
the UI already swaps into a single-column, back-button mobile layout below
760px width:

1. Put your phone and computer on the same Wi-Fi network.
2. Find your computer's LAN IP, e.g. `ipconfig` (Windows) or
   `ifconfig | grep inet` (Mac/Linux) — something like `192.168.1.42`.
3. In `client/.env`, point both URLs at that IP instead of `localhost`:
   ```
   VITE_API_URL=http://192.168.1.42:5000/api
   VITE_SOCKET_URL=http://192.168.1.42:5000
   ```
4. In `server/.env`, allow that origin: `CLIENT_ORIGIN=http://192.168.1.42:5173`
5. Restart both `npm run dev` processes, then visit
   `http://192.168.1.42:5173` in your phone's browser. `vite.config.js`
   already binds to your LAN (`host: true`), so no extra flags are needed.

Note: the service worker and "Add to Home Screen" won't fully work over
plain `http://<lan-ip>` — that's expected, and resolves once deployed to a
real HTTPS domain.

## How the real-time layer works

- The client connects to Socket.IO with the JWT in the handshake
  (`services/socket.js`); the server verifies it before allowing the
  connection (`socket/socketHandler.js`).
- Each user joins a personal room (`user:<id>`) for cross-device updates
  (new conversations, unread badges, group changes) and a room per open
  conversation (`conversation:<id>`) for message delivery.
- Client→server events: `send_message`, `edit_message`, `delete_message`,
  `toggle_reaction`, `typing`, `stop_typing`, `mark_read`, `group_updated`
  (a client-triggered nudge after a REST group change, so other members'
  sidebars refresh).
- Server→client events: `receive_message`, `message_edited`,
  `message_deleted`, `message_reaction_updated`, `message_read`,
  `conversation_updated`, `user_status_changed`, `user_typing`,
  `user_stop_typing`, `group_updated`.
- Blocking is enforced twice: once at conversation-creation time (REST) and
  again at send-time (socket), so blocking someone mid-conversation actually
  stops new messages both ways.
