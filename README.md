🤖 AI Notes - Intelligent Note-Taking Application
A modern, full-stack note-taking application powered by AI, built with React/TypeScript frontend and Node.js/Express backend.
✨ Features

- 📝 **Smart Note Management** - Create, edit, organize notes with AI assistance
- 🤖 **AI Chat Integration** - Chat with multiple AI models (DeepSeek, ChatGPT, Claude)
- 🎨 **Modern UI** - Beautiful themes with light/dark mode support
- 🔐 **Secure Authentication** - Email/password + Google OAuth
- 💰 **Freemium Model** - Free tier with Pro subscription ($2/month)
- 📱 **Responsive Design** - Works on desktop, tablet, and mobile
- 🚀 **Real-time Features** - Live updates and notifications
- 🔍 **AI Text Processing** - Summarization, grammar checking, style improvement

- 🚀 Quick Start
Prerequisites

- Node.js 18+ and npm
- PostgreSQL database (Supabase recommended)
- Redis instance (Upstash recommended)
- Email service (Gmail SMTP or Resend)

- Backend Setup
```bash
cd Backend
npm install

Create `.env` file:
```env
# Database
DATABASE_URL=your_postgresql_connection_string
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key

# Redis Cache
REDIS_URL=your_redis_connection_string

# JWT
JWT_SECRET=your_jwt_secret_key
JWT_REFRESH_SECRET=your_jwt_refresh_secret

# Email Service (Choose one)
# Gmail SMTP
GMAIL_USER=your_gmail@gmail.com
GMAIL_PASS=your_app_password

# OR Resend API
RESEND_API_KEY=your_resend_api_key

# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# AI APIs (Optional - DeepSeek is FREE)
DEEPSEEK_API_KEY=your_deepseek_api_key
OPENAI_API_KEY=your_openai_api_key
ANTHROPIC_API_KEY=your_anthropic_api_key

# App Settings
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:8080

Setup database:
```bash
npm run setup-db
npm run dev
