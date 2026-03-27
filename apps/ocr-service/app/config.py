from functools import lru_cache
from pathlib import Path

from pydantic import AliasChoices, Field
from pydantic_settings import BaseSettings, SettingsConfigDict

APP_DIR = Path(__file__).resolve().parent
SERVICE_DIR = APP_DIR.parent


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(SERVICE_DIR / ".env", APP_DIR / ".env"),
        env_prefix="OCR_SERVICE_",
        case_sensitive=False,
    )

    host: str = "127.0.0.1"
    port: int = 8090
    max_file_size_mb: int = 15
    default_sync: bool = True
    processor_version: str = "hacktues-ocr-v1"
    tesseract_cmd: str | None = None
    openrouter_api_key: str | None = Field(
        default=None,
        validation_alias=AliasChoices("OCR_SERVICE_OPENROUTER_API_KEY", "OPENROUTER_API_KEY"),
    )
    openrouter_base_url: str = Field(
        default="https://openrouter.ai/api/v1",
        validation_alias=AliasChoices("OCR_SERVICE_OPENROUTER_BASE_URL", "OPENROUTER_BASE_URL"),
    )
    openrouter_model: str = Field(
        default="google/gemini-2.5-flash-lite",
        validation_alias=AliasChoices("OCR_SERVICE_OPENROUTER_MODEL", "OPENROUTER_MODEL"),
    )
    openrouter_app_name: str = Field(
        default="HackTues OCR Service",
        validation_alias=AliasChoices("OCR_SERVICE_OPENROUTER_APP_NAME", "OPENROUTER_APP_NAME"),
    )
    openrouter_http_referer: str | None = Field(
        default=None,
        validation_alias=AliasChoices("OCR_SERVICE_OPENROUTER_HTTP_REFERER", "OPENROUTER_HTTP_REFERER"),
    )
    openrouter_max_ocr_chars: int = Field(
        default=12000,
        validation_alias=AliasChoices("OCR_SERVICE_OPENROUTER_MAX_OCR_CHARS", "OPENROUTER_MAX_OCR_CHARS"),
    )

    @property
    def max_file_size_bytes(self) -> int:
        return self.max_file_size_mb * 1024 * 1024

    @property
    def resolved_tesseract_cmd(self) -> str | None:
        if self.tesseract_cmd:
            return self.tesseract_cmd

        default_windows_path = Path("C:/Program Files/Tesseract-OCR/tesseract.exe")
        if default_windows_path.exists():
            return str(default_windows_path)

        return None

    @property
    def openrouter_enabled(self) -> bool:
        return bool(self.openrouter_api_key)


@lru_cache
def get_settings() -> Settings:
    return Settings()
