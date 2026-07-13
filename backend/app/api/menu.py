import os
import shutil
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List
from app.database import get_db
from app.models import Category, MenuItem
from app.schemas import CategoryCreate, CategoryUpdate, CategoryOut, MenuItemCreate, MenuItemUpdate, MenuItemOut
from app.auth import get_current_user
from app.config import settings

router = APIRouter(prefix="/menu", tags=["Menu"])


# ─── Categories ───────────────────────────────────────────────────────────────

@router.get("/categories", response_model=List[CategoryOut])
def list_categories(db: Session = Depends(get_db)):
    categories = db.query(Category).filter(Category.is_active == True).order_by(Category.display_order).all()
    result = []
    for cat in categories:
        count = db.query(func.count(MenuItem.id)).filter(MenuItem.category_id == cat.id, MenuItem.is_available == True).scalar()
        out = CategoryOut.model_validate(cat)
        out.item_count = count
        result.append(out)
    return result


@router.get("/categories/all", response_model=List[CategoryOut])
def list_all_categories(db: Session = Depends(get_db), _=Depends(get_current_user)):
    categories = db.query(Category).order_by(Category.display_order).all()
    result = []
    for cat in categories:
        count = db.query(func.count(MenuItem.id)).filter(MenuItem.category_id == cat.id).scalar()
        out = CategoryOut.model_validate(cat)
        out.item_count = count
        result.append(out)
    return result


@router.post("/categories", response_model=CategoryOut)
def create_category(data: CategoryCreate, db: Session = Depends(get_db), _=Depends(get_current_user)):
    cat = Category(**data.model_dump())
    db.add(cat)
    db.commit()
    db.refresh(cat)
    out = CategoryOut.model_validate(cat)
    out.item_count = 0
    return out


@router.put("/categories/{cat_id}", response_model=CategoryOut)
def update_category(cat_id: int, data: CategoryUpdate, db: Session = Depends(get_db), _=Depends(get_current_user)):
    cat = db.query(Category).filter(Category.id == cat_id).first()
    if not cat:
        raise HTTPException(status_code=404, detail="Category not found")
    for field, value in data.model_dump(exclude_none=True).items():
        setattr(cat, field, value)
    db.commit()
    db.refresh(cat)
    count = db.query(func.count(MenuItem.id)).filter(MenuItem.category_id == cat.id).scalar()
    out = CategoryOut.model_validate(cat)
    out.item_count = count
    return out


@router.delete("/categories/{cat_id}")
def delete_category(cat_id: int, db: Session = Depends(get_db), _=Depends(get_current_user)):
    cat = db.query(Category).filter(Category.id == cat_id).first()
    if not cat:
        raise HTTPException(status_code=404, detail="Category not found")
    # Soft delete
    cat.is_active = False
    db.commit()
    return {"message": "Category deleted"}


@router.post("/categories/{cat_id}/image")
async def upload_category_image(cat_id: int, file: UploadFile = File(...), db: Session = Depends(get_db), _=Depends(get_current_user)):
    cat = db.query(Category).filter(Category.id == cat_id).first()
    if not cat:
        raise HTTPException(status_code=404, detail="Category not found")
    upload_dir = os.path.join(settings.UPLOAD_DIR, "categories")
    os.makedirs(upload_dir, exist_ok=True)
    ext = file.filename.split(".")[-1]
    filename = f"cat_{cat_id}.{ext}"
    file_path = os.path.join(upload_dir, filename)
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    cat.image_url = f"/uploads/categories/{filename}"
    db.commit()
    return {"image_url": cat.image_url}


# ─── Menu Items ───────────────────────────────────────────────────────────────

def _build_menu_item_out(item: MenuItem) -> MenuItemOut:
    out = MenuItemOut.model_validate(item)
    out.category_name = item.category.name if item.category else None
    return out


@router.get("/items", response_model=List[MenuItemOut])
def list_menu_items(category_id: int = None, available_only: bool = True, db: Session = Depends(get_db)):
    query = db.query(MenuItem)
    if category_id:
        query = query.filter(MenuItem.category_id == category_id)
    if available_only:
        query = query.filter(MenuItem.is_available == True)
    items = query.order_by(MenuItem.display_order).all()
    return [_build_menu_item_out(i) for i in items]


@router.get("/items/all", response_model=List[MenuItemOut])
def list_all_menu_items(category_id: int = None, db: Session = Depends(get_db), _=Depends(get_current_user)):
    query = db.query(MenuItem)
    if category_id:
        query = query.filter(MenuItem.category_id == category_id)
    items = query.order_by(MenuItem.display_order).all()
    return [_build_menu_item_out(i) for i in items]


@router.post("/items", response_model=MenuItemOut)
def create_menu_item(data: MenuItemCreate, db: Session = Depends(get_db), _=Depends(get_current_user)):
    cat = db.query(Category).filter(Category.id == data.category_id).first()
    if not cat:
        raise HTTPException(status_code=404, detail="Category not found")
    item = MenuItem(**data.model_dump())
    db.add(item)
    db.commit()
    db.refresh(item)
    return _build_menu_item_out(item)


@router.put("/items/{item_id}", response_model=MenuItemOut)
def update_menu_item(item_id: int, data: MenuItemUpdate, db: Session = Depends(get_db), _=Depends(get_current_user)):
    item = db.query(MenuItem).filter(MenuItem.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    for field, value in data.model_dump(exclude_none=True).items():
        setattr(item, field, value)
    db.commit()
    db.refresh(item)
    return _build_menu_item_out(item)


@router.delete("/items/{item_id}")
def delete_menu_item(item_id: int, db: Session = Depends(get_db), _=Depends(get_current_user)):
    item = db.query(MenuItem).filter(MenuItem.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    db.delete(item)
    db.commit()
    return {"message": "Item deleted"}


@router.post("/items/{item_id}/image")
async def upload_item_image(item_id: int, file: UploadFile = File(...), db: Session = Depends(get_db), _=Depends(get_current_user)):
    item = db.query(MenuItem).filter(MenuItem.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    upload_dir = os.path.join(settings.UPLOAD_DIR, "items")
    os.makedirs(upload_dir, exist_ok=True)
    ext = file.filename.split(".")[-1]
    filename = f"item_{item_id}.{ext}"
    file_path = os.path.join(upload_dir, filename)
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    item.image_url = f"/uploads/items/{filename}"
    db.commit()
    return {"image_url": item.image_url}


@router.patch("/items/{item_id}/toggle-availability")
def toggle_availability(item_id: int, db: Session = Depends(get_db), _=Depends(get_current_user)):
    item = db.query(MenuItem).filter(MenuItem.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    item.is_available = not item.is_available
    db.commit()
    return {"is_available": item.is_available}
