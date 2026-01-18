# AI Chatbot — Server (Node/Express)

Backend for an AI chatbot app with **OpenRouter integration**, **JWT-protected APIs**, and **MongoDB persistence** for chats and messages.

## Demo
- API: <ADD_YOUR_RENDER_URL>
- Client repo: <LINK_TO_AI_CHATBOT_CLIENT>

## Features
- Create chat sessions, add messages, fetch chat history
- Calls OpenRouter for AI replies
- Persists user + bot messages in MongoDB
- JWT-protected endpoints
- Clean API structure with middleware

## Tech Stack
- Node.js, Express
- MongoDB, Mongoose
- OpenRouter API
- JWT Auth

## API Endpoints (example)
- `POST /api/chat` — send message, get AI response, save messages
- `GET /api/chats` — list chats for user
- `GET /api/chats/:id` — get messages for a chat
- `DELETE /api/chats/:id` — delete chat

## Environment Variables
- Create .env:
  - PORT=5000
  - MONGO_URI=
  - JWT_SECRET=
  - OPENROUTER_API_KEY=
  - OPENROUTER_MODEL=deepseek/deepseek-chat-v3-0324:free
  - OPENROUTER_BASE_URL=https://openrouter.ai/api/v1/chat/completions
  - OPENROUTER_REFERER=http://localhost:3000

## Roadmap
- Rate limiting + request validation
- Streaming responses
- Better logging/monitoring (pino)

## Getting Started (Local)
```bash
npm install
cp .env.example .env
npm run dev
