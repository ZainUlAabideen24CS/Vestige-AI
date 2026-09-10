from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.core.deps import get_db, get_current_user, require_roles
from app.core.security import (
    hash_password,
    verify_password,
    create_access_token,
    generate_reset_token,
)
from app.core.config import FRONTEND_URL
from app.models.user import User
from app.schemas.user import (
    UserCreate,
    UserOut,
    Token,
    ChangePasswordRequest,
    ForgotPasswordRequest,
    ResetPasswordRequest,
)
from app.services.email_service import send_password_reset_email


RESET_TOKEN_EXPIRE_MINUTES = 30

router = APIRouter(prefix="/auth", tags=["auth"])


# ============================================================
# REGISTER / CREATE USER
# Admin only
# ============================================================

@router.post("/register", response_model=UserOut)
def register(
    payload: UserCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_roles("admin")),
):
    if db.query(User).filter(User.email == payload.email).first():
        raise HTTPException(
            status_code=400,
            detail="Email already registered",
        )

    user = User(
        email=payload.email,
        full_name=payload.full_name,
        hashed_password=hash_password(payload.password),
        role=payload.role,
        must_reset_password=True,
    )

    db.add(user)
    db.commit()
    db.refresh(user)

    return user


# ============================================================
# LOGIN
# ============================================================

@router.post("/login", response_model=Token)
def login(
    form: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.email == form.username).first()

    if not user or not verify_password(
        form.password,
        user.hashed_password,
    ):
        raise HTTPException(
            status_code=401,
            detail="Incorrect email or password",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=403,
            detail="User account is inactive",
        )

    token = create_access_token(
        subject=user.email,
        role=user.role,
    )

    return Token(
        access_token=token,
        must_reset_password=user.must_reset_password,
    )


# ============================================================
# CURRENT USER
# ============================================================

@router.get("/me", response_model=UserOut)
def me(
    user: User = Depends(get_current_user),
):
    return user


# ============================================================
# CHANGE PASSWORD
#
# Used for:
# 1. Forced first-login password change
# 2. Normal logged-in password change
# ============================================================

@router.post("/change-password")
def change_password(
    payload: ChangePasswordRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    if not verify_password(
        payload.current_password,
        user.hashed_password,
    ):
        raise HTTPException(
            status_code=400,
            detail="Current password is incorrect",
        )

    if len(payload.new_password) < 8:
        raise HTTPException(
            status_code=400,
            detail="New password must be at least 8 characters",
        )

    user.hashed_password = hash_password(
        payload.new_password
    )

    # First-login password requirement is now completed
    user.must_reset_password = False

    db.commit()

    return {
        "message": "Password updated successfully"
    }


# ============================================================
# FORGOT PASSWORD
# ============================================================

@router.post("/forgot-password")
def forgot_password(
    payload: ForgotPasswordRequest,
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(
        User.email == payload.email
    ).first()

    # Always return the same response whether or not
    # the email exists, so users cannot be enumerated.
    generic_response = {
        "message": (
            "If an account with that email exists, "
            "a reset link has been sent."
        )
    }

    if not user or not user.is_active:
        return generic_response

    token = generate_reset_token()

    user.reset_token = token

    user.reset_token_expires = (
        datetime.now(timezone.utc)
        + timedelta(minutes=RESET_TOKEN_EXPIRE_MINUTES)
    )

    db.commit()

    reset_link = (
        f"{FRONTEND_URL}/reset-password?token={token}"
    )

    try:
        send_password_reset_email(
            user.email,
            user.full_name,
            reset_link,
        )

    except Exception as e:
        # Do not expose email/SMTP errors to frontend.
        print(
            f"[auth] Failed to send reset email: {e}"
        )

    return generic_response


# ============================================================
# RESET PASSWORD
# Via emailed reset token
# ============================================================

@router.post("/reset-password")
def reset_password(
    payload: ResetPasswordRequest,
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(
        User.reset_token == payload.token
    ).first()

    if not user or not user.reset_token_expires:
        raise HTTPException(
            status_code=400,
            detail="Invalid or expired reset link",
        )

    expires_at = user.reset_token_expires

    # SQL Server may return a naive datetime.
    # Treat it as UTC.
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(
            tzinfo=timezone.utc
        )

    if expires_at < datetime.now(timezone.utc):
        raise HTTPException(
            status_code=400,
            detail="Invalid or expired reset link",
        )

    if len(payload.new_password) < 8:
        raise HTTPException(
            status_code=400,
            detail="New password must be at least 8 characters",
        )

    user.hashed_password = hash_password(
        payload.new_password
    )

    user.must_reset_password = False

    # Token can only be used once
    user.reset_token = None
    user.reset_token_expires = None

    db.commit()

    return {
        "message": (
            "Password reset successfully. "
            "You can now log in."
        )
    }