# Backend image for a read-only public demo (e.g. a Hugging Face Docker Space).
# Build from the repository root:  docker build -t insightvault .
FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    HF_HOME=/app/.cache/huggingface

# Hugging Face Spaces run the container as UID 1000.
RUN useradd --create-home --uid 1000 user
WORKDIR /app

# CPU-only PyTorch keeps the image far smaller than the default CUDA build.
ARG TORCH_INDEX_URL=https://download.pytorch.org/whl/cpu
COPY backend/requirements.txt backend/requirements.txt
RUN pip install --index-url "$TORCH_INDEX_URL" torch \
 && pip install -r backend/requirements.txt

COPY backend/app backend/app
COPY backend/scripts backend/scripts
COPY demo demo

ENV APP_ENV=production \
    DEMO_MODE=true \
    CORS_ORIGINS=* \
    DATABASE_PATH=/app/data/knowledge.db \
    DOCUMENT_STORAGE_PATH=/app/data/documents \
    FAISS_INDEX_PATH=/app/data/indexes/faiss.index

# Download the embedding model and pre-index the sample knowledge base at build time,
# so the container starts with a ready index and needs no network at runtime.
WORKDIR /app/backend
RUN python -m scripts.build_demo_index \
 && chown -R user:user /app

USER user
EXPOSE 7860
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "7860"]
