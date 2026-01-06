# BotFlow Backend API

Backend API server for BotFlow WhatsApp AI automation platform.

## 🚀 Quick Start

### Prerequisites

- Node.js 20+
- PostgreSQL (via Supabase)
- Redis (for message queues)
- Bird.com account (WhatsApp BSP)
- OpenAI API key
- Stripe account

### Installation

```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Edit .env with your credentials
```

### Required Environment Variables

1. **Supabase** - Create project at supabase.com
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`

2. **Bird** - Get API credentials from Bird dashboard
   - `BIRD_API_KEY`
   - `BIRD_WORKSPACE_ID`

3. **OpenAI** - Get API key from platform.openai.com
   - `OPENAI_API_KEY`

4. **Stripe** - Get keys from Stripe dashboard
   - `STRIPE_SECRET_KEY`
   - `STRIPE_WEBHOOK_SECRET`

5. **Redis** - Local or cloud instance
   - `REDIS_HOST`
   - `REDIS_PORT`

6. **JWT** - Generate a secure secret
   - `JWT_SECRET` (use: `openssl rand -base64 32`)

### Run Development Server

```bash
npm run dev
```

Server will start on http://localhost:3001

### Build for Production

```bash
npm run build
npm start
```

## 📁 Project Structure

```
botflow-backend/
├── src/
│   ├── config/          # Configuration files
│   │   ├── env.ts       # Environment validation
│   │   ├── logger.ts    # Pino logger setup
│   │   ├── supabase.ts  # Supabase clients
│   │   └── redis.ts     # Redis connection
│   ├── routes/          # API routes
│   │   ├── health.ts    # Health checks
│   │   ├── auth.ts      # Authentication
│   │   ├── organizations.ts
│   │   ├── whatsapp.ts  # Bird integration
│   │   ├── bots.ts      # Bot management
│   │   ├── conversations.ts
│   │   └── webhooks.ts  # Bird & Stripe webhooks
│   ├── services/        # Business logic (TODO)
│   ├── queues/          # BullMQ job processors (TODO)
│   └── server.ts        # Main server file
├── package.json
├── tsconfig.json
└── .env.example
```

## 🔌 API Endpoints

### Health
- `GET /health` - Basic health check
- `GET /health/ready` - Readiness check (DB + Redis)

### Authentication
- `POST /api/auth/signup` - Create account
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Get current user

### Organizations
- `GET /api/organizations/:id` - Get organization
- `PATCH /api/organizations/:id` - Update organization

### WhatsApp
- `POST /api/whatsapp/connect` - Connect WhatsApp account
- `GET /api/whatsapp/accounts` - List accounts
- `POST /api/whatsapp/send` - Send message

### Bots
- `GET /api/bots` - List bots
- `POST /api/bots` - Create bot
- `GET /api/bots/:id` - Get bot
- `PATCH /api/bots/:id` - Update bot
- `DELETE /api/bots/:id` - Delete bot

### Conversations
- `GET /api/conversations` - List conversations
- `GET /api/conversations/:id` - Get conversation
- `GET /api/conversations/:id/messages` - Get messages
- `POST /api/conversations/:id/messages` - Send message

### Webhooks
- `POST /webhooks/bird/whatsapp` - Bird webhook
- `POST /webhooks/stripe` - Stripe webhook

## 🔐 Authentication

All API endpoints (except auth and webhooks) require JWT authentication.

Include token in Authorization header:
```
Authorization: Bearer <your_jwt_token>
```

## 🗄️ Database Setup

Run the SQL schema from `technical_implementation_plan.md` in your Supabase SQL editor to create all tables.

## 🧪 Testing

```bash
npm test
```

## 📝 Development Roadmap

### ✅ Completed
- [x] Server setup with Fastify
- [x] Environment configuration
- [x] Logging with Pino
- [x] Supabase integration
- [x] Redis connection
- [x] Authentication routes
- [x] Route structure
- [x] Error handling
- [x] Health checks

### 🚧 In Progress
- [ ] Bird WhatsApp API integration
- [ ] Message processing queue
- [ ] Bot logic implementation

### 📋 TODO
- [ ] OpenAI GPT-4 integration
- [ ] Stripe billing integration
- [ ] WebSocket for real-time updates
- [ ] Analytics endpoints
- [ ] Rate limiting per organization
- [ ] Comprehensive testing
- [ ] API documentation (Swagger)

## 🚀 Deployment

### Railway

```bash
# Install Railway CLI
npm i -g @railway/cli

# Login
railway login

# Deploy
railway up
```

### Render

1. Connect GitHub repository
2. Set environment variables
3. Deploy

## 📊 Monitoring

- Logs: Pino with structured logging
- Errors: Sentry (TODO)
- Metrics: PostHog (TODO)

## 🤝 Contributing

This is a private project. Contact the team for access.

## 📄 License

Proprietary - BotFlow © 2026
