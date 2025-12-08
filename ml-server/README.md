AgroInOne ML Server (placeholder)

This Flask app provides minimal placeholder endpoints for crop and loan prediction used by the frontend via the backend proxy.

Install & run:

```
python -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt
python app.py
```

The server listens on port 5001 by default and exposes:
- POST /predict/crop
- POST /predict/loan

These endpoints currently contain simple placeholder logic — swap in real models as needed.
