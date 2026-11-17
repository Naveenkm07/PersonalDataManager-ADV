from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field, StringConstraints
from typing_extensions import Annotated

PasswordValue = Annotated[str, StringConstraints(min_length=12, max_length=256)]
OtpValue = Annotated[str, StringConstraints(pattern=r"^\d{6}$")]


class RegisterRequest(BaseModel):
    email: EmailStr
    username: Annotated[str, StringConstraints(min_length=3, max_length=120)]
    password: PasswordValue


class LoginRequest(BaseModel):
    email: EmailStr
    password: Annotated[str, StringConstraints(min_length=1, max_length=256)]
    otp: OtpValue | None = None


class MfaCodeRequest(BaseModel):
    code: OtpValue


class MfaDisableRequest(BaseModel):
    password: Annotated[str, StringConstraints(min_length=1, max_length=256)]
    code: OtpValue


class OAuthMfaCompleteRequest(BaseModel):
    challenge_token: str
    code: OtpValue


class RecordInput(BaseModel):
    title: Annotated[str, StringConstraints(min_length=1, max_length=160)]
    category: Literal["credential", "note", "contact", "profile", "other"]
    data: dict[str, Any] = Field(min_length=1, max_length=100)


class RecordOutput(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    title: str
    category: str
    data: dict[str, Any]
    created_at: datetime
    updated_at: datetime


class UserOutput(BaseModel):
    id: str
    _id: str | None = None
    name: str
    username: str
    email: EmailStr
    role: str
    mfaEnabled: bool


class TokenOutput(BaseModel):
    token: str
    user: UserOutput
