FROM python:3.10-slim

# Prevent Python from writing .pyc files and enable unbuffered logging
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Create a non-root user and group for security
RUN addgroup --system appgroup && adduser --system --group appuser

WORKDIR /app

# Install system dependencies (build-essential helps compile some ML packages if wheels are missing)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install them (leverage Docker cache)
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy the rest of the application code
COPY . .

# Change ownership to the non-root user
RUN chown -R appuser:appgroup /app

# Switch to the non-root user for execution
USER appuser

# Expose the Flask port
EXPOSE 5001

# Run the app with gunicorn (Production WSGI server) instead of the Flask dev server
CMD ["gunicorn", "--bind", "0.0.0.0:5001", "--workers", "1", "--threads", "4", "--timeout", "120", "app:app"]
