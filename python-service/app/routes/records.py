from fastapi import APIRouter, Depends, HTTPException, status

from app.middleware.auth import CurrentUser, get_current_user
from app.schemas import RecordCreate
from app.services import record_service

router = APIRouter(prefix="/api/records")

# Every endpoint requires a valid JWT (issued by node-service): Depends(get_current_user).


@router.post("", status_code=status.HTTP_201_CREATED)
def create(body: RecordCreate, user: CurrentUser = Depends(get_current_user)):
    record = record_service.create_record(user.id, body)
    return {"success": True, "message": "Record saved", "data": record}


@router.get("")
def list_own(user: CurrentUser = Depends(get_current_user)):
    return {"success": True, "data": record_service.list_records(user.id)}


# PUT replaces all editable fields, so it reuses the create schema and its validation.
@router.put("/{record_id}")
def update(record_id: int, body: RecordCreate, user: CurrentUser = Depends(get_current_user)):
    record = record_service.update_record(user.id, record_id, body)
    if record is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Record not found")
    return {"success": True, "message": "Record updated", "data": record}


@router.delete("/{record_id}")
def delete(record_id: int, user: CurrentUser = Depends(get_current_user)):
    if not record_service.delete_record(user.id, record_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Record not found")
    return {"success": True, "message": "Record deleted"}
