"""FastAPI entrypoint."""

from __future__ import annotations

import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .api import router

ALLOWED_ORIGINS = os.getenv(
    "WEBGRAPH_ALLOWED_ORIGINS",
    "http://localhost:5173,http://127.0.0.1:5173",
).split(",")


def create_app() -> FastAPI:
    app = FastAPI(
        title="WebGraph Viz API",
        description="Crawl any website and stream the resulting link graph in real time.",
        version="0.1.0",
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=ALLOWED_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(router, prefix="/api")

    @app.get("/health")
    def health() -> dict[str, str]:
        return {"status": "ok"}

    return app


app = create_app()


def main() -> None:
    import uvicorn

    uvicorn.run(
        "backend.main:app",
        host=os.getenv("WEBGRAPH_HOST", "0.0.0.0"),
        port=int(os.getenv("WEBGRAPH_PORT", "8000")),
        reload=bool(os.getenv("WEBGRAPH_RELOAD")),
    )
