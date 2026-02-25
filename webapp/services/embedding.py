from sentence_transformers import SentenceTransformer

_model: SentenceTransformer | None = None


def get_model() -> SentenceTransformer:
    global _model
    if _model is None:
        _model = SentenceTransformer("all-MiniLM-L6-v2")
    return _model


def encode_query(text: str) -> list[float]:
    model = get_model()
    embedding = model.encode([text], normalize_embeddings=True)[0]
    return embedding.tolist()
