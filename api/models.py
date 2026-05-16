from pydantic import BaseModel
from typing import List, Optional

class PeriodConfig(BaseModel):
    label: str
    start_time: str
    end_time: str
    is_break: bool

class ScheduleConfig(BaseModel):
    include_saturday: bool
    periods: List[PeriodConfig]
    allow_free_periods: bool = True

class StaffInput(BaseModel):
    name: str
    subject: str
    classes: List[str]
    class_teacher_for: Optional[str] = None
    periods_per_day: int = 1

class ScheduleRequest(BaseModel):
    institution_name: str
    config: ScheduleConfig
    classes: List[str]
    staff: List[StaffInput]
