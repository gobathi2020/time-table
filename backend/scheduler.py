import random

def generate_schedule(req):
    days = 6 if req.config.include_saturday else 5
    periods = len(req.config.periods)
    
    class_schedule = {c: [[None for _ in range(periods)] for _ in range(days)] for c in req.classes}
    
    # Pre-calculate assignments for each class
    # Format: { class_name: [ {staff_name, subject, remaining_periods}, ... ] }
    assignments_by_class = {c: [] for c in req.classes}
    for staff in req.staff:
        for c in staff.classes:
            if c in req.classes:
                assignments_by_class[c].append({
                    "teacher": staff.name,
                    "subject": staff.subject,
                    "remaining": staff.periods_per_week
                })

    # Multi-pass balanced distribution
    # Max slots possible per week = days * periods
    max_total_periods = days * periods
    
    # We continue as long as there are remaining periods to assign and space in the grid
    any_remaining = True
    while any_remaining:
        any_remaining = False
        # Shuffle classes to avoid bias
        class_list = list(req.classes)
        random.shuffle(class_list)
        
        for c in class_list:
            # For each class, try to assign ONE period of each subject if possible
            # Shuffle subjects within class
            subjects = assignments_by_class[c]
            random.shuffle(subjects)
            
            for sub in subjects:
                if sub["remaining"] <= 0:
                    continue
                
                any_remaining = True
                
                # Pick a random day, but try to find a day where this subject isn't already placed in this PASS
                # (Simple strategy: find available slots in class and teacher across all days)
                placed = False
                
                # We want to spread across days. Let's try to find a day where this class/teacher pair doesn't have 
                # too many periods already.
                day_indices = list(range(days))
                random.shuffle(day_indices)
                
                for day in day_indices:
                    # Is class/teacher already busy this day? (Optional SOFT constraint for spreading)
                    # For now, let's just find any free period in this day.
                    
                    period_indices = list(range(periods))
                    random.shuffle(period_indices)
                    
                    for p_idx in period_indices:
                        if req.config.periods[p_idx].is_break:
                            continue
                            
                        # Is class free?
                        if class_schedule[c][day][p_idx] is None:
                            # Is teacher free?
                            teacher_busy = False
                            for other_c in req.classes:
                                slot = class_schedule[other_c][day][p_idx]
                                if slot and slot["teacher"] == sub["teacher"]:
                                    teacher_busy = True
                                    break
                            
                            if not teacher_busy:
                                class_schedule[c][day][p_idx] = {
                                    "subject": sub["subject"],
                                    "teacher": sub["teacher"]
                                }
                                sub["remaining"] -= 1
                                placed = True
                                break
                    if placed:
                        break
                        
    return class_schedule
