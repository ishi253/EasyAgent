from __future__ import annotations
from typing import Any, List, Optional, Literal
from pydantic import BaseModel, Field, field_validator


class Parameter(BaseModel):
    name: str = Field(..., pattern=r"^[a-z_][a-z0-9_]*$")
    type: str
    description: str
    default: Optional[Any] = None

    @field_validator("type")
    @classmethod
    def validate_type(cls, v: str) -> str:
        allowed_fragments = {
            "str","int","float","bool","list","dict","List","Dict","Any","Union","Optional","tuple","Tuple","Path"
        }
        if not any(f in v for f in allowed_fragments):
            raise ValueError(f"Unsupported or unsafe type: {v}")
        return v


class Tool(BaseModel):
    name: str = Field(..., pattern=r"^[a-z_][a-z0-9_]*$")
    description: str
    parameters: List[Parameter]
    return_type: str
    implementation: str
    is_async: bool = False


class Dependency(BaseModel):
    name: str = Field(..., pattern=r"^[a-z0-9\-_]+$")
    version: str = Field(..., pattern=r"^[><=!~\d\.,\s]+$")


class RuntimeEnv(BaseModel):
    workdir_required: bool = False
    network_access: bool = False


class Test(BaseModel):
    tool: str
    args: dict
    expected_result: Any
    assertion: Literal["equals","contains","type_check"] = "equals"


class IR(BaseModel):
    server_name: str = Field(..., pattern=r"^[a-z0-9\-]+$")
    description: str
    tools: List[Tool]
    dependencies: List[Dependency] = Field(default_factory=list)
    environment: RuntimeEnv = Field(default_factory=RuntimeEnv)
    tests: List[Test] = Field(default_factory=list)

