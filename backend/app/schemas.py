from typing import Optional
from pydantic import BaseModel, EmailStr, Field, field_validator


class SignupRequest(BaseModel):
    email: EmailStr
    password: str
    full_name: Optional[str] = None

    @field_validator("password")
    @classmethod
    def password_min_length(cls, v):
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters.")
        return v


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class GoogleAuthRequest(BaseModel):
    credential: str  # the ID token string from Google Identity Services


class UserResponse(BaseModel):
    id: str
    email: str
    full_name: Optional[str]
    auth_provider: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


class LoanApplicationCreate(BaseModel):
    person_age: float
    person_gender: str
    person_education: str
    person_income: float
    person_emp_exp: int
    person_home_ownership: str
    loan_amnt: float
    loan_intent: str
    loan_int_rate: float
    loan_percent_income: float
    cb_person_cred_hist_length: float
    credit_score: int
    previous_loan_defaults_on_file: str

    class Config:
        json_schema_extra = {
            "example": {
                "person_age": 28,
                "person_gender": "female",
                "person_education": "Bachelor",
                "person_income": 65000,
                "person_emp_exp": 5,
                "person_home_ownership": "RENT",
                "loan_amnt": 12000,
                "loan_intent": "MEDICAL",
                "loan_int_rate": 11.5,
                "loan_percent_income": 0.18,
                "cb_person_cred_hist_length": 6,
                "credit_score": 680,
                "previous_loan_defaults_on_file": "No",
            }
        }


class ApplicationResponse(BaseModel):
    id: str
    bank_id: str
    decision: Optional[str]
    prediction_score: Optional[float]
    proof_status: str
    onchain_tx_hash: Optional[str]
    created_at: str

    class Config:
        from_attributes = True


class ApplicationDetail(ApplicationResponse):
    raw_input: dict
    model_version_id: int


class ProofGenerateResponse(BaseModel):
    application_id: str
    proof_status: str
    message: str


class OcrApplicationExtraction(BaseModel):
    person_age: Optional[float] = None
    person_gender: Optional[str] = None
    person_education: Optional[str] = None
    person_income: Optional[float] = None
    person_emp_exp: Optional[int] = None
    person_home_ownership: Optional[str] = None
    loan_amnt: Optional[float] = None
    loan_intent: Optional[str] = None
    loan_int_rate: Optional[float] = None
    loan_percent_income: Optional[float] = None
    cb_person_cred_hist_length: Optional[float] = None
    credit_score: Optional[int] = None
    previous_loan_defaults_on_file: Optional[str] = None
    mock: bool


class OcrTestPdfResponse(BaseModel):
    pdf_base64: str
    ground_truth: LoanApplicationCreate