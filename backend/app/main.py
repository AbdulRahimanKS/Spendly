from fastapi import FastAPI, Depends, HTTPException, status
from typing import List
from sqlalchemy.orm import Session
from app.core.database import engine, get_db, Base
from app.models import models
from app.schemas import schemas
from app.crud import crud
from app.core import security
from app.api import deps
from fastapi.security import OAuth2PasswordRequestForm
from datetime import timedelta
from fastapi.middleware.cors import CORSMiddleware

# Initialize Database
models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="Spendly API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {"message": "Welcome to Spendly API"}

@app.post("/token", response_model=schemas.Token)
def login_for_access_token(db: Session = Depends(get_db), form_data: OAuth2PasswordRequestForm = Depends()):
    user = crud.get_user_by_email(db, email=form_data.username)
    if not user or not security.verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token_expires = timedelta(minutes=security.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = security.create_access_token(
        data={"sub": user.email}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

@app.post("/users/", response_model=schemas.User)
def create_user(user: schemas.UserCreate, db: Session = Depends(get_db)):
    db_user = crud.get_user_by_email(db, email=user.email)
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    return crud.create_user(db=db, user=user)

@app.get("/users/me/", response_model=schemas.User)
def read_users_me(current_user: models.User = Depends(deps.get_current_user)):
    return current_user

@app.put("/users/me/", response_model=schemas.User)
def update_user_me(
    user_update: schemas.UserUpdate,
    current_user: models.User = Depends(deps.get_current_user),
    db: Session = Depends(get_db)
):
    return crud.update_user(db=db, db_user=current_user, user_update=user_update)

@app.get("/transactions/dashboard")
def read_transactions_dashboard(
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(deps.get_current_user)
):
    return crud.get_transactions_dashboard(db=db, user_id=current_user.id)

@app.get("/transactions/", response_model=list[schemas.Transaction])
def read_transactions(
    skip: int = 0,
    limit: int = 100,
    search: str = None,
    type: str = None,
    category_id: int = None,
    start_date: str = None,
    end_date: str = None,
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(deps.get_current_user)
):
    transactions = crud.get_transactions(db, user_id=current_user.id, skip=skip, limit=limit, search=search, tx_type=type, category_id=category_id, start_date=start_date, end_date=end_date)
    return transactions

@app.get("/transactions/stats/")
def read_transaction_stats(db: Session = Depends(get_db), current_user: models.User = Depends(deps.get_current_user)):
    return crud.get_transaction_stats(db, user_id=current_user.id)

@app.get("/transactions/analytics/")
def read_monthly_analytics(
    start_date: str,
    end_date: str,
    timezone_offset: int,
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(deps.get_current_user)
):
    return crud.get_monthly_analytics(
        db, 
        user_id=current_user.id, 
        start_date_str=start_date, 
        end_date_str=end_date, 
        timezone_offset=timezone_offset
    )

@app.post("/transactions/", response_model=schemas.Transaction)
def create_transaction(
    transaction: schemas.TransactionCreate, 
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(deps.get_current_user)
):
    return crud.create_user_transaction(db=db, transaction=transaction, user_id=current_user.id)

@app.put("/transactions/{transaction_id}", response_model=schemas.Transaction)
def update_transaction(
    transaction_id: int,
    transaction: schemas.TransactionCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(deps.get_current_user)
):
    db_transaction = crud.update_transaction(
        db=db, transaction_id=transaction_id, transaction_update=transaction, user_id=current_user.id
    )
    if db_transaction is None:
        raise HTTPException(status_code=404, detail="Transaction not found")
    return db_transaction

@app.delete("/transactions/{transaction_id}")
def delete_transaction(
    transaction_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(deps.get_current_user)
):
    db_transaction = crud.delete_transaction(
        db=db, transaction_id=transaction_id, user_id=current_user.id
    )
    if db_transaction is None:
        raise HTTPException(status_code=404, detail="Transaction not found")
    return {"message": "Transaction deleted successfully"}

@app.get("/debts/", response_model=list[schemas.Debt])
def read_debts(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(deps.get_current_user)
):
    return crud.get_debts(db=db, user_id=current_user.id, skip=skip, limit=limit)

@app.get("/debts/dashboard")
def read_debts_dashboard(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(deps.get_current_user)
):
    return crud.get_debts_dashboard(db=db, user_id=current_user.id)

@app.get("/debts/{debt_id}/transactions", response_model=List[schemas.Transaction])
def read_transactions_by_debt(
    debt_id: int, 
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(deps.get_current_user)
):
    return crud.get_transactions_by_debt(db=db, user_id=current_user.id, debt_id=debt_id)

@app.post("/debts/", response_model=schemas.Debt)
def create_debt(
    debt: schemas.DebtCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(deps.get_current_user)
):
    return crud.create_debt(db=db, debt=debt, user_id=current_user.id)

@app.put("/debts/{debt_id}", response_model=schemas.Debt)
def update_debt(
    debt_id: int,
    debt: schemas.DebtUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(deps.get_current_user)
):
    db_debt = crud.update_debt(db=db, debt_id=debt_id, debt_update=debt, user_id=current_user.id)
    if not db_debt:
        raise HTTPException(status_code=404, detail="Debt not found")
    return db_debt

@app.delete("/debts/{debt_id}", response_model=schemas.Debt)
def delete_debt(
    debt_id: int, 
    db: Session = Depends(get_db),
    current_user: models.User = Depends(deps.get_current_user)
):
    debt = crud.delete_debt(db, debt_id=debt_id, user_id=current_user.id)
    if not debt:
        raise HTTPException(status_code=404, detail="Debt not found")
    return debt

@app.post("/debts/{debt_id}/pay", response_model=schemas.Debt)
def pay_debt(
    debt_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(deps.get_current_user)
):
    debt = crud.pay_debt(db, debt_id=debt_id, user_id=current_user.id)
    if not debt:
        raise HTTPException(status_code=404, detail="Debt not found")
    return debt
