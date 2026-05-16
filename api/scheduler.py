import random

def generate_schedule(req):
    days = 6 if req.config.include_saturday else 5
    num_periods = len(req.config.periods)
    
    class_names = [c.name for c in req.classes]
    class_schedule = {c: [[None for _ in range(num_periods)] for _ in range(days)] for c in class_names}
    
    # 1. Create a task list for each class/subject
    # [{class_name, subject_name, teacher_name, remaining}]
    tasks = []
    for cls in req.classes:
        for sub in cls.subjects:
            # Find staff assigned to this class and subject
            assigned_staff = [s for s in req.staff for a in s.assignments if a.class_name == cls.name and a.subject_name == sub.name]
            
            # If multiple staff are assigned (unlikely but possible), we split periods or just pick one
            # For simplicity, we assume one staff per (class, subject) or pick the first one found
            teacher_name = assigned_staff[0].name if assigned_staff else "Unassigned"
            teacher_obj = assigned_staff[0] if assigned_staff else None
            
            tasks.append({
                "class_name": cls.name,
                "subject_name": sub.name,
                "teacher_name": teacher_name,
                "teacher_obj": teacher_obj,
                "remaining": sub.periods_per_week
            })

    # 2. Assign tasks across the week
    # Multi-pass approach to spread subjects
    any_placed = True
    while any_placed:
        any_placed = False
        random.shuffle(tasks)
        
        for task in tasks:
            if task["remaining"] <= 0:
                continue
            
            # Try to find a day where this subject isn't over-represented yet
            # (Simple: Find free slot in class and teacher)
            day_indices = list(range(days))
            random.shuffle(day_indices)
            
            placed = False
            for day in day_indices:
                # Find available periods for this class today
                period_indices = list(range(num_periods))
                random.shuffle(period_indices)
                
                for p_idx in period_indices:
                    p_conf = req.config.periods[p_idx]
                    if p_conf.is_break or class_schedule[task["class_name"]][day][p_idx] is not None:
                        continue
                    
                    # Check Teacher Availability (Constraint: Period limit)
                    if task["teacher_obj"] and task["teacher_obj"].available_until_period:
                        if (p_idx + 1) > task["teacher_obj"].available_until_period:
                            continue
                    
                    # Check Teacher Conflict (Double booking)
                    teacher_busy = False
                    for other_c in class_names:
                        slot = class_schedule[other_c][day][p_idx]
                        if slot and slot["teacher"] == task["teacher_name"]:
                            teacher_busy = True
                            break
                    
                    if not teacher_busy:
                        class_schedule[task["class_name"]][day][p_idx] = {
                            "subject": task["subject_name"],
                            "teacher": task["teacher_name"]
                        }
                        task["remaining"] -= 1
                        placed = True
                        any_placed = True
                        break
                if placed:
                    break

    # 3. Fill Free Periods (if requested)
    if not req.config.allow_free_periods:
        for day in range(days):
            for cls_name in class_names:
                for p_idx, p_conf in enumerate(req.config.periods):
                    if p_conf.is_break or class_schedule[cls_name][day][p_idx] is not None:
                        continue
                    
                    # Try to fill with any teacher assigned to this class
                    available_fillers = [s for s in req.staff for a in s.assignments if a.class_name == cls_name]
                    random.shuffle(available_fillers)
                    
                    for filler in available_fillers:
                        # Check availability constraint
                        if filler.available_until_period and (p_idx + 1) > filler.available_until_period:
                            continue
                            
                        # Check conflict
                        teacher_busy = False
                        for other_c in class_names:
                            slot = class_schedule[other_c][day][p_idx]
                            if slot and slot["teacher"] == filler.name:
                                teacher_busy = True
                                break
                        
                        if not teacher_busy:
                            # Pick one of the subjects this teacher handles for this class
                            subject_for_filler = [a.subject_name for a in filler.assignments if a.class_name == cls_name][0]
                            class_schedule[cls_name][day][p_idx] = {
                                "subject": subject_for_filler,
                                "teacher": filler.name
                            }
                            break
                            
    return class_schedule
