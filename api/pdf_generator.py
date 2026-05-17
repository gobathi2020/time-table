from fpdf import FPDF
from datetime import datetime

def format_12h(time_str):
    try:
        t = datetime.strptime(time_str, "%H:%M")
        return t.strftime("%I:%M %p")
    except:
        return time_str

def create_table(pdf, title, subtitle, days_count, periods_config, schedule_grid):
    pdf.add_page(orientation="L") 
    pdf.set_auto_page_break(auto=False)
    
    # Header Background
    pdf.set_fill_color(245, 247, 250)
    pdf.rect(0, 0, pdf.w, 35, "F")
    
    # Institution Name
    pdf.set_font("Times", "B", 20)
    pdf.set_text_color(30, 41, 59)
    pdf.cell(0, 12, title, align="C", new_x="LMARGIN", new_y="NEXT")
    
    # Subtitle
    if subtitle:
        pdf.set_font("Times", "I", 11)
        pdf.set_text_color(71, 85, 105)
        pdf.cell(0, 6, subtitle, align="C", new_x="LMARGIN", new_y="NEXT")
    
    pdf.ln(8)
    
    # Table Config
    # Now columns = Day + num_periods
    num_periods = len(periods_config)
    total_cols = num_periods + 1
    
    usable_width = pdf.w - 20
    col_width = usable_width / total_cols
    pdf.set_left_margin(10)
    
    # Calculate available height for rows
    y_start_table = pdf.get_y()
    available_height = pdf.h - y_start_table - 10
    
    # Header row height + (days_count) data rows = days_count + 1 rows
    row_height = available_height / (days_count + 1)
    # Clamp row height to a reasonable max
    if row_height > 20: row_height = 20
    if row_height < 10: row_height = 10
    
    # Table Header (Periods as columns)
    pdf.set_fill_color(51, 65, 85)
    pdf.set_text_color(255, 255, 255)
    
    # First column header (Day)
    pdf.set_font("Times", "B", 10)
    pdf.cell(col_width, row_height, "Day \\ Period", border=1, align="C", fill=True)
    
    # Period columns
    for p_conf in periods_config:
        # 3 lines: Label, Start Time, End Time
        time_text = f"{p_conf.label}\n{format_12h(p_conf.start_time)}\n{format_12h(p_conf.end_time)}"
        x = pdf.get_x()
        y = pdf.get_y()
        pdf.set_font("Times", "B", 8)
        # Draw the cell explicitly to fix the border size to row_height
        pdf.rect(x, y, col_width, row_height, style="FD")
        # Vertically center the text approximately by adding a small top margin
        pdf.set_xy(x, y + (row_height - (3 * 4)) / 2) # approx 4pt per line
        pdf.multi_cell(col_width, 4, time_text, border=0, align="C", fill=False)
        pdf.set_xy(x + col_width, y)
    
    pdf.ln(row_height)
    
    # Table Content (Days as rows)
    pdf.set_text_color(30, 41, 59)
    day_names = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
    
    for d in range(days_count):
        pdf.set_fill_color(248, 250, 252)
        pdf.set_font("Times", "B", 10)
        # Day column
        pdf.cell(col_width, row_height, day_names[d], border=1, align="C", fill=True)
        
        # Period cells
        for p, p_conf in enumerate(periods_config):
            x = pdf.get_x()
            y = pdf.get_y()
            if p_conf.is_break:
                pdf.set_fill_color(241, 245, 249)
                pdf.set_font("Times", "I", 9)
                pdf.rect(x, y, col_width, row_height, style="FD")
                pdf.set_xy(x, y + (row_height - 5) / 2)
                pdf.multi_cell(col_width, 5, "BREAK", border=0, align="C", fill=False)
                pdf.set_xy(x + col_width, y)
            else:
                pdf.set_fill_color(255, 255, 255)
                pdf.set_font("Times", "", 8)
                content = schedule_grid[d][p]
                pdf.rect(x, y, col_width, row_height, style="D")
                if content:
                    # Content is 2 lines (Subject, Teacher)
                    # If subject wraps, it might be 3. Let's use small line height
                    pdf.set_xy(x, y + (row_height - 8) / 2) # Assume approx 8pt height for 2 lines
                    pdf.multi_cell(col_width, 4, content, border=0, align="C", fill=False)
                pdf.set_xy(x + col_width, y)
                
        pdf.ln(row_height)

def generate_class_pdf(institution_name, config, classes, staff_list, class_schedule):
    pdf = FPDF(orientation="Landscape")
    days_count = 6 if config.include_saturday else 5
    for cls_obj in classes:
        c = cls_obj.name
        # Find class teacher
        class_teacher = "Not Assigned"
        for s in staff_list:
            if s.class_teacher_for == c:
                class_teacher = s.name
                break
        
        # grid format is already class_schedule[c][d][p] = {subject, teacher}
        grid = [["" for _ in range(len(config.periods))] for _ in range(days_count)]
        for d in range(days_count):
            for p in range(len(config.periods)):
                slot = class_schedule[c][d][p]
                if slot:
                    grid[d][p] = f"{slot['subject']}\n{slot['teacher']}"
        
        create_table(pdf, institution_name, f"Class: {c}  |  Class Teacher: {class_teacher}", days_count, config.periods, grid)
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
                            staff_schedule[teacher][d][p] = f"Class {c}\n{slot['subject']}"
                        
    for s in staff_names:
        create_table(pdf, institution_name, f"Staff Schedule: {s}", days_count, config.periods, staff_schedule[s])
    return pdf.output()
