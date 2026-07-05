from sqlalchemy.orm import Session
from sqlalchemy.sql import func
from app.models import models
from app.schemas import schemas
from app.core import security

def get_transaction_stats(db: Session, user_id: int):
    results = db.query(
        models.Transaction.type, 
        func.sum(models.Transaction.amount).label('total')
    ).filter(models.Transaction.user_id == user_id).group_by(models.Transaction.type).all()
    
    income = 0
    spending = 0
    for r in results:
        if r.type == 'income':
            income = r.total or 0
        else:
            spending = r.total or 0
    return {"balance": income - spending, "income": income, "spending": spending}

def get_transactions_dashboard(db: Session, user_id: int):
    stats = get_transaction_stats(db, user_id)
    recent = db.query(models.Transaction).filter(models.Transaction.user_id == user_id).order_by(models.Transaction.date.desc()).limit(5).all()
    return {
        "stats": stats,
        "recent": recent
    }

import datetime
import calendar

def get_monthly_analytics(db: Session, user_id: int, start_date_str: str, end_date_str: str, timezone_offset: int):
    # Parse precise ISO boundaries provided by the local device
    start_date = datetime.datetime.fromisoformat(start_date_str.replace("Z", "+00:00"))
    end_date = datetime.datetime.fromisoformat(end_date_str.replace("Z", "+00:00"))
    
    expenses = db.query(models.Transaction).filter(
        models.Transaction.user_id == user_id,
        models.Transaction.type == 'expense',
        models.Transaction.date >= start_date,
        models.Transaction.date <= end_date
    ).all()

    total_spending = 0
    category_map = {}
    weekly_data = [0] * 7

    for t in expenses:
        total_spending += t.amount
        cat_map = {1: 'Food & Drink', 2: 'Transport', 3: 'Shopping', 4: 'Entertainment', 5: 'Housing', 7: 'Other'}
        cat_name = getattr(t.category, 'name', None) or cat_map.get(t.category_id, 'Other')
        category_map[cat_name] = category_map.get(cat_name, 0) + t.amount
        
        # SQLite stores naive datetimes, but we know they were generated from UTC ISO strings
        dt = t.date if isinstance(t.date, datetime.datetime) else datetime.datetime.fromisoformat(str(t.date).replace("Z", "+00:00"))
        
        # Strip timezone info if present to do naive math
        if dt.tzinfo:
            dt = dt.replace(tzinfo=None)
            
        # JS getTimezoneOffset() is (UTC - Local) in minutes. For IST (+5:30), it's -330.
        # So to get Local time from UTC, we do UTC - offset
        local_dt = dt - datetime.timedelta(minutes=timezone_offset)
        
        # dt.weekday() returns 0 for Monday, 6 for Sunday
        day_idx = local_dt.weekday()
        weekly_data[day_idx] += t.amount

    breakdown = [{"name": k, "amount": v} for k, v in category_map.items()]
    breakdown.sort(key=lambda x: x["amount"], reverse=True)

    return {
        "totalSpending": total_spending,
        "breakdown": breakdown,
        "weeklyData": weekly_data
    }

def get_user_by_email(db: Session, email: str):
    return db.query(models.User).filter(models.User.email == email).first()

def create_user(db: Session, user: schemas.UserCreate):
    hashed_password = security.get_password_hash(user.password)
    db_user = models.User(
        email=user.email, 
        hashed_password=hashed_password,
        full_name=user.full_name
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

def update_user(db: Session, db_user: models.User, user_update: schemas.UserUpdate):
    update_data = user_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_user, key, value)
    db.commit()
    db.refresh(db_user)
    return db_user

def get_transactions(db: Session, user_id: int, skip: int = 0, limit: int = 100, search: str = None, tx_type: str = None, category_id: int = None, start_date: str = None, end_date: str = None):
    query = db.query(models.Transaction).filter(models.Transaction.user_id == user_id)
    if search:
        query = query.filter(models.Transaction.title.ilike(f"%{search}%"))
    if tx_type and tx_type != 'all':
        query = query.filter(models.Transaction.type == tx_type)
    if category_id:
        query = query.filter(models.Transaction.category_id == category_id)
    if start_date:
        start_dt = datetime.datetime.fromisoformat(start_date.replace("Z", "+00:00"))
        query = query.filter(models.Transaction.date >= start_dt)
    if end_date:
        end_dt = datetime.datetime.fromisoformat(end_date.replace("Z", "+00:00"))
        query = query.filter(models.Transaction.date <= end_dt)
    return query.order_by(models.Transaction.date.desc()).offset(skip).limit(limit).all()

def get_transactions_by_debt(db: Session, user_id: int, debt_id: int):
    return db.query(models.Transaction).filter(
        models.Transaction.user_id == user_id, 
        models.Transaction.debt_id == debt_id
    ).order_by(models.Transaction.date.desc()).all()

def create_user_transaction(db: Session, transaction: schemas.TransactionCreate, user_id: int):
    data = transaction.model_dump(exclude_none=True)
    db_transaction = models.Transaction(**data, user_id=user_id)
    db.add(db_transaction)
    db.commit()
    db.refresh(db_transaction)
    return db_transaction

def delete_transaction(db: Session, transaction_id: int, user_id: int):
    db_transaction = db.query(models.Transaction).filter(
        models.Transaction.id == transaction_id,
        models.Transaction.user_id == user_id
    ).first()
    if db_transaction:
        db.delete(db_transaction)
        db.commit()
    return db_transaction

def update_transaction(db: Session, transaction_id: int, transaction_update: schemas.TransactionCreate, user_id: int):
    db_transaction = db.query(models.Transaction).filter(
        models.Transaction.id == transaction_id,
        models.Transaction.user_id == user_id
    ).first()
    if db_transaction:
        for key, value in transaction_update.model_dump().items():
            setattr(db_transaction, key, value)
        db.commit()
        db.refresh(db_transaction)
    return db_transaction

def get_debts(db: Session, user_id: int, skip: int = 0, limit: int = 100):
    return db.query(models.Debt).filter(models.Debt.user_id == user_id).order_by(models.Debt.due_date.asc()).offset(skip).limit(limit).all()

def get_debts_dashboard(db: Session, user_id: int):
    totals = db.query(
        func.sum(models.Debt.total_principal).label('total_principal'),
        func.sum(models.Debt.outstanding_amount).label('total_outstanding')
    ).filter(models.Debt.user_id == user_id).first()
    
    upcoming = db.query(models.Debt).filter(
        models.Debt.user_id == user_id,
        models.Debt.status != 'paid'
    ).order_by(models.Debt.due_date.asc()).limit(5).all()
    
    return {
        "summary": {
            "total_principal": totals.total_principal or 0,
            "total_outstanding": totals.total_outstanding or 0
        },
        "upcoming": upcoming
    }

def create_debt(db: Session, debt: schemas.DebtCreate, user_id: int):
    db_debt = models.Debt(**debt.model_dump(), user_id=user_id)
    if db_debt.outstanding_amount == 0:
        db_debt.status = 'paid'
    db.add(db_debt)
    db.commit()
    db.refresh(db_debt)
    return db_debt

def update_debt(db: Session, debt_id: int, debt_update: schemas.DebtUpdate, user_id: int):
    db_debt = db.query(models.Debt).filter(models.Debt.id == debt_id, models.Debt.user_id == user_id).first()
    if db_debt:
        for key, value in debt_update.model_dump(exclude_unset=True).items():
            setattr(db_debt, key, value)
        db.commit()
        db.refresh(db_debt)
    return db_debt

def delete_debt(db: Session, debt_id: int, user_id: int):
    db_debt = db.query(models.Debt).filter(models.Debt.id == debt_id, models.Debt.user_id == user_id).first()
    if db_debt:
        db.delete(db_debt)
        db.commit()
    return db_debt

def pay_debt(db: Session, debt_id: int, user_id: int):
    db_debt = db.query(models.Debt).filter(models.Debt.id == debt_id, models.Debt.user_id == user_id).first()
    if db_debt:
        payment_amount = db_debt.monthly_emi if db_debt.monthly_emi > 0 else db_debt.outstanding_amount
        db_debt.outstanding_amount = max(0, db_debt.outstanding_amount - payment_amount)
        
        if db_debt.monthly_emi > 0 and db_debt.due_date:
            dt = db_debt.due_date
            month = dt.month
            year = dt.year
            if month == 12:
                month = 1
                year += 1
            else:
                month += 1
            import calendar
            last_day = calendar.monthrange(year, month)[1]
            try:
                db_debt.due_date = dt.replace(year=year, month=month)
            except ValueError:
                db_debt.due_date = dt.replace(year=year, month=month, day=last_day)
                
        if db_debt.outstanding_amount == 0:
            db_debt.status = 'paid'
            
        # Create a transaction for this payment
        category = db.query(models.Category).filter(models.Category.name == "Other").first()
        cat_id = category.id if category else 7
        
        tx = models.Transaction(
            title=f"Paid: {db_debt.name}",
            amount=payment_amount,
            description="Debt Payment",
            type="expense",
            category_id=cat_id,
            user_id=user_id,
            debt_id=db_debt.id
        )
        db.add(tx)
            
        db.commit()
        db.refresh(db_debt)
    return db_debt

