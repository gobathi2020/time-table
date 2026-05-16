from fpdf import FPDF

def create_table(pdf, title, subtitle, days_count, periods_config, schedule_grid):
    pdf.add_page(orientation="L") 
    pdf.set_font("Times", "B", 16)
    pdf.cell(0, 10, title, align="C", new_x="LMARGIN", new_y="NEXT")
    
    if subtitle:
        pdf.set_font("Times", "I", 11)
        pdf.cell(0, 8, subtitle, align="C", new_x="LMARGIN", new_y="NEXT")
    
    pdf.ln(3)
    
    total_cols = days_count + 1
    col_width = (pdf.w - 20) / total_cols
    
    pdf.set_font("Times", "B", 10)
    pdf.cell(col_width, 8, "Time", border=1, align="C")
    day_names = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
    for d in range(days_count):
        pdf.cell(col_width, 8, day_names[d], border=1, align="C")
    pdf.ln()
    
    pdf.set_font("Times", "", 9)
    # Give rows a fixed height unless there are many periods
    row_height = 14 if len(periods_config) <= 8 else 12
    
    for p, p_conf in enumerate(periods_config):
        # Draw Time column
        time_text = f"{p_conf.label}\n{p_conf.start_time} - {p_conf.end_time}"
        pdf.multi_cell(col_width, row_height/2, time_text, border=1, align="C", new_x="RIGHT", new_y="TOP", max_line_height=row_height/2)
        
        # Draw days
        for d in range(days_count):
            if p_conf.is_break:
                pdf.set_fill_color(240, 240, 240)
                pdf.multi_cell(col_width, row_height, "BREAK", border=1, align="C", new_x="RIGHT", new_y="TOP", fill=True, max_line_height=row_height)
            else:
                content = schedule_grid[d][p]
                pdf.multi_cell(col_width, row_height/2, content if content else "", border=1, align="C", new_x="RIGHT", new_y="TOP", max_line_height=row_height/2)
            
        pdf.ln(row_height)

def generate_class_pdf(institution_name, config, classes, staff_list, class_schedule):
    pdf = FPDF(orientation="Landscape")
    days_count = 6 if config.include_saturday else 5
    for c in classes:
        # Find class teacher
        class_teacher = "Not Assigned"
        for s in staff_list:
            if s.class_teacher_for == c:
                class_teacher = s.name
                break
        
        grid = [["" for _ in range(len(config.periods))] for _ in range(days_count)]
        for d in range(days_count):
            for p in range(len(config.periods)):
                slot = class_schedule[c][d][p]
                if slot:
                    grid[d][p] = f"{slot['subject']}\n{slot['teacher']}"
        
        create_table(pdf, f"{institution_name} - Class {c}", f"Class Teacher: {class_teacher}", days_count, config.periods, grid)
    return pdf.output()

def generate_staff_pdf(institution_name, config, staff_names, class_schedule):
    pdf = FPDF(orientation="Landscape")
    days_count = 6 if config.include_saturday else 5
    staff_schedule = {s: [["" for _ in range(len(config.periods))] for _ in range(days_count)] for s in staff_names}
    for c, days_list in class_schedule.items():
        for d in range(days_count):
            for p in range(len(config.periods)):
                slot = days_list[d][p]
                if slot:
                    teacher = slot["teacher"]
                    if teacher in staff_schedule:
                        if not staff_schedule[teacher][d][p]:
                            staff_schedule[teacher][d][p] = f"{c}\n{slot['subject']}"
                        
    for s in staff_names:
        create_table(pdf, f"{institution_name} - Staff {s}", None, days_count, config.periods, staff_schedule[s])
    return pdf.output()
