from pydantic import BaseModel, EmailStr
from typing import List, Optional
from datetime import datetime

# Shared properties
class TransactionBase(BaseModel):
    title: str
    amount: float
    description: Optional[str] = None
    type: str # 'income' or 'expense'
    category_id: int
    date: Optional[datetime] = None
    debt_id: Optional[int] = None

class TransactionCreate(TransactionBase):
    pass

class Transaction(TransactionBase):
    id: int
    user_id: int
    date: datetime

    class Config:
        from_attributes = True

# User schemas
class UserBase(BaseModel):
    email: EmailStr
    full_name: Optional[str] = None

class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    profile_image: Optional[str] = None

class UserCreate(UserBase):
    password: str

class User(UserBase):
    id: int
    is_active: bool
    created_at: datetime
    profile_image: Optional[str] = None

    class Config:
        from_attributes = True

# Category schemas
class CategoryBase(BaseModel):
    name: str
    color: str
    icon: str

class Category(CategoryBase):
    id: int

    class Config:
        from_attributes = True

# Token schemas
class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None

# Debt schemas
class DebtBase(BaseModel):
    name: str
    category: Optional[str] = "Personal"
    total_principal: float
    outstanding_amount: float
    monthly_emi: float = 0.0
    interest_rate_desc: Optional[str] = None
    due_date: Optional[datetime] = None
    status: Optional[str] = "active"

class DebtCreate(DebtBase):
    pass

class DebtUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    total_principal: Optional[float] = None
    outstanding_amount: Optional[float] = None
    monthly_emi: Optional[float] = None
    interest_rate_desc: Optional[str] = None
    due_date: Optional[datetime] = None
    status: Optional[str] = None

class Debt(DebtBase):
    id: int
    user_id: int

    class Config:
        from_attributes = True
