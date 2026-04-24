# DataInsights - AI-Powered Analytics & Business Platform

## Overview
DataInsights is an AI-powered analytics platform designed for MSMEs, offering data integration, AI-driven dashboards, and natural language querying. It includes a comprehensive Business Suite for operations, team management, and AI strategy, catering to various industries with features like EOD reporting, AI revenue forecasting, and Performance Improvement Plan generation.

## User Preferences
I prefer iterative development with a focus on core features first. Please ask for confirmation before making any significant architectural changes or adding new external dependencies. I value clear, concise communication and prefer explanations that focus on "why" rather than just "how".

## System Architecture

### Frontend
The frontend is built with React and TypeScript, utilizing `wouter` for routing, `TanStack Query v5` for state management, and `shadcn/ui` with `Tailwind CSS` for a premium gold/black themed (dark mode default) user interface. Animations are handled by `framer-motion`, and charts are rendered using `Recharts`. Authentication is managed via `Firebase Auth` (Google, GitHub, Email/Password).

### Backend
The backend is an Express.js application written in TypeScript. It uses `PostgreSQL` with `Drizzle ORM` for data persistence. `Firebase Auth` is integrated for user authentication with ID token verification. Google OAuth is used for Google Sheets access. AI capabilities are a hybrid model, utilizing `Gemini 2.5 Flash` for dashboard generation and free-tier chat, and `Groq Llama 3.1 70B` for premium, ultra-fast chat.

### Core Features
- **Multi-source Data Import**: Supports Google Sheets (via OAuth) and Excel/CSV file uploads.
- **AI Dashboard Generation**: Automatic chart and KPI generation using Gemini AI.
- **Natural Language Chat**: Users can query their data using natural language.
- **Public Sharing**: Dashboards can be shared via token-based links.
- **Interactive Onboarding**: A 4-step tutorial guides new users.
- **RAG-Enhanced Chat**: Premium users benefit from vector embeddings and semantic search for precise answers.
- **AI Business Intelligence**: Features include AI Revenue Forecasts, AI Performance Improvement Plan (PIP) generation, and exportable business performance reports.
- **Business Suite**: Comprehensive tools for MSMEs including industry-adaptive EOD entry systems, team management (roles, invites), salary and incentive configurations, employee target setting, and an operations dashboard for performance overview.

### Data Parsing
Robust error handling, automatic date detection, floating-point correction, duplicate header management, empty column auto-naming, and empty row filtering are implemented for Excel/CSV uploads, with plan-based limits on file size and count.

### Hybrid AI Architecture
- **Chat Responses**: Prioritizes Groq for premium users for speed, falling back to Gemini; includes an `aiProvider` field in responses.
- **Dashboard Generation**: Exclusively uses Gemini for consistent structured output, with plan-enforced daily limits.

### Business Suite Architecture
- **Industry Templates**: 12 pre-configured industry templates for various business types, including defined verticals, KPIs, and expense categories.
- **Setup Wizard**: A guided 4-step process for business profile, industry, verticals, and team invitation.
- **Team Management**: Supports owner, manager, and employee roles with invite mechanisms.
- **EOD Tracking**: Employees submit daily performance, with industry-adaptive metric labels and expense tracking. Managers can review EODs and access team performance dashboards.
- **RAG Pipeline**: Integrates `document_chunks` table, `Gemini text-embedding-004` for embeddings, and cosine similarity for retrieval, with auto-indexing on data import.

## External Dependencies
- **Firebase**: For user authentication (`Firebase Auth`).
- **Google Cloud Platform**: `Gemini 2.5 Flash` API for AI capabilities, Google OAuth for Sheets integration.
- **Groq**: `Groq API` (Llama 3.1 70B) for premium AI chat.
- **PostgreSQL**: Database for all persistent data storage.
- **Drizzle ORM**: Used for database interactions.
- **Render**: Potential deployment platform (implied by `DATABASE_URL` and general cloud-native approach).