from fastapi import APIRouter, Depends, status

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
