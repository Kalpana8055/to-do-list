from flask import Flask, request, jsonify
from sentence_transformers import SentenceTransformer
import torch
import os

app = Flask(__name__)

# Use GPU if available, else CPU
device = "cuda" if torch.cuda.is_available() else "cpu"
print(f"Loading SentenceTransformer model on device: {device}")

try:
    model = SentenceTransformer("all-MiniLM-L6-v2")
    model.to(device)
    print("Model loaded successfully.")
except Exception as e:
    print(f"Failed to load model: {e}")
    model = None  # Fallback to prevent crash

@app.route("/embed", methods=["POST"])
def embed():
    if not model:
        return jsonify({"error": "Model not loaded"}), 500

    data = request.get_json()
    if not data or "text" not in data:
        return jsonify({"error": "Missing 'text' field"}), 400

    try:
        text = data["text"]
        embedding = model.encode(text, device=device).tolist()
        return jsonify({"embedding": embedding})
    except Exception as e:
        print(f"Embedding error: {e}")
        return jsonify({"error": "Failed to generate embedding"}), 500

if __name__ == "__main__":
    PORT = int(os.environ.get("PORT", 8000))
    app.run(host="0.0.0.0", port=PORT)
