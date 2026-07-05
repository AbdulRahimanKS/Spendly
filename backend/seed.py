from app.core.database import SessionLocal
from app.models import models

def seed_categories():
    db = SessionLocal()
    categories = [
        {"name": "Food & Drink", "color": "#D99771", "icon": "Utensils"},
        {"name": "Transport", "color": "#545F73", "icon": "Car"},
        {"name": "Shopping", "color": "#181C21", "icon": "ShoppingBag"},
        {"name": "Entertainment", "color": "#8FA38D", "icon": "Film"},
        {"name": "Housing", "color": "#1E293B", "icon": "Home"},
        {"name": "Income", "color": "#8FA38D", "icon": "TrendingUp"},
        {"name": "Other", "color": "#75777B", "icon": "Layers"},
    ]
    
    for cat_data in categories:
        exists = db.query(models.Category).filter(models.Category.name == cat_data["name"]).first()
        if not exists:
            db_cat = models.Category(**cat_data)
            db.add(db_cat)
    
    db.commit()
    db.close()
    print("Categories seeded successfully!")

if __name__ == "__main__":
    seed_categories()
