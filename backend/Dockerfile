FROM python:3.13-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY matchiq ./matchiq
USER 65534:65534
EXPOSE 8000
CMD ["python", "-m", "uvicorn", "matchiq.main:app", "--host", "0.0.0.0", "--port", "8000"]
