
# 📄 `chatbot-backend/README.md`

```markdown
# AI Chatbot - Backend

This is the backend for the AI Chatbot.  
It handles authentication, chat management, and AI replies via OpenRouter.

## Features
- User registration and login with JWT
- Protected routes with middleware
- Create, fetch, and delete chat sessions
- AI replies integrated with OpenRouter
- MongoDB persistence for users and chats
- Secure password hashing with bcrypt

## Tech Stack
- Node.js + Express
- MongoDB + Mongoose
- JWT (authentication)
- Bcrypt (password hashing)
- Axios (API calls)

## Setup
1. Install dependencies:
   ```bash
   npm install

2. Create a .env file:
   PORT=5000
   MONGO_URI=your-mongo-uri
   JWT_SECRET=your-secret
   OPENROUTER_API_KEY=your-key

3. Run locally:
    npm start

## API Endpoints
-> POST /api/users/register → Register a new user
-> POST /api/users/login → Login and get token
-> GET /api/chats → Fetch user chats
-> POST /api/chats → Create a new chat
-> GET /api/chats/:id → Get chat messages
-> DELETE /api/chats/:id → Delete chat
-> POST /api/chat → Send message and get AI reply


