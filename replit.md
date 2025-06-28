# PeaceBoard - Educational Kindness Platform

## Overview

PeaceBoard is a comprehensive educational platform focused on empathy-building, kindness activities, and emotional intelligence development. The application combines interactive games, AI-powered guidance, mindfulness music, achievement systems, and real-time analytics to create a supportive learning environment for students and educators.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript
- **Build Tool**: Vite for fast development and optimized builds
- **Styling**: Tailwind CSS with Shadcn/UI component library
- **State Management**: TanStack React Query for server state management
- **Routing**: Wouter for lightweight client-side routing
- **Animations**: Framer Motion for smooth interactions and transitions
- **UI Components**: Radix UI primitives with custom Shadcn/UI styling

### Backend Architecture
- **Runtime**: Node.js with Express.js server
- **Language**: TypeScript with ES modules
- **Database ORM**: Drizzle ORM for type-safe database operations
- **Database**: PostgreSQL (Neon serverless configuration)
- **API Design**: RESTful APIs with Express route handlers
- **AI Integration**: OpenAI GPT-4o for chatbot and game feedback

### Project Structure
- `/client/` - React frontend application
- `/server/` - Express.js backend server
- `/shared/` - Shared TypeScript schemas and types
- `/attached_assets/` - Project requirements and specifications

## Key Components

### Authentication System
- **Multi-user support**: School administrators, students, and guest users
- **Guest sessions**: Temporary access with expiration handling
- **School integration**: Domain-based authentication for educational institutions
- **Session management**: Local storage with validation for user persistence

### Game System
- **20+ Educational Games**: Interactive scenarios covering empathy, social skills, conflict resolution, and kindness activities
- **Progress Tracking**: Star ratings, scores, and completion status
- **Categories and Difficulty**: Filterable content by category (empathy, social-skills, conflict-resolution, kindness) and difficulty levels
- **AI Feedback**: Personalized feedback generation using OpenAI for game completion

### Music Center
- **Curated Content**: Nature sounds, meditation music, ambient tracks, and instrumental pieces
- **Full Music Player**: Play/pause, skip, volume control, seek functionality
- **Wellness Integration**: Mindfulness tips and breathing exercises
- **Category Filtering**: Organized by music type for easy discovery

### AI Chatbot
- **GPT-4o Integration**: Real-time emotional support and guidance
- **Voice Input**: Web Speech API for accessibility
- **Interactive Features**: Typing animations, emoji reactions, quick replies
- **Context-Aware**: Specialized prompts for educational and emotional support scenarios

### Achievement & Leaderboard System
- **Progress Tracking**: User achievements, points, and completion statistics
- **Ranking System**: Weekly, monthly, and all-time leaderboards
- **Gamification**: Star ratings, badges, and progress visualization
- **Real-time Updates**: Live leaderboard updates and user ranking

### Analytics Dashboard (School Users)
- **Student Metrics**: Active users, game completion rates, session times
- **Category Breakdown**: Usage statistics by game categories
- **Progress Monitoring**: Individual and class-wide progress tracking
- **Engagement Analytics**: Weekly activity patterns and participation rates

## Data Flow

1. **User Authentication**: Users authenticate through school, student, or guest flows
2. **Game Interaction**: Users play games, with progress automatically saved to database
3. **AI Processing**: Game completion triggers AI feedback generation
4. **Progress Aggregation**: User activities update leaderboards and analytics in real-time
5. **Music Streaming**: Music player manages local state while tracking usage patterns
6. **Chat Integration**: AI chatbot processes messages and maintains conversation history

## External Dependencies

### Core Dependencies
- **@neondatabase/serverless**: PostgreSQL database connection
- **drizzle-orm**: Type-safe database operations
- **@tanstack/react-query**: Server state management
- **framer-motion**: Animation library
- **@radix-ui/***: Accessible UI components
- **tailwindcss**: Utility-first CSS framework
- **openai**: AI chatbot integration

### Development Tools
- **vite**: Build tool and development server
- **typescript**: Type safety and developer experience
- **drizzle-kit**: Database migrations and schema management
- **esbuild**: Fast bundling for production builds

## Deployment Strategy

### Development Environment
- **Hot Module Replacement**: Vite HMR for fast development iteration
- **Type Checking**: Real-time TypeScript validation
- **Database Migrations**: Drizzle Kit for schema management
- **Environment Variables**: Separate configuration for development/production

### Production Build
- **Client Build**: Vite optimized bundle with code splitting
- **Server Build**: ESBuild bundle for Node.js deployment
- **Static Assets**: Optimized images and fonts
- **Database**: Neon PostgreSQL serverless deployment

### Environment Configuration
- **DATABASE_URL**: PostgreSQL connection string (required)
- **OPENAI_API_KEY**: OpenAI API access for AI features
- **NODE_ENV**: Environment mode (development/production)

Changelog:
- June 28, 2025. Initial setup

## User Preferences

Preferred communication style: Simple, everyday language.