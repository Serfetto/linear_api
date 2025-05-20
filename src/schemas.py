from fastapi import UploadFile
from pydantic import BaseModel

class ValueSchema(BaseModel):
    value: int

class PlotValueSchema(BaseModel):
    index: str
    column: str