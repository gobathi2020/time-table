import random

def generate_schedule(req):
    days = 6 if req.config.include_saturday else 5
    periods = len(req.config.periods)
    
    class_schedule = {c: [[None for _ in range(periods)] for _ in range(days)] for c in req.classes}
    
    # 1. Primary Assignment: Periods per Day
    for day in range(days):
        # Shuffle classes for fairness
        class_list = list(req.classes)
        random.shuffle(class_list)
        
        for c in class_list:
            # Collect subjects assigned to this class
            class_staff = [s for s in req.staff if c in s.classes]
            random.shuffle(class_staff)
            
            # For each staff member, they need 'periods_per_day' slots today
            for staff in class_staff:
                remaining_for_today = staff.periods_per_day
                
                # Find available slots in this day for this class
                available_p_indices = [i for i, p in enumerate(req.config.periods) if not p.is_break and class_schedule[c][day][i] is None]
                random.shuffle(available_p_indices)
                
                for p_idx in available_p_indices:
                    if remaining_for_today <= 0:
                        break
                        
                    # Is teacher free?
                    teacher_busy = False
                    for other_c in req.classes:
                        slot = class_schedule[other_c][day][p_idx]
                        if slot and slot["teacher"] == staff.name:
                            teacher_busy = True
                            break
                    
                    if not teacher_busy:
                        class_schedule[c][day][p_idx] = {
                            "subject": staff.subject,
                            "teacher": staff.name
                        }
                        remaining_for_today -= 1

    # 2. Fill Free Periods (if requested)
    if not req.config.allow_free_periods:
        for day in range(days):
            class_list = list(req.classes)
            random.shuffle(class_list)
            
            for c in class_list:
                # Find empty slots
                for p_idx, p_conf in enumerate(req.config.periods):
                    if p_conf.is_break or class_schedule[c][day][p_idx] is not None:
                        continue
                    
                    # This is a free period we need to fill
                    # Pick a teacher assigned to this class who is free
                    class_staff = [s for s in req.staff if c in s.classes]
                    random.shuffle(class_staff)
                    
                    for staff in class_staff:
                        # Is teacher free?
                        teacher_busy = False
                        for other_c in req.classes:
                            slot = class_schedule[other_c][day][p_idx]
                            if slot and slot["teacher"] == staff.name:
                                teacher_busy = True
                                break
                        
                        if not teacher_busy:
                            class_schedule[c][day][p_idx] = {
                                "subject": staff.subject,
                                "teacher": staff.name
                            }
                            break # Found a filler for this slot
                            
    return class_schedule
