from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .routes.ingest import router as ingest_router
from .routes.profiles import router as profiles_router
from .storage import init_db


def create_app() -> FastAPI:
    app = FastAPI(
        title="VintageFit Backend",
        version="0.1.0",
        description=(
            "Fit-profile extraction + per-marketplace search-term generator + "
            "similar-fit learning loop. Extracts a fit profile from a tag "
            "photo or marketplace URL, hands back copy-pasteable search "
            "queries for Depop / eBay / Grailed / Mercari / Poshmark, and "
            "remembers cross-matches the user reinforces."
        ),
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_methods=["*"],
        allow_headers=["*"],
        allow_credentials=False,
    )

    init_db()

    @app.get("/health")
    def health() -> dict[str, str]:
        return {"status": "ok"}

    app.include_router(ingest_router)
    app.include_router(profiles_router)
    return app


app = create_app()
