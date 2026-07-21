# Project Rules

## Backend Module Structure Convention

All backend code for a feature must live inside its respective module folder under `backend/src/modules/<module-name>/`.

Each module folder should contain **all** files for that feature:
- `<module>.model.js` — Mongoose model/schema
- `<module>.repository.js` — Database access layer
- `<module>.service.js` — Business logic / AI agent logic
- `<module>.bizService.js` — Business orchestration service (when a separate agent service already exists)
- `<module>.controller.js` — Route handler / controller
- `<module>.route.js` — Express route definitions
- `<module>.prompt.js` — AI prompt templates (if applicable)

### Rules
1. **Never** create standalone `services/` or `repositories/` directories at the `src/` level.
2. When creating a new service or repository, place it inside the relevant module folder.
3. Cross-module imports should use relative paths (e.g., `../project/project.repository.js`).
4. Shared utilities that are truly cross-cutting (not module-specific) belong in `src/shared/`, `src/utils/`, `src/config/`, `src/errors/`, or `src/middleware/`.

### Current Module Folders
- `modules/auth/` — Authentication, user management
- `modules/project/` — Projects, Jira integration, Linear integration
- `modules/requirement/` — Requirement analysis, SRS scoring
- `modules/testsuite/` — Test suite generation, AI test case management
- `modules/execution/` — Test execution with Playwright
- `modules/inspector/` — Page element inspector (Playwright)
- `modules/slack/` — Slack OAuth integration
