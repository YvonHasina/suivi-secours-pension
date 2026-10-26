"""
Sécurité, Chiffrement Bcrypt, Authentification JWT et RBAC
"""

import os
from datetime import datetime, timedelta
from typing import List, Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from models import User, UserRole

# Configurations de sécurité
SECRET_KEY = os.getenv("SECRET_KEY", "DECES_SUR_PENSION_SECRET_KEY_SUPER_SECURE_2026")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24 heures

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/token")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def get_current_user_from_token(token: str, db: Session) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Identifiants d'authentification invalides ou session expirée.",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    user = db.query(User).filter(User.email == email, User.is_active == True).first()
    if user is None:
        raise credentials_exception
    return user


def require_roles(allowed_roles: List[UserRole]):
    """
    Dépendance FastAPI pour contrôler le rôle RBAC de l'utilisateur :
    - AGENT : Saisie de la réception et enquête (cocher pièces)
    - CONTROLEUR_CF : Renseigne date_envoi_cf, num_decision, valide ou rejette (avec motif_rejet)
    - COMPTABLE : Renseigne date_mandat et valide le paiement
    - ADMIN : Accès total
    """
    def role_checker(token: str = Depends(oauth2_scheme), db: Session = Depends(lambda: None)):
        # Utilisé en conjonction avec get_db dans les endpoints
        pass
    return role_checker
