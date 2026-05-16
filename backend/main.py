from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from models import ScheduleRequest
from scheduler import generate_schedule
from pdf_generator import generate_class_pdf, generate_staff_pdf

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/export/classes")
async def export_classes(req: ScheduleRequest):
    schedule = generate_schedule(req)
    pdf_bytes = generate_class_pdf(req.institution_name, req.config, req.classes, req.staff, schedule)
    return Response(
        content=bytes(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": "attachment; filename=classes_timetable.pdf"}
    )

@app.post("/export/staff")
async def export_staff(req: ScheduleRequest):
    schedule = generate_schedule(req)
    staff_names = []
    for s in req.staff:
        if s.name not in staff_names:
            staff_names.append(s.name)
    pdf_bytes = generate_staff_pdf(req.institution_name, req.config, staff_names, schedule)
    return Response(
        content=bytes(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": "attachment; filename=staff_timetable.pdf"}
    )
