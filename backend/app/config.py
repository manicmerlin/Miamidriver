from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    vision_provider: str = "stub"
    # When 'anthropic' and an api key is set, ingest will run a live web
    # research pass if the curated sizing KB has no 'researched' entry for
    # the resolved (brand, line, era, size). Set to 'off' to disable.
    research_provider: str = "off"
    anthropic_api_key: str | None = None
    data_dir: Path = Path("./var")
    user_agent: str = (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) "
        "AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15"
    )
    fetch_timeout_seconds: float = 20.0


settings = Settings()
settings.data_dir.mkdir(parents=True, exist_ok=True)
