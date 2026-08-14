# Lightweight official Python image
FROM python:3.10-slim

# Set environment variables
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1 \
    HF_HOME=/app/.cache/huggingface

# Set work directory
WORKDIR /app

# Install system dependencies (pyodbc requires unixodbc-dev, etc.)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    unixodbc-dev \
    libgomp1 \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements file
COPY requirements.txt .

# Install Python dependencies (install CPU-only version of PyTorch to save space)
RUN pip install --upgrade pip && \
    pip install torch --index-url https://download.pytorch.org/whl/cpu && \
    pip install -r requirements.txt

# Pre-download spaCy & Stanza Turkish NLP models so they are cached inside the Docker image
RUN python -c "import stanza; stanza.download('tr')" && \
    python -c "import spacy; spacy.cli.download('xx_ent_wiki_sm')"

# Copy the rest of the application
COPY . .

# Expose port
EXPOSE 8000

# Start server
CMD ["python", "server.py"]
