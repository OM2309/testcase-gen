# Backend Code Generation & Architecture Guidelines

This document defines the production-grade architecture, design patterns, and coding standards for the Express + MongoDB backend codebase. All AI code generation agents must strictly adhere to these rules.

---

## 1. Core Stack & Architecture Principles

- **Stack**: Node.js, Express, MongoDB, Mongoose, JavaScript (ES6+ / CommonJS/ESM)
- **Architecture**: Layered / Clean Architecture with strict Separation of Concerns.
- **SOLID Principles**: Single responsibility per layer and file, dependency injection where practical.
- **Backward Compatibility**: **NEVER** change existing API response shapes or break frontend compatibility.
- **File Size Limit**: **Maximum 250 lines per file**. If any file grows larger than 250 lines, it MUST be decomposed into smaller modules.

---

## 2. Standard Directory Structure

```
src/
├── config/        # Environment validation, database & third-party configs
├── routes/        # Route definitions only (mapping URLs to controllers & middlewares)
├── controllers/   # Request parsing, input validation execution, service delegation, response sending
├── services/      # Core business logic and domain orchestration
├── repositories/  # Database operations & Mongoose query encapsulation
├── middlewares/   # Auth, authorization, validation, error handling, rate limiting, security
├── validators/    # Input validation middleware & schema execution
├── schemas/       # Zod / Joi validation schemas
├── models/        # Mongoose schemas & data models
├── utils/         # Helper functions, crypto, string manipulators, JSON extractors
├── constants/     # Error messages, HTTP status codes, application constants
├── types/         # JSDoc type definitions and data transfer interfaces
├── errors/        # Custom error class hierarchy (AppError, ValidationError, etc.)
├── lib/           # External service clients (OpenAI, File Parsers, etc.)
├── jobs/          # Async task queues & background processing
├── socket/        # Socket.io initialization & event handlers
├── uploads/       # Storage management and file upload handling
└── tests/         # Integration & unit test suites
```

---

## 3. Strict Layer Responsibilities

### 1. Routes (`src/routes/`)
- **ONLY** define URL paths, HTTP methods, and attach appropriate middlewares (auth, validation).
- **NO** inline handler logic, NO business operations, and NO direct database access.

### 2. Controllers (`src/controllers/`)
- Parse request parameters (`req.params`, `req.query`, `req.body`, `req.user`).
- Execute/verify input validation.
- Pass clean data payloads to the Service layer.
- Format and return HTTP responses using standardized response helpers.
- **NEVER** contain business logic or access Mongoose models directly.

### 3. Services (`src/services/`)
- Contain **ALL business logic**, domain calculations, and workflow orchestration.
- Interact with Repositories to fetch/persist data.
- **NEVER** reference HTTP objects (`req`, `res`, `next`).
- **NEVER** perform direct Mongoose queries (`Model.find()`, `Model.create()`).

### 4. Repositories (`src/repositories/`)
- Encapsulate **ALL database operations** and Mongoose model interactions (`Model.find`, `aggregate`, `findOneAndUpdate`, etc.).
- Prevent duplicate queries across the application.
- Provide clean, domain-centric methods (`findUserByEmail`, `createProject`, `updateTestExecution`).
- Controllers and Services must NEVER bypass repositories to execute Mongoose queries.

### 5. Validation & Schemas (`src/schemas/` & `src/validators/`)
- Use Zod (or Joi) schemas for all incoming request payloads (`body`, `query`, `params`).
- Run validation via a centralized `validate(schema)` middleware before requests reach controllers.

### 6. Middleware (`src/middlewares/`)
- **Authentication & Authorization**: Verify JWTs (`req.user`), enforce role and resource access permissions.
- **Security**: Apply `helmet()`, `cors()`, `compression()`.
- **Rate Limiting**: Protect endpoints against abuse using memory or Redis rate limiters.
- **Error Handling**: Catch all unhandled async errors and pass them to a global error handling middleware.
- **Logging**: Structured request/response logging (Pino/Winston).

---

## 4. Installed Agent Skills & Best Practices (`.agents/skills/`)

Guidelines imported from `.agents/skills/nodejs-backend-patterns`:

### A. Error Handling & Custom Error Classes
- Use a custom error hierarchy extending `AppError`:
  - `AppError(message, statusCode, isOperational)`
  - `ValidationError(message, details)` — HTTP 400
  - `UnauthorizedError(message)` — HTTP 401
  - `ForbiddenError(message)` — HTTP 403
  - `NotFoundError(message)` — HTTP 404
  - `ConflictError(message)` — HTTP 409
- Wrap async controller handlers with an `asyncHandler` wrapper or rely on Express async error forwarding to prevent unhandled promise rejections.
- Global error handler returns consistent error JSON:
  ```json
  {
    "status": "error",
    "message": "Error description",
    "errors": []
  }
  ```

### B. Standardized Response Format
- Use reusable response helpers (`ApiResponse.success`, `ApiResponse.error`):
  ```json
  {
    "status": "success",
    "data": { ... },
    "message": "Optional operational message"
  }
  ```

### C. Input Validation Pattern
- Define Zod schemas per endpoint:
  ```javascript
  const createProjectSchema = z.object({
    body: z.object({
      name: z.string().min(1, "Project name is required"),
      description: z.string().optional(),
    })
  });
  ```
- Apply schema in route definition:
  ```javascript
  router.post("/", authenticate, validate(createProjectSchema), projectController.createProject);
  ```

### D. Security & Environment Config
- Environment variables must be validated on startup using Zod or a config validator (`src/config/env.js`).
- Never hardcode secrets, API keys, or database URIs.
- Use `helmet` for security headers, strict `cors` origins, and `compression` for payload optimization.

---

## 5. Coding Standards & Conventions

- **File Naming**:
  - Controllers: `feature.controller.js`
  - Routes: `feature.route.js`
  - Services: `feature.service.js`
  - Repositories: `feature.repository.js`
  - Models: `feature.model.js`
  - Schemas: `feature.schema.js`
  - Middlewares: `middlewareName.middleware.js` or `middlewareName.js`
- **Import Order**:
  1. Built-in Node.js modules (`path`, `fs`, `crypto`)
  2. Third-party packages (`express`, `mongoose`, `zod`)
  3. Configs & Constants (`src/config`, `src/constants`)
  4. Middlewares & Errors (`src/middlewares`, `src/errors`)
  5. Repositories, Services, Controllers
  6. Utilities & Helpers
- **DRY & Utility Extraction**: Extract repeated logic (e.g., token parsing, file extraction, crypto operations) into `src/utils/` or `src/lib/`.
- **Clean Code**: Remove unused imports, dead code, and commented-out snippets.
