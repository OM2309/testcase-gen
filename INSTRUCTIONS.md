# TestGen Backend — Complete Instructions

## What Is This Project?

This is a Node.js backend that takes an SRS (Software Requirements Specification) document,
runs it through 3 AI agents, and generates:
1. Structured requirement analysis (JSON)
2. Comprehensive test cases (saved to MongoDB)
3. Executable Jest test files (saved to `/public` folder)

---

## Folder Structure

```
tescase-genrator/
│
├── index.js                             → Server entry point
├── package.json                         → Dependencies & scripts
├── .env                                 → Environment variables
├── .gitignore                           → Git ignore rules
│
├── public/                              → Generated .test.js files (per project)
│   └── {ProjectName_abc123}/            → Folder named by project name + short ID
│       ├── MOD-001-User_Auth.test.js
│       └── MOD-002-Dashboard.test.js
│
├── uploads/                             → Uploaded SRS files (temp storage)
│
└── src/
    ├── config/
    │   └── db.js                        → MongoDB connection setup
    │
    ├── agents/
    │   ├── analyzerAgent.js             → Agent 1: SRS → structured JSON
    │   ├── testCaseAgent.js             → Agent 2: JSON → test case array
    │   └── testCodeAgent.js             → Agent 3: test cases → Jest code
    │
    ├── controllers/
    │   ├── uploadController.js          → Handles file upload + starts pipeline
    │   ├── projectController.js         → Project CRUD (status, analysis, files, delete)
    │   └── testCaseController.js        → Test case listing + summary aggregation
    │
    ├── models/
    │   ├── Project.js                   → Project metadata + status tracking
    │   └── TestCase.js                  → Individual test case records
    │
    ├── routes/
    │   └── upload.js                    → Route definitions (thin layer → controllers)
    │
    ├── middleware/
    │   └── multerConfig.js              → File upload validation (PDF/DOCX only, 25MB max)
    │
    ├── utils/
    │   ├── fileParser.js                → Extracts text from PDF/DOCX files
    │   ├── sanitizer.js                 → JSON/code cleanup, filename sanitizer, timer
    │   ├── responseHelper.js            → Standardized API response functions
    │   └── fileSystem.js                → File/directory operations for public/ folder
    │
    └── pipeline.js                      → Orchestrates Agent 1 → 2 → 3 sequentially
```

---

## How Each Layer Works

### Routes (src/routes/upload.js)
Routes are a **thin mapping** layer. They only define which URL calls which controller.
No business logic lives here.

```
POST   /api/upload                    → uploadController.uploadSRS
GET    /api/projects                  → projectController.getAllProjects
GET    /api/project/:id/status        → projectController.getProjectStatus
GET    /api/project/:id/analysis      → projectController.getProjectAnalysis
GET    /api/project/:id/testcases     → testCaseController.getTestCases
GET    /api/project/:id/testcases/summary → testCaseController.getTestCaseSummary
GET    /api/project/:id/files         → projectController.getProjectFiles
GET    /api/project/:id/download      → projectController.downloadProjectFiles
DELETE /api/project/:id               → projectController.deleteProject
GET    /health                        → (defined in index.js)
```

### Controllers (src/controllers/)
Controllers contain all the **request handling logic**:
- Validate input (check ObjectId, check file exists)
- Call models/services
- Return standardized responses via `responseHelper.js`

**uploadController.js** — Handles the file upload. Parses the file, creates a Project
record in MongoDB, then kicks off the pipeline in the background (non-blocking).

**projectController.js** — All project-level reads, downloads, and deletes. The `/files`
endpoint reads directly from the filesystem. The `/download` endpoint zips the entire
project folder and streams it as a `.zip` file download.

**testCaseController.js** — Test case listing with filters (type, priority, module)
and pagination. Summary endpoint uses MongoDB aggregation.

### Pipeline (src/pipeline.js)
The pipeline is the **core processing engine**. It runs asynchronously after upload:

```
Step 1: Update status → "analyzing"
Step 2: Agent 1 runs → extracts structured JSON from SRS text
Step 3: Update status → "generating_tests", save analyzed data to MongoDB
Step 4: Agent 2 runs → generates test case array from analyzed data
Step 5: Save test cases to MongoDB, update status → "generating_code"
Step 6: Agent 3 runs per module → generates Jest test file
Step 7: Save .test.js files to public/{ProjectName_abc123}/ folder
Step 8: Update status → "completed"
```

If any step fails, status becomes "failed" and error message is saved.

### Agents (src/agents/)
Each agent is an OpenAI Agent SDK instance with specific instructions:

**Agent 1 (analyzerAgent.js)** — Receives raw SRS text, returns structured JSON with:
modules, functional requirements, non-functional requirements, user roles,
assumptions, constraints, missing requirements, inferred business logic.

**Agent 2 (testCaseAgent.js)** — Receives the structured JSON, returns an array of
test cases covering: Positive, Negative, Edge Case, Business Logic,
Role Based, and Missing Requirement types.

**Agent 3 (testCodeAgent.js)** — Receives one module + its test cases at a time,
returns a complete executable Jest test file. Runs once per module.

### Models (src/models/)
**Project.js** — Stores project metadata, the full analyzed data JSON, processing
status, timestamps, and error messages.

**TestCase.js** — Individual test case records with type, priority, steps, input
data, expected results. Indexed by projectId + moduleId.

### Utils (src/utils/)
**fileParser.js** — Reads PDF files using `pdf-parse`, DOCX files using `mammoth`.
Returns extracted plain text.

**sanitizer.js** — Shared across all agents and pipeline:
- `parseJsonSafe(raw, type)` — Strips markdown fences, parses JSON with regex fallback
- `sanitizeCodeResponse(raw)` — Strips code block fences from agent output
- `sanitizeFileName(name)` — Makes filenames safe for filesystem
- `formatElapsed(startTime)` — Returns seconds elapsed as string

**responseHelper.js** — Shared across all controllers:
- `sendSuccess(res, data, statusCode)` — Standard success response
- `sendError(res, message, statusCode)` — Standard error response
- `sendPaginated(res, data, total, page, limit)` — Response with pagination metadata
- `parsePagination(query)` — Extracts page/limit/skip from query params

**fileSystem.js** — Shared across pipeline and controllers:
- `getProjectPublicDir(projectId)` — Returns path to public/{projectId}/
- `ensureDir(dirPath)` — Creates directory if missing
- `writeFile(filePath, content)` — Writes file, returns stats
- `listProjectFiles(projectId)` — Lists .test.js files from disk
- `deleteProjectDir(projectId)` — Removes project's public directory

---

## Complete Flow: Frontend → Backend

### Step 1: User Uploads SRS File (Frontend)

Frontend sends a `multipart/form-data` POST request:

```
POST http://localhost:5000/api/upload
Content-Type: multipart/form-data
Body: { srs: <file.pdf or file.docx> }
```

### Step 2: Multer Validates & Saves File (Middleware)

`multerConfig.js` runs:
- Checks extension (only .pdf, .docx)
- Checks MIME type
- Generates UUID filename
- Saves to `uploads/` folder
- Rejects if file > 25MB

### Step 3: Upload Controller Processes Request

`uploadController.js` runs:
- Calls `fileParser.parseFile()` to extract text from uploaded file
- Creates a new Project document in MongoDB (status: "uploaded")
- Fires `runPipeline()` asynchronously (does NOT wait for it)
- Immediately returns response to frontend:

```json
{
  "success": true,
  "message": "SRS uploaded successfully. Processing has started.",
  "data": {
    "projectId": "6651abc123def456...",
    "fileName": "my-srs.pdf",
    "statusEndpoint": "/api/project/6651abc123def456.../status"
  }
}
```

### Step 4: Frontend Polls Status

Frontend polls every few seconds:

```
GET http://localhost:5000/api/project/{projectId}/status
```

Status values in order:
```
uploaded → analyzing → generating_tests → generating_code → completed
                                                           → failed
```

### Step 5: Pipeline Runs in Background

**Agent 1 (Analyzer)** runs:
- Input: Raw SRS text
- Output: Structured JSON (modules, requirements, business rules, gaps)
- Saved to: Project.analyzedData in MongoDB

**Agent 2 (Test Case Generator)** runs:
- Input: Structured JSON from Agent 1
- Output: Array of test cases (5+ per requirement)
- Saved to: TestCase collection in MongoDB

**Agent 3 (Test Code Generator)** runs once per module:
- Input: Module info + its test cases
- Output: Complete Jest test file (.js code)
- Saved to: public/{ProjectName_abc123}/MOD-001-Module_Name.test.js

### Step 6: Frontend Fetches Results

Once status is "completed", frontend can fetch:

**Analyzed data:**
```
GET /api/project/{projectId}/analysis
```

**All test cases (paginated, filterable):**
```
GET /api/project/{projectId}/testcases?type=Negative&page=1&limit=20
```

**Test case summary (counts by type/priority/module):**
```
GET /api/project/{projectId}/testcases/summary
```

**Generated test files (from disk):**
```
GET /api/project/{projectId}/files
```

**Download entire project folder as ZIP:**
```
GET /api/project/{projectId}/download
→ Returns: {ProjectName_abc123}.zip
```

**Download a specific test file:**
```
GET /public/{ProjectName_abc123}/MOD-001-User_Auth.test.js
```

---

## Where Each Type of Data Lives

| Data                  | Stored In          | Why                                           |
|-----------------------|--------------------|-----------------------------------------------|
| Uploaded SRS file     | `uploads/` folder  | Temp storage, referenced by Project.filePath  |
| Project metadata      | MongoDB (Project)  | Needs querying, status tracking, timestamps   |
| Analyzed SRS data     | MongoDB (Project)  | Stored inside Project.analyzedData field      |
| Test cases            | MongoDB (TestCase) | Needs filtering, pagination, aggregation      |
| Generated Jest files  | `public/{name}/`   | Static files served via Express, downloadable as ZIP |
| Folder name           | MongoDB (Project)  | Project.folderName maps projectId → disk folder|

---

## API Response Format

Every endpoint returns a consistent structure:

**Success:**
```json
{ "success": true, "data": { ... } }
```

**Success with pagination:**
```json
{ "success": true, "data": [...], "pagination": { "total": 50, "page": 1, "limit": 20, "totalPages": 3 } }
```

**Error:**
```json
{ "success": false, "error": "Error message here" }
```

---

## Setup & Run

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
#    Edit .env file:
#    - Set OPENAI_API_KEY to your actual key
#    - Set MONGODB_URI (default: mongodb://localhost:27017/testgen)

# 3. Start MongoDB (must be running)
# 4. Start server
npm run dev

# 5. Test upload
curl -X POST http://localhost:5000/api/upload -F "srs=@./your-srs.pdf"
```

---

## Tech Stack

| Package          | Purpose                                    |
|------------------|--------------------------------------------|
| archiver         | Zip project folder for download            |
| express          | HTTP server + routing                      |
| @openai/agents   | OpenAI Agents SDK for 3 AI agents          |
| mongoose         | MongoDB ODM for Project + TestCase models  |
| multer           | Multipart file upload handling             |
| pdf-parse        | Extract text from PDF files                |
| mammoth          | Extract text from DOCX files               |
| dotenv           | Load .env variables                        |
| cors             | Cross-origin request support               |
| uuid             | Generate unique filenames for uploads      |
| zod              | Schema validation (available for extension)|
| nodemon          | Auto-restart server during development     |
