from pathlib import Path

import faiss
import numpy as np
import pymupdf
from sentence_transformers import SentenceTransformer


# Project paths
PROJECT_ROOT = Path(__file__).resolve().parent.parent
RAG_DATA_DIR = PROJECT_ROOT / "data" / "rag"
RAG_DATA_DIR.mkdir(parents=True, exist_ok=True)

INDEX_PATH = RAG_DATA_DIR / "documents.index"
CHUNKS_PATH = RAG_DATA_DIR / "chunks.npy"

# Embedding configuration
MODEL_NAME = "sentence-transformers/all-MiniLM-L6-v2"
EMBEDDING_DIMENSION = 384

CHUNK_SIZE = 1000
CHUNK_OVERLAP = 150

# Lazy-loaded model
_model = None


def get_embedding_model():
    """Load the embedding model once, on first use."""
    global _model

    if _model is None:
        _model = SentenceTransformer(MODEL_NAME, device="cpu")

    return _model


def extract_pdf_pages(pdf_path: str | Path) -> list[dict]:
    """Extract text page by page, preserving source page numbers."""
    pages = []

    with pymupdf.open(pdf_path) as document:
        for page_number, page in enumerate(document, start=1):
            text = page.get_text("text").strip()

            if text:
                pages.append({
                    "page": page_number,
                    "text": text,
                })

    if not pages:
        raise ValueError(
            "No extractable text found. The PDF may be empty or scanned."
        )

    return pages


def chunk_text(
    text: str,
    chunk_size: int = CHUNK_SIZE,
    overlap: int = CHUNK_OVERLAP,
) -> list[str]:
    """Split text into overlapping chunks."""
    text = " ".join(text.split())

    if not text:
        return []

    if chunk_size <= 0 or overlap < 0 or overlap >= chunk_size:
        raise ValueError("Invalid chunk size or overlap.")

    chunks = []
    start = 0

    while start < len(text):
        end = min(start + chunk_size, len(text))
        chunks.append(text[start:end])

        if end == len(text):
            break

        start = end - overlap

    return chunks


def process_pdf(pdf_path: str | Path) -> list[dict]:
    """Extract and chunk a PDF while retaining page metadata."""
    document_name = Path(pdf_path).name
    chunks = []

    for page_data in extract_pdf_pages(pdf_path):
        page_chunks = chunk_text(page_data["text"])

        for chunk_number, content in enumerate(page_chunks, start=1):
            chunks.append({
                "source": document_name,
                "page": page_data["page"],
                "chunk": chunk_number,
                "text": content,
            })

    return chunks


def create_embeddings(texts: list[str]) -> np.ndarray:
    """Generate normalized, CPU-based embeddings."""
    if not texts:
        return np.empty((0, EMBEDDING_DIMENSION), dtype=np.float32)

    model = get_embedding_model()

    embeddings = model.encode(
        texts,
        convert_to_numpy=True,
        normalize_embeddings=True,
        show_progress_bar=False,
    )

    return np.asarray(embeddings, dtype=np.float32)


def build_index(chunks: list[dict]) -> faiss.IndexFlatIP:
    """Build a cosine-similarity index from normalized embeddings."""
    embeddings = create_embeddings([item["text"] for item in chunks])

    index = faiss.IndexFlatIP(EMBEDDING_DIMENSION)

    if len(embeddings):
        index.add(embeddings)

    return index


def save_index(index: faiss.Index, chunks: list[dict]) -> None:
    """Persist the index and its matching chunk metadata."""
    faiss.write_index(index, str(INDEX_PATH))
    np.save(CHUNKS_PATH, np.asarray(chunks, dtype=object), allow_pickle=True)


def load_index() -> tuple[faiss.Index, list[dict]]:
    """Load a previously saved index and its chunks."""
    if not INDEX_PATH.exists() or not CHUNKS_PATH.exists():
        raise FileNotFoundError("No saved document index exists.")

    index = faiss.read_index(str(INDEX_PATH))
    chunks = np.load(CHUNKS_PATH, allow_pickle=True).tolist()

    if index.ntotal != len(chunks):
        raise RuntimeError("Index and chunk metadata are inconsistent.")

    return index, chunks


def search_documents(
    query: str,
    index: faiss.Index,
    chunks: list[dict],
    top_k: int = 5,
) -> list[dict]:
    """Return the most relevant document chunks for a query."""
    query = query.strip()

    if not query or top_k <= 0 or index.ntotal == 0:
        return []

    query_embedding = create_embeddings([query])
    scores, indices = index.search(
        query_embedding,
        min(top_k, index.ntotal),
    )

    results = []

    for score, chunk_index in zip(scores[0], indices[0]):
        if chunk_index < 0:
            continue

        results.append({
            **chunks[int(chunk_index)],
            "score": float(score),
        })

    return results