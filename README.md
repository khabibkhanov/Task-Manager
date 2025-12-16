<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

[circleci-image]: https://img.shields.io/circleci/build/github/nestjs/nest/master?token=abc123def456
[circleci-url]: https://circleci.com/gh/nestjs/nest

  <p align="center">A progressive <a href="http://nodejs.org" target="_blank">Node.js</a> framework for building efficient and scalable server-side applications.</p>
    <p align="center">
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/v/@nestjs/core.svg" alt="NPM Version" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/l/@nestjs/core.svg" alt="Package License" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/dm/@nestjs/common.svg" alt="NPM Downloads" /></a>
<a href="https://circleci.com/gh/nestjs/nest" target="_blank"><img src="https://img.shields.io/circleci/build/github/nestjs/nest/master" alt="CircleCI" /></a>
<a href="https://discord.gg/G7Qnnhy" target="_blank"><img src="https://img.shields.io/badge/discord-online-brightgreen.svg" alt="Discord"/></a>
<a href="https://opencollective.com/nest#backer" target="_blank"><img src="https://opencollective.com/nest/backers/badge.svg" alt="Backers on Open Collective" /></a>
<a href="https://opencollective.com/nest#sponsor" target="_blank"><img src="https://opencollective.com/nest/sponsors/badge.svg" alt="Sponsors on Open Collective" /></a>
  <a href="https://paypal.me/kamilmysliwiec" target="_blank"><img src="https://img.shields.io/badge/Donate-PayPal-ff3f59.svg" alt="Donate us"/></a>
    <a href="https://opencollective.com/nest#sponsor"  target="_blank"><img src="https://img.shields.io/badge/Support%20us-Open%20Collective-41B883.svg" alt="Support us"></a>
  <a href="https://twitter.com/nestframework" target="_blank"><img src="https://img.shields.io/twitter/follow/nestframework.svg?style=social&label=Follow" alt="Follow us on Twitter"></a>
</p>
  <!--[![Backers on Open Collective](https://opencollective.com/nest/backers/badge.svg)](https://opencollective.com/nest#backer)
  [![Sponsors on Open Collective](https://opencollective.com/nest/sponsors/badge.svg)](https://opencollective.com/nest#sponsor)-->

## Description

Task Manager API - A comprehensive task management system built with NestJS, Prisma, PostgreSQL, and Redis.

### Features

- 🔐 **Authentication & Authorization** - JWT-based authentication with role-based access control
- 🏢 **Company Management** - Multi-tenant company support
- 👥 **User Management** - User CRUD with role management (SUPERADMIN, ADMIN, MANAGER, USER)
- 📋 **Task Management** - Full CRUD operations for tasks
- ✅ **Checklists** - Task checklist items management
- 📎 **File Uploads** - File attachments for tasks
- 👨‍👩‍👧‍👦 **Groups** - Organize tasks into groups
- 🔍 **Filtering & Search** - Advanced filtering and search capabilities
- 📚 **Swagger Documentation** - Auto-generated API documentation

### Tech Stack

- **Framework**: NestJS 11
- **Language**: TypeScript 5.7
- **Database**: PostgreSQL with Prisma ORM
- **Cache**: Redis (ioredis)
- **Authentication**: JWT (passport-jwt)
- **File Upload**: Multer
- **Testing**: Jest
- **Package Manager**: pnpm

## Prerequisites

- Node.js >= 18
- PostgreSQL >= 14
- Redis >= 6
- pnpm >= 8

## Project Setup

### 1. Clone the repository

```bash
git clone <repository-url>
cd task
```

### 2. Install dependencies

```bash
pnpm install
```

### 3. Environment Configuration

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

Edit `.env` with your configuration:

```env
PORT=8000
DATABASE_URL=postgresql://user:password@localhost:5432/task
JWT_SECRET=your-secret-key-change-in-production
REDIS_URL=redis://127.0.0.1:6379
```

### 4. Database Setup

```bash
# Generate Prisma Client
pnpm prisma:generate

# Run migrations
pnpm prisma:migrate:dev

# Or push schema (for development)
pnpm prisma:db-push
```

### 5. Start Redis

Make sure Redis is running on your system:

```bash
# macOS (with Homebrew)
brew services start redis

# Linux
sudo systemctl start redis

# Docker
docker run -d -p 6379:6379 redis:latest
```

### 6. Run the application

```bash
# Development mode
pnpm start:dev

# Production mode
pnpm start:prod
```

The API will be available at:
- **API**: http://localhost:8000/api
- **Swagger Docs**: http://localhost:8000/api/docs

## Available Scripts

```bash
# Development
pnpm start:dev          # Start in watch mode
pnpm start:debug        # Start in debug mode

# Production
pnpm build              # Build the project
pnpm start:prod         # Start production server

# Database
pnpm prisma:generate    # Generate Prisma Client
pnpm prisma:migrate:dev # Run migrations
pnpm prisma:db-push     # Push schema to database
pnpm prisma:studio      # Open Prisma Studio

# Testing
pnpm test               # Run unit tests
pnpm test:watch         # Run tests in watch mode
pnpm test:cov           # Run tests with coverage
pnpm test:e2e           # Run e2e tests

# Code Quality
pnpm lint               # Run ESLint
pnpm format             # Format code with Prettier
```

## API Documentation

Once the application is running, visit:
- **Swagger UI**: http://localhost:8000/api/docs

The API includes:
- Authentication endpoints (register, login)
- User management endpoints
- Company management endpoints
- Group management endpoints
- Task management endpoints (with checklists and file uploads)

## Project Structure

```
src/
├── auth/           # Authentication module
│   ├── decorators/ # Custom decorators
│   ├── dto/        # Data transfer objects
│   ├── guards/     # Auth guards
│   └── strategies/ # JWT strategy
├── companies/      # Company management
├── files/          # File upload service
├── groups/         # Group management
├── prisma/         # Prisma service
├── redis/          # Redis service
├── tasks/          # Task management
└── users/          # User management
```

## Testing

The project includes comprehensive test coverage:

- **Unit Tests**: Service and controller tests
- **E2E Tests**: End-to-end integration tests

Run tests:

```bash
# All tests
pnpm test

# Watch mode
pnpm test:watch

# Coverage report
pnpm test:cov
```

## Role-Based Access Control

The system supports the following roles:

- **SUPERADMIN**: Full system access, can view all companies
- **ADMIN**: Company-level admin, manages users and company settings
- **MANAGER**: Can manage tasks and groups within company
- **USER**: Standard user, can create and manage own tasks

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is [MIT licensed](LICENSE).

## Deployment

When you're ready to deploy your NestJS application to production, there are some key steps you can take to ensure it runs as efficiently as possible. Check out the [deployment documentation](https://docs.nestjs.com/deployment) for more information.

If you are looking for a cloud-based platform to deploy your NestJS application, check out [Mau](https://mau.nestjs.com), our official platform for deploying NestJS applications on AWS. Mau makes deployment straightforward and fast, requiring just a few simple steps:

```bash
$ pnpm install -g @nestjs/mau
$ mau deploy
```

With Mau, you can deploy your application in just a few clicks, allowing you to focus on building features rather than managing infrastructure.

## Resources

Check out a few resources that may come in handy when working with NestJS:

- Visit the [NestJS Documentation](https://docs.nestjs.com) to learn more about the framework.
- For questions and support, please visit our [Discord channel](https://discord.gg/G7Qnnhy).
- To dive deeper and get more hands-on experience, check out our official video [courses](https://courses.nestjs.com/).
- Deploy your application to AWS with the help of [NestJS Mau](https://mau.nestjs.com) in just a few clicks.
- Visualize your application graph and interact with the NestJS application in real-time using [NestJS Devtools](https://devtools.nestjs.com).
- Need help with your project (part-time to full-time)? Check out our official [enterprise support](https://enterprise.nestjs.com).
- To stay in the loop and get updates, follow us on [X](https://x.com/nestframework) and [LinkedIn](https://linkedin.com/company/nestjs).
- Looking for a job, or have a job to offer? Check out our official [Jobs board](https://jobs.nestjs.com).

## Support

Nest is an MIT-licensed open source project. It can grow thanks to the sponsors and support by the amazing backers. If you'd like to join them, please [read more here](https://docs.nestjs.com/support).

## Stay in touch

- Author - [Kamil Myśliwiec](https://twitter.com/kammysliwiec)
- Website - [https://nestjs.com](https://nestjs.com/)
- Twitter - [@nestframework](https://twitter.com/nestframework)

## License

Nest is [MIT licensed](https://github.com/nestjs/nest/blob/master/LICENSE).
