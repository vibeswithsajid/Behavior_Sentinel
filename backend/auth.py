"""
auth.py
Authentication and authorisation for BehaviorSentinel.

Fixed accounts (seeded at startup):
  intern01      / intern123    → intern
  junior01      / junior123    → junior
  senior_mgr    / senior123    → senior_manager
  manager       / manager123   → manager

JWT tokens (HS256, 24 h expiry).
"""

import os
from datetime import datetime, timedelta
from typing import Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

try:
    from jose import JWTError, jwt
    import bcrypt as _bcrypt_mod
    _AUTH_AVAILABLE = True
except ImportError:
    _AUTH_AVAILABLE = False

# ── Config ────────────────────────────────────────────────────────────────────

SECRET_KEY = os.getenv("BS_SECRET_KEY", "behaviorsentinel-secret-key-2024-demo")
ALGORITHM  = "HS256"
TOKEN_EXPIRE_HOURS = 24

# Role hierarchy (higher index = more privileged)
ROLE_LEVELS = {
    "intern":         1,
    "junior":         2,
    "senior_manager": 3,
    "manager":        4,
}

# Fixed users to seed into the DB
FIXED_USERS = [
    {
        "user_id":    "intern01",
        "username":   "intern01",
        "name":       "Alex Rivera",
        "department": "Engineering",
        "role":       "intern",
        "password":   "intern123",
    },
    {
        "user_id":    "junior01",
        "username":   "junior01",
        "name":       "Jordan Kim",
        "department": "Finance",
        "role":       "junior",
        "password":   "junior123",
    },
    {
        "user_id":    "senior_mgr",
        "username":   "senior_mgr",
        "name":       "Morgan Singh",
        "department": "Operations",
        "role":       "senior_manager",
        "password":   "senior123",
    },
    {
        "user_id":    "manager",
        "username":   "manager",
        "name":       "Taylor Brooks",
        "department": "Management",
        "role":       "manager",
        "password":   "manager123",
    },
]

# ── Password hashing (direct bcrypt) ─────────────────────────────────────────

if _AUTH_AVAILABLE:
    def hash_password(plain: str) -> str:
        return _bcrypt_mod.hashpw(plain.encode("utf-8"), _bcrypt_mod.gensalt()).decode("utf-8")

    def verify_password(plain: str, hashed: str) -> bool:
        try:
            return _bcrypt_mod.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))
        except Exception:
            return False
else:
    def hash_password(plain: str) -> str:        # type: ignore
        return plain

    def verify_password(plain: str, hashed: str) -> bool:  # type: ignore
        return plain == hashed


# ── JWT helpers ───────────────────────────────────────────────────────────────

def create_token(user_id: str, role: str, name: str) -> str:
    if not _AUTH_AVAILABLE:
        # Return a simple colon-encoded token as fallback
        return f"{user_id}:{role}:{name}"

    expire = datetime.utcnow() + timedelta(hours=TOKEN_EXPIRE_HOURS)
    return jwt.encode(
        {"sub": user_id, "role": role, "name": name, "exp": expire},
        SECRET_KEY,
        algorithm=ALGORITHM,
    )


def decode_token(token: str) -> dict:
    if not _AUTH_AVAILABLE:
        parts = token.split(":")
        if len(parts) >= 3:
            return {"sub": parts[0], "role": parts[1], "name": parts[2]}
        raise ValueError("Invalid token")

    try:
        return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except JWTError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid token: {e}",
        )


# ── FastAPI dependency ────────────────────────────────────────────────────────

_bearer = HTTPBearer(auto_error=False)


def get_current_user(
    creds: Optional[HTTPAuthorizationCredentials] = Depends(_bearer),
) -> dict:
    """Dependency — returns {user_id, role, name} or raises 401."""
    if creds is None:
        raise HTTPException(status_code=401, detail="Missing authorisation token")
    return decode_token(creds.credentials)


def require_role(minimum_role: str):
    """Factory: returns a dependency that enforces a minimum role level."""
    min_level = ROLE_LEVELS.get(minimum_role, 1)

    def _check(current_user: dict = Depends(get_current_user)) -> dict:
        role  = current_user.get("role", "intern")
        level = ROLE_LEVELS.get(role, 0)
        if level < min_level:
            raise HTTPException(
                status_code=403,
                detail=f"Requires '{minimum_role}' role or above. Your role: '{role}'",
            )
        return current_user

    return _check


# ── Seed helpers ──────────────────────────────────────────────────────────────

def seed_auth_users():
    """Insert the 4 fixed users into the DB if they don't already exist."""
    import database as db
    db.seed_auth_users(FIXED_USERS)
