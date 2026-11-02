# Live Poll

Live polling app — MERN stack + Socket.IO. No accounts: a host creates a room and gets a 6-character join code; students join with that code and a nickname.

## Features (v1)
- Host creates a room; a secret host key is saved in that browser (localStorage)
- Question CRUD: single choice, multiple select, true/false, open text
- Host launches one question at a time and closes it manually
- Students answer once (locked); live results for everyone
- Host also sees who answered what; students only see totals (open text: anonymous list)
- Nicknames unique per room; student refresh keeps identity (sessionStorage, per tab)

## Setup
1. Create a MongoDB Atlas cluster and copy its connection string.
2. `cp server/.env.example server/.env` and set `MONGODB_URI`.
3. Install: `npm run install:all`
4. Run both apps: `npm run dev`
   - Client: http://localhost:5173
   - Server: http://localhost:5001 (Vite proxies `/api` and `/socket.io`)

## Structure
```
server/src
  index.js            Express + Socket.IO bootstrap
  models/             Room, Question, Participant, Response
  routes/             rooms (create/get), questions (host CRUD, x-host-key)
  socket/index.js     host:join, student:join, host:launch, host:close, host:end, student:answer
  services/           results aggregation, question validation
client/src
  pages/              Home, HostRoom (/host/:code), PlayRoom (/play/:code)
  components/         QuestionForm, QuestionList, ResultsView, AnswerForm, ParticipantList
  lib/                api (fetch), socket (socket.io-client), storage
```
