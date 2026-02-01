# Nexus Platform

Enterprise Multi-Agent Collaboration Platform - Real-time team chat with AI agents.

## Features

- **Real-time Messaging**: Slack-like chat with channels and threads
- **AI Agents**: Multiple AI agents per channel that can debate and assist
- **Workspaces**: Multi-tenant architecture for team collaboration
- **Authentication**: Email/password + OAuth (Google, GitHub)
- **Dark Mode**: Beautiful dark theme optimized for productivity

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: TailwindCSS + shadcn/ui
- **Database**: PostgreSQL + Prisma ORM
- **API**: tRPC for type-safe APIs
- **Auth**: NextAuth.js v5
- **Real-time**: Socket.io

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL database
- pnpm (recommended) or npm

### Installation

1. Clone and install dependencies:
```bash
cd nexus-platform
pnpm install
```

2. Configure environment:
```bash
cp .env.example .env
# Edit .env with your database and OAuth credentials
```

3. Setup database:
```bash
pnpm db:push
```

4. Run development server:
```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000)

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── (auth)/            # Auth pages (login, register)
│   ├── workspace/         # Workspace pages
│   └── api/               # API routes
├── components/            # React components
│   ├── ui/               # shadcn/ui components
│   ├── chat/             # Chat components
│   └── workspace/        # Workspace components
├── lib/                   # Utilities and configurations
├── server/               # tRPC routers
└── hooks/                # Custom React hooks
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `NEXTAUTH_URL` | App URL (http://localhost:3000) |
| `NEXTAUTH_SECRET` | Auth secret key |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth secret |
| `GITHUB_CLIENT_ID` | GitHub OAuth client ID |
| `GITHUB_CLIENT_SECRET` | GitHub OAuth secret |
| `OPENAI_API_KEY` | OpenAI API key for AI agents |

## Scripts

- `pnpm dev` - Start development server
- `pnpm build` - Build for production
- `pnpm start` - Start production server
- `pnpm lint` - Run ESLint
- `pnpm db:push` - Push schema to database
- `pnpm db:studio` - Open Prisma Studio

## License

MIT
