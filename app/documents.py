import json
import re
import uuid
from pathlib import Path

import faiss
from fastapi import APIRouter, File, HTTPException, UploadFile
from pydantic import BaseModel, Field

from app.rag import build_index, process_pdf, save_index

PROJECT_ROOT = Path(__file__).resolve().parent.parent
DOCUMENTS_DIR = PROJECT_ROOT / "data" / "documents"
INDEXES_DIR = PROJECT_ROOT / "data" / "indexes"

DOCUMENTS_DIR.mkdir(parents=True, exist_ok=True)
INDEXES_DIR.mkdir(parents=True, exist_ok=True)

router = APIRouter(prefix="/api/documents", tags=["Documents"])

MAX_UPLOAD_BYTES = 15 * 1024 * 1024


class DocumentSearchRequest(BaseModel):
    query: str = Field(min_length=1, max_length=1000)
    document_id: str | None = None
    top_k: int = Field(default=5, ge=1, le=10)


def metadata_path(document_id: str) -> Path:
    return DOCUMENTS_DIR / f"{document_id}.json"


def document_index_path(document_id: str) -> Path:
    return INDEXES_DIR / f"{document_id}.index"


def document_chunks_path(document_id: str) -> Path:
    return INDEXES_DIR / f"{document_id}.npy"


def read_metadata(document_id: str) -> dict:
    path = metadata_path(document_id)

    if not path.exists():
        raise HTTPException(status_code=404, detail="Document not found.")

    return json.loads(path.read_text(encoding="utf-8"))


def load_document_index(document_id: str):
    index_path = document_index_path(document_id)
    chunks_path = document_chunks_path(document_id)

    if not index_path.exists() or not chunks_path.exists():
        raise HTTPException(
            status_code=500,
            detail="Document index is incomplete.",
        )

    index = faiss.read_index(str(index_path))
    import numpy as np

    chunks = np.load(chunks_path, allow_pickle=True).tolist()

    if index.ntotal != len(chunks):
        raise HTTPException(
            status_code=500,
            detail="Document index is inconsistent.",
        )

    return index, chunks


@router.post("/upload", status_code=201)
async def upload_document(file: UploadFile = File(...)):
    original_name = Path(file.filename or "").name

    if not original_name.lower().endswith(".pdf"):
        raise HTTPException(status_code=415, detail="Only PDF files are supported.")

    document_id = uuid.uuid4().hex
    pdf_path = DOCUMENTS_DIR / f"{document_id}.pdf"
    temporary_path = DOCUMENTS_DIR / f"{document_id}.uploading"

    try:
        total_bytes = 0

        with temporary_path.open("wb") as destination:
            while True:
                chunk = await file.read(1024 * 1024)

                if not chunk:
                    break

                total_bytes += len(chunk)

                if total_bytes > MAX_UPLOAD_BYTES:
                    raise HTTPException(
                        status_code=413,
                        detail="PDF must be 15 MB or smaller.",
                    )

                destination.write(chunk)

        if total_bytes == 0:
            raise HTTPException(status_code=400, detail="The uploaded file is empty.")

        # Verify that the uploaded content is a readable PDF.
        import pymupdf

        try:
            with pymupdf.open(temporary_path) as pdf:
                if not pdf.is_pdf:
                    raise ValueError("Not a PDF")
        except Exception as exc:
            raise HTTPException(
                status_code=400,
                detail="The uploaded file is not a valid readable PDF.",
            ) from exc

        temporary_path.replace(pdf_path)

        chunks = process_pdf(pdf_path)

        if not chunks:
            raise HTTPException(
                status_code=422,
                detail="No extractable text was found in this PDF.",
            )

        index = build_index(chunks)

        # Store each document's index separately.
        faiss.write_index(index, str(document_index_path(document_id)))

        import numpy as np

        np.save(
            document_chunks_path(document_id),
            np.asarray(chunks, dtype=object),
            allow_pickle=True,
        )

        metadata = {
            "id": document_id,
            "filename": original_name,
            "size_bytes": total_bytes,
            "chunk_count": len(chunks),
        }

        metadata_path(document_id).write_text(
            json.dumps(metadata, indent=2),
            encoding="utf-8",
        )

        return metadata

    except HTTPException:
        raise
    except Exception as exc:
        # Avoid leaving incomplete uploads behind.
        for path in (
            temporary_path,
            pdf_path,
            document_index_path(document_id),
            document_chunks_path(document_id),
            metadata_path(document_id),
        ):
            path.unlink(missing_ok=True)

        raise HTTPException(
            status_code=500,
            detail="Unable to process the uploaded PDF.",
        ) from exc
    finally:
        await file.close()


@router.post("/search")
def search_document(request: DocumentSearchRequest):
    from app.rag import search_documents

    if request.document_id:
        document_ids = [request.document_id]
    else:
        document_ids = [
            path.stem
            for path in DOCUMENTS_DIR.glob("*.json")
        ]

    results = []

    for document_id in document_ids:
        metadata = read_metadata(document_id)
        index, chunks = load_document_index(document_id)

        matches = search_documents(
            request.query,
            index,
            chunks,
            top_k=request.top_k,
        )

        for match in matches:
            results.append({
                **match,
                "document_id": document_id,
                "filename": metadata["filename"],
            })

    results.sort(key=lambda item: item["score"], reverse=True)

    return {
        "query": request.query,
        "results": results[:request.top_k],
    }


@router.get("")
def list_documents():
    documents = []

    for path in DOCUMENTS_DIR.glob("*.json"):
        try:
            documents.append(json.loads(path.read_text(encoding="utf-8")))
        except (OSError, json.JSONDecodeError):
            continue

    documents.sort(key=lambda item: item["filename"].lower())

    return {"documents": documents}
