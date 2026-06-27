from fastapi import FastAPI

from .routes.ingest import router as ingest_router


def create_app() -> FastAPI:
    app = FastAPI(
        title="VintageFit Backend",
        version="0.1.0",
        description=(
            "Fit-profile extraction + per-marketplace search-term generator. "
            "v0: extract fit profile from a tag photo or marketplace URL, hand "
            "back copy-pasteable search queries for Depop / eBay / Grailed / "
            "Mercari / Poshmark."
        ),
    )

    @app.get("/health")
    def health() -> dict[str, str]:
        return {"status": "ok"}

    app.include_router(ingest_router)
    return app


app = create_app()
