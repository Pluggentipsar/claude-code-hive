"""
Authentication API endpoints.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User, UserRole
from app.core.security import verify_password, get_password_hash, create_access_token
from app.schemas.auth import UserCreate, UserResponse, LoginRequest, TokenResponse
from app.api.deps import get_current_user, require_admin

router = APIRouter()


@router.post("/login", response_model=TokenResponse)
async def login(
    login_data: LoginRequest,
    db: Session = Depends(get_db),
):
    """Authenticate user and return JWT token."""
    user = db.query(User).filter(User.email == login_data.email).first()

    if not user or not verify_password(login_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
        )

    if not user.active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account is inactive",
        )

    token = create_access_token(user_id=str(user.id), role=user.role.value)

    return TokenResponse(
        access_token=token,
        user=UserResponse.model_validate(user),
    )


@router.post("/register-first", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register_first_admin(
    user_data: UserCreate,
    db: Session = Depends(get_db),
):
    """
    Register the first admin user. Only works when no users exist in the database.
    """
    existing_count = db.query(User).count()
    if existing_count > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Users already exist. Use /register with admin credentials.",
        )

    user = User(
        email=user_data.email,
        hashed_password=get_password_hash(user_data.password),
        first_name=user_data.first_name,
        last_name=user_data.last_name,
        role=UserRole.ADMIN,
    )

    db.add(user)
    db.commit()
    db.refresh(user)

    return user


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register_user(
    user_data: UserCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """Register a new user. Requires admin access."""
    existing = db.query(User).filter(User.email == user_data.email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"User with email {user_data.email} already exists",
        )

    user = User(
        email=user_data.email,
        hashed_password=get_password_hash(user_data.password),
        first_name=user_data.first_name,
        last_name=user_data.last_name,
        role=user_data.role,
    )

    db.add(user)
    db.commit()
    db.refresh(user)

    return user


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(
    current_user: User = Depends(get_current_user),
):
    """Return the currently authenticated user."""
    return current_user
