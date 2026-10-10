"""Request body validation (Pydantic). Invalid input -> 400 before any SQL runs."""
from pydantic import BaseModel, ConfigDict, Field


class RecordCreate(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True, extra="ignore")

    name: str = Field(min_length=2, max_length=100)
    email: str = Field(max_length=255, pattern=r"^[^\s@]+@[^\s@]+\.[^\s@]+$")
    age: int = Field(ge=18, le=100)
    department: str = Field(min_length=2, max_length=100)
    description: str = Field(default="", max_length=1000)
