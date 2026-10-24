# NeuraChat

**Your personal AI workspace.**

NeuraChat is an AI-powered chat application that combines conversational AI with document-based question answering. It supports persistent conversations and lets users upload PDFs, retrieve relevant passages, and ask questions grounded in their documents.

The project brings together a modern web interface, a Python API, local document retrieval, and containerized development.

## Features

- **AI conversations:** Chat with an AI assistant powered by the Groq API.
- **Conversation persistence:** Store chat history using SQLite and return to previous conversations.
- **PDF uploads:** Upload PDF documents and use them as context for questions.
- **Retrieval-Augmented Generation (RAG):** Retrieve relevant document passages before generating answers.
- **Semantic search:** Generate text embeddings with Sentence Transformers and search using FAISS.
- **Source-aware answers:** Return document citations with filenames, page numbers, and relevant excerpts.
- **Chat management:** Create, select, rename, and delete conversations.
- **Markdown support:** Render formatted responses, code blocks, lists, and tables.
- **Custom interface:** A responsive Next.js workspace with a minimal, dark visual design.
- **Docker Compose:** Run the frontend and backend as separate services.
- **Persistent local data:** Keep the SQLite database, document data, and model cache across container restarts through mounted volumes.

## Tech Stack

| Layer | Technologies |
|---|---|
| Frontend | Next.js, React, TypeScript |
| Styling and UI | Tailwind CSS, shadcn/ui |
| Backend API | Python, FastAPI, Uvicorn |
| Language model | Groq API |
| Database | SQLite |
| PDF processing | PyMuPDF |
| Embeddings | Sentence Transformers, `all-MiniLM-L6-v2` |
| Vector search | FAISS |
| Numerical computing | NumPy |
| Containerization | Docker, Docker Compose |

## Architecture

```text
┌─────────────────────────────────────┐
│          Next.js Frontend           │
│          localhost:3000             │
└──────────────────┬──────────────────┘
                   │ HTTP API
                   ▼
┌─────────────────────────────────────┐
│          FastAPI Backend            │
│          localhost:8000             │
├─────────────────────────────────────┤
│ Chat and Conversation Management    │
│ PDF Processing and Document Search  │
│ Retrieval-Augmented Generation      │
└─────────┬───────────────┬───────────┘
          │               │
          ▼               ▼
┌────────────────┐  ┌─────────────────┐
│ SQLite         │  │ FAISS Index     │
│ Chat History   │  │ Document Search │
└────────────────┘  └─────────────────┘
          │               │
          ▼               ▼
     Local Data       Text Embeddings
                            │
                            ▼
                    Sentence Transformers

          FastAPI ──────► Groq API
                       AI Responses
```

### How document question answering works

1. A user uploads a PDF.
2. The backend extracts text and processes it into smaller passages.
3. Sentence Transformers converts the passages into numerical embeddings.
4. FAISS searches for passages relevant to the user's question.
5. The retrieved context is sent to the language model through Groq.
6. NeuraChat returns an answer with source citations when available.

This approach helps ground answers in the uploaded material instead of relying exclusively on the model's general knowledge.

## Project Structure

```text
neurachat/
├── app/
│   ├── main.py              # FastAPI application and chat endpoints
│   ├── database.py          # Conversation persistence
│   ├── documents.py         # Document management and retrieval setup
│   └── rag.py               # Retrieval-Augmented Generation
├── frontend/
│   ├── src/
│   │   ├── app/             # Next.js application
│   │   └── components/
│   │       └── chat/        # Chat interface components
│   ├── package.json
│   └── Dockerfile
├── data/                    # Local document data and indexes
├── requirements.txt
├── Dockerfile
├── compose.yaml
├── .env                     # Local secrets, not committed
└── README.md
```

*This is a high-level overview. Individual files and directories may evolve as the project develops.*

## Getting Started

### Prerequisites

- Python and pip
- Node.js and npm
- A Groq API key
- Git
- Docker Desktop with WSL 2 integration, if using Docker on Windows

### 1. Clone the repository

```bash
git clone https://github.com/eashanxd/neurachat.git
cd neurachat
```

### 2. Configure environment variables

Create a `.env` file in the project root:

```env
GROQ_API_KEY=your_groq_api_key
```

Replace the placeholder with your own API key.

**Security:** Never commit `.env` or expose API keys in source code, screenshots, logs, or public repositories. Keep `.env` excluded through `.gitignore`.

### 3. Run the backend

Create and activate a virtual environment:

```bash
python -m venv .venv
source .venv/bin/activate
```

On Windows PowerShell, activate it with:

```powershell
.\.venv\Scripts\Activate.ps1
```

Install dependencies:

```bash
python -m pip install -r requirements.txt
```

Start the API:

```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

The API should now be accessible at:

- API base URL: `http://localhost:8000`
- Interactive API documentation: `http://localhost:8000/docs`
- Health check: `http://localhost:8000/health`

### 4. Run the frontend

Open another terminal:

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:3000` in your browser.

The frontend uses `http://localhost:8000` as its default API URL when `NEXT_PUBLIC_API_URL` is not configured.

## Run with Docker Compose

Docker Compose is the recommended way to run both application services together.

Ensure Docker Desktop is running and available inside your terminal, then execute these commands from the repository root.

### Build and start

```bash
docker compose up --build
```

The services are exposed at:

| Service | Local URL |
|---|---|
| NeuraChat frontend | `http://localhost:3000` |
| NeuraChat API | `http://localhost:8000` |
| API documentation | `http://localhost:8000/docs` |
| Health check | `http://localhost:8000/health` |

## Configuration

| Setting | Purpose |
|---|---|
| `GROQ_API_KEY` | Authenticates requests to the Groq API |
| `NEXT_PUBLIC_API_URL` | Configures the frontend's API base URL at build time |
| `HF_HOME` | Sets the Hugging Face model cache directory in Docker |

Do not put private API keys in `NEXT_PUBLIC_*` variables. Variables with that prefix can be exposed to the browser.

## Development

### Frontend checks

From the `frontend/` directory:

```bash
npm run lint
npm run build
```

### Backend

Run the API locally using Uvicorn. The FastAPI interactive documentation at `/docs` can help you inspect and manually test available endpoints.
