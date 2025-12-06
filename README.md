# Chainly

<div align="center">
  <img src="public/logos/logo.svg" alt="Chainly Logo" width="120" height="120" />

**A modern workflow automation platform**

Build powerful automated workflows with a visual editor. Connect triggers, execute actions, and automate your processes with ease.

[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-blue?logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Prisma](https://img.shields.io/badge/Prisma-7-2D3748?logo=prisma)](https://www.prisma.io/)

</div>

---

## Overview

Chainly is a workflow automation platform similar to n8n, Zapier, or IFTTT. It allows users to create visual workflows by connecting trigger nodes (that start executions) with execution nodes (that perform actions). The system uses Inngest for reliable background job execution with real-time status updates.

## Features

- **Visual Workflow Editor** - Drag-and-drop interface built with React Flow for creating and managing workflows
- **Trigger Nodes** - Start workflows manually, via webhooks, schedules, or external events
- **Execution Nodes** - Perform actions like sending emails, calling APIs, AI processing, and more
- **Real-time Updates** - Live status updates during workflow execution via Inngest realtime channels
- **Credential Management** - Secure encrypted storage for API keys and OAuth tokens
- **Human-in-the-Loop** - Approval nodes for workflows requiring manual intervention
- **Data Flow** - Handlebars templates for passing data between nodes

### Supported Integrations

| Service         | Type              | Description                       |
| --------------- | ----------------- | --------------------------------- |
| Gmail           | Trigger/Execution | Email automation with Gmail       |
| Google Calendar | Trigger           | Calendar event triggers           |
| Google Forms    | Trigger           | Form submission triggers          |
| Discord         | Execution         | Send messages to Discord channels |
| OpenAI          | Execution         | GPT-powered AI processing         |
| Anthropic       | Execution         | Claude AI integration             |
| Google Gemini   | Execution         | Gemini AI processing              |
| Resend          | Execution         | Transactional emails              |
| HTTP Request    | Execution         | Custom API calls                  |

## Tech Stack

- **Framework**: [Next.js 16](https://nextjs.org/) with App Router
- **Database**: PostgreSQL via [Prisma](https://www.prisma.io/) with [Neon](https://neon.tech/) adapter
- **API**: [tRPC](https://trpc.io/) with React Query
- **Authentication**: [better-auth](https://www.better-auth.com/) (email/password + GitHub/Google OAuth)
- **Background Jobs**: [Inngest](https://www.inngest.com/) with realtime channels for status updates
- **UI**: [React Flow](https://reactflow.dev/) for workflow canvas, [Radix UI](https://www.radix-ui.com/) primitives, [Tailwind CSS](https://tailwindcss.com/)
- **State Management**: [Jotai](https://jotai.org/) for editor state, [nuqs](https://nuqs.47ng.com/) for URL query params
- **AI SDK**: [Vercel AI SDK](https://sdk.vercel.ai/) for multi-provider AI support

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm 10+
- PostgreSQL database (or [Neon](https://neon.tech/) account)

### Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/TheoEwzZer/Chainly.git
   cd chainly
   ```

2. **Install dependencies**

   ```bash
   pnpm install
   ```

3. **Set up environment variables**

   ```bash
   cp .env.example .env
   ```

   Configure the following variables:

   ```env
   # Database
   DATABASE_URL="postgresql://..."

   # Authentication
   BETTER_AUTH_SECRET="your-secret-key"
   BETTER_AUTH_URL="http://localhost:3000"

   # OAuth Providers (optional)
   GITHUB_CLIENT_ID=""
   GITHUB_CLIENT_SECRET=""
   GOOGLE_CLIENT_ID=""
   GOOGLE_CLIENT_SECRET=""

   # Inngest
   INNGEST_EVENT_KEY=""
   INNGEST_SIGNING_KEY=""

   # Encryption
   ENCRYPTION_KEY="your-32-character-encryption-key"
   ```

4. **Set up the database**

   ```bash
   npx prisma migrate dev
   ```

5. **Start the development servers**

   ```bash
   pnpm run dev:all
   ```

   This starts both the Next.js dev server and Inngest dev server using [mprocs](https://github.com/pvolok/mprocs).

6. **Open the application**

   Navigate to [http://localhost:3000](http://localhost:3000)

## Development Commands

```bash
# Run both Next.js and Inngest dev servers
pnpm run dev:all

# Run individually
pnpm run dev          # Next.js dev server (port 3000)
pnpm run inngest:dev  # Inngest dev server (port 8288)

# Build for production
pnpm run build

# Lint the codebase
pnpm run lint

# Database commands
npx prisma format          # Format schema file
npx prisma generate        # Generate Prisma client
npx prisma migrate dev     # Apply migrations in development
npx prisma studio          # Open Prisma Studio GUI
```

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── (auth)/            # Auth pages (login, register)
│   ├── (dashboard)/       # Protected dashboard pages
│   └── api/               # API routes (auth, trpc, inngest)
├── features/              # Feature-based organization
│   ├── auth/              # Authentication components
│   ├── workflows/         # Workflow management (CRUD, editor)
│   ├── executions/        # Execution nodes and components
│   ├── triggers/          # Trigger nodes
│   ├── credentials/       # Credential management
│   ├── approvals/         # Human approval workflow
│   └── editor/            # Workflow editor state/utils
├── config/                # Node registration
│   ├── node-types.ts      # Node metadata and options
│   └── node-component.ts  # React Flow node components
├── inngest/               # Background job infrastructure
│   ├── functions.ts       # Main workflow execution function
│   ├── channels/          # Realtime channels per node type
│   └── utils.ts           # Topological sorting utilities
├── trpc/                  # tRPC setup and routers
├── components/            # Shared UI components
│   ├── ui/               # Base UI primitives
│   └── react-flow/       # React Flow custom components
└── lib/                   # Core utilities
    ├── auth.ts           # better-auth configuration
    ├── db.ts             # Prisma client singleton
    └── encryption.ts     # Credential encryption
```

## Architecture

### Workflow Execution Flow

1. **Trigger** - A trigger fires (manual, webhook, schedule, etc.)
2. **Orchestration** - Inngest `executeWorkflow` function orchestrates execution
3. **Execution** - Nodes execute in topological order via executor registry
4. **Status Updates** - Each executor publishes updates (`loading`, `success`, `error`) via realtime channels
5. **Data Passing** - Results are stored in workflow context and passed to subsequent nodes
6. **Templating** - Handlebars templates (`{{variableName}}`) enable data flow between nodes

### Node System

Each workflow node consists of:

| File          | Purpose                                      |
| ------------- | -------------------------------------------- |
| `node.tsx`    | React Flow UI component                      |
| `dialog.tsx`  | Configuration dialog (Zod + react-hook-form) |
| `executor.ts` | Server-side execution logic                  |
| `actions.ts`  | Server actions for realtime tokens           |
| `channel.ts`  | Realtime channel definition                  |

## Adding New Nodes

See the [developer guide](.cursor/rules/developer-guide-add-new-nodes.mdc) for comprehensive instructions on adding new nodes, including:

- Step-by-step implementation guide
- Code templates and patterns
- Reference examples (Discord, OpenAI, HTTP Request)
- Troubleshooting checklist

## Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Import the project in [Vercel](https://vercel.com)
3. Configure environment variables
4. Deploy

### Docker

```bash
docker build -t chainly .
docker run -p 3000:3000 chainly
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

<div align="center">
  Built with Next.js, React Flow, and Inngest
</div>
