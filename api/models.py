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

class SubjectConfig(BaseModel):
    name: str
    periods_per_week: int

class ClassInput(BaseModel):
    name: str
    subjects: List[SubjectConfig]

class StaffAssignment(BaseModel):
    class_name: str
    subject_name: str

class StaffInput(BaseModel):
    name: str
    assignments: List[StaffAssignment]
    class_teacher_for: Optional[str] = None
    available_until_period: Optional[int] = None # e.g. 6 means not available after period 6

class ScheduleRequest(BaseModel):
    institution_name: str
    config: ScheduleConfig
    classes: List[ClassInput]
    staff: List[StaffInput]
