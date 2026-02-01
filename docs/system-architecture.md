# Nexus Platform - System Architecture

## Overview

Nexus Platform is a real-time collaboration platform built with Next.js 14, featuring multi-tenant workspaces, channels, threaded messaging, and AI agent integration.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         Client (Browser)                         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐ │
│  │   React     │  │   tRPC      │  │    Socket.io Client     │ │
│  │   UI        │  │   Client    │  │    (Real-time)          │ │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Next.js 14 App Router                       │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐ │
│  │   Pages     │  │   API       │  │    tRPC Router          │ │
│  │   (RSC)     │  │   Routes    │  │    (Type-safe)          │ │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘ │
│  ┌─────────────┐  ┌─────────────────────────────────────────┐   │
│  │  NextAuth   │  │             Prisma ORM                   │   │
│  │  (Auth)     │  │             (Database Layer)             │   │
│  └─────────────┘  └─────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                         PostgreSQL                               │
│  ┌───────┐ ┌───────┐ ┌───────┐ ┌───────┐ ┌───────┐ ┌───────┐   │
│  │ Users │ │Worksp │ │Channel│ │Message│ │ Agent │ │Session│   │
│  └───────┘ └───────┘ └───────┘ └───────┘ └───────┘ └───────┘   │
└─────────────────────────────────────────────────────────────────┘
```

## Core Components

### 1. Authentication (NextAuth v5)
- Email/password with bcrypt hashing
- OAuth providers (Google, GitHub)
- JWT session strategy
- Prisma adapter for user persistence

### 2. API Layer (tRPC)
- Type-safe API with automatic TypeScript inference
- Protected procedures with session validation
- Routers: auth, workspace, channel, message, agent

### 3. Database (Prisma + PostgreSQL)
- Models: User, Workspace, Channel, Message, Agent, Reaction
- Relationships: workspace members, message threads
- Indexes for message queries (channelId, createdAt)

### 4. Real-time (Socket.io)
- WebSocket connections for live updates
- Channel-based room management
- Events: message:new, message:typing, user:online

### 5. AI Agent Integration
- Multiple agent types: Assistant, Coder, Analyst, Researcher
- Per-workspace agent configuration
- OpenAI/OpenClaw API integration (placeholder)

## Data Flow

### Message Flow
1. User types message in MessageInput
2. tRPC mutation sends to server
3. Message created in database
4. Socket.io broadcasts to channel members
5. UI updates via React Query invalidation

### Authentication Flow
1. User submits credentials/OAuth
2. NextAuth validates and creates session
3. JWT token stored in cookie
4. tRPC procedures check session context
5. Prisma queries filtered by userId

## Security

- CSRF protection via NextAuth
- Password hashing (bcrypt, 12 rounds)
- SQL injection prevention (Prisma)
- XSS protection (React escaping)
- Workspace membership validation

## Scalability Considerations

- Database connection pooling (Prisma)
- Message pagination (cursor-based)
- Socket.io room-based broadcasting
- Next.js edge runtime compatible
- CDN for static assets
