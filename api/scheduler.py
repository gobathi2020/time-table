import random

def generate_schedule(req):
    days = 6 if req.config.include_saturday else 5
    num_periods = len(req.config.periods)
    
    class_names = [c.name for c in req.classes]
    class_schedule = {c: [[None for _ in range(num_periods)] for _ in range(days)] for c in class_names}
    
    # 1. Create a task list for each assignment
    tasks = []
    
    # Track which (class, subject) are already added to avoid duplicates from multiple classes in combined assignments
    handled_class_subjects = set()
    
    for staff in req.staff:
        for asgn in staff.assignments:
            # Handle backward compatibility: class_name or class_names
            target_classes = asgn.class_names if asgn.class_names else ([asgn.class_name] if asgn.class_name else [])
            # Filter to valid classes only
            target_classes = [c for c in target_classes if c in class_names]
            
            if not target_classes:
                continue
            
            # Find the required periods_per_week from the first class in the target list
            periods_needed = 0
            for cls_obj in req.classes:
                if cls_obj.name == target_classes[0]:
                    for sub in cls_obj.subjects:
                        if sub.name == asgn.subject_name:
                            periods_needed = sub.periods_per_week
                            break
                    break
            
            if periods_needed == 0:
                continue
                
            tasks.append({
                "class_names": target_classes,
                "subject_name": asgn.subject_name,
                "teacher_name": staff.name,
                "teacher_obj": staff,
                "remaining": periods_needed
            })
            
            for c in target_classes:
                handled_class_subjects.add((c, asgn.subject_name))

    # Add any remaining class-subjects that have no staff assigned (as unassigned)
    for cls in req.classes:
        for sub in cls.subjects:
            if (cls.name, sub.name) not in handled_class_subjects:
                tasks.append({
                    "class_names": [cls.name],
                    "subject_name": sub.name,
                    "teacher_name": "Unassigned",
                    "teacher_obj": None,
                    "remaining": sub.periods_per_week
                })

    # 2. Assign tasks across the week
    any_placed = True
    while any_placed:
        any_placed = False
        random.shuffle(tasks)
        
        for task in tasks:
            if task["remaining"] <= 0:
                continue
            
            day_indices = list(range(days))
            random.shuffle(day_indices)
            
            placed = False
            for day in day_indices:
                # Check teacher days off
                if task["teacher_obj"] and day in task["teacher_obj"].days_off:
                    continue
                
                # Check Daily Subject Limit (max 2 per day for any class in the task)
                limit_exceeded = False
                for c_name in task["class_names"]:
                    daily_count = sum(1 for p in class_schedule[c_name][day] if p and p["subject"] == task["subject_name"])
                    if daily_count >= 2:
                        limit_exceeded = True
                        break
                
                if limit_exceeded:
                    continue
                
                # Find available periods for ALL classes in this task simultaneously
                period_indices = list(range(num_periods))
                random.shuffle(period_indices)
                
                for p_idx in period_indices:
                    p_conf = req.config.periods[p_idx]
                    if p_conf.is_break:
                        continue
                        
                    # Check Teacher Availability (Constraint: Period limit)
                    if task["teacher_obj"] and task["teacher_obj"].available_until_period:
                        if (p_idx + 1) > task["teacher_obj"].available_until_period:
                            continue
                            
                    # Check if ALL target classes are free
                    classes_free = True
                    for c_name in task["class_names"]:
                        if class_schedule[c_name][day][p_idx] is not None:
                            classes_free = False
                            break
                    
                    if not classes_free:
                        continue
                    
                    # Check Teacher Conflict (Double booking in OTHER classes not in this task)
                    teacher_busy = False
                    for other_c in class_names:
                        if other_c in task["class_names"]:
                            continue # Ignore classes part of this combined task
                        slot = class_schedule[other_c][day][p_idx]
                        if slot and slot["teacher"] == task["teacher_name"]:
                            teacher_busy = True
                            break
                    
                    if not teacher_busy:
                        # Place it!
                        for c_name in task["class_names"]:
                            class_schedule[c_name][day][p_idx] = {
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
                    available_fillers = []
                    for s in req.staff:
                        for asgn in s.assignments:
                            targets = asgn.class_names if asgn.class_names else ([asgn.class_name] if asgn.class_name else [])
                            if cls_name in targets:
                                available_fillers.append((s, asgn.subject_name))
                                break
                    
                    random.shuffle(available_fillers)
                    
                    for filler, filler_subject in available_fillers:
                        if day in filler.days_off:
                            continue
                            
                        if filler.available_until_period and (p_idx + 1) > filler.available_until_period:
                            continue
                            
                        teacher_busy = False
                        for other_c in class_names:
                            slot = class_schedule[other_c][day][p_idx]
                            if slot and slot["teacher"] == filler.name:
                                teacher_busy = True
                                break
                        
                        if not teacher_busy:
                            class_schedule[cls_name][day][p_idx] = {
                                "subject": filler_subject,
                                "teacher": filler.name
                            }
                            break
                            
    return class_schedule
