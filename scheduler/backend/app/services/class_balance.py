"""
Class balance analysis — compute student/staff ratios per class per day.

Groups classes by grade group (1-3, 4-6) and identifies surplus/deficit,
with rebalancing suggestions within grade groups.
"""

from uuid import UUID
from sqlalchemy.orm import Session

from app.models import Student, Staff, StudentDay, StaffShift, SchoolClass
from app.models.school_class import GradeGroup
from app.models.staff import StaffRole


DAY_NAMES = ["Måndag", "Tisdag", "Onsdag", "Torsdag", "Fredag"]


def compute_class_balance(
    db: Session,
    week_schedule_id: UUID,
    weekday: int,
) -> dict:
    """Compute class balance for a specific day."""
    student_days = (
        db.query(StudentDay)
        .filter(
            StudentDay.week_schedule_id == week_schedule_id,
            StudentDay.weekday == weekday,
        )
        .all()
    )

    # Load students and classes
    students_map = {
        str(s.id): s
        for s in db.query(Student).filter(Student.active == True).all()  # noqa: E712
    }
    classes = {
        str(c.id): c
        for c in db.query(SchoolClass).filter(SchoolClass.active == True).all()  # noqa: E712
    }

    # Count students per class (excluding absent)
    class_student_count: dict[str, int] = {}
    for sd in student_days:
        if sd.absent_type == "full_day":
            continue
        student = students_map.get(str(sd.student_id))
        if student and student.class_id:
            cid = str(student.class_id)
            class_student_count[cid] = class_student_count.get(cid, 0) + 1

    # Count staff per class — staff assigned to students in that class
    class_staff_ids: dict[str, set] = {}
    for sd in student_days:
        if sd.absent_type == "full_day":
            continue
        student = students_map.get(str(sd.student_id))
        if not student or not student.class_id:
            continue
        cid = str(student.class_id)
        class_staff_ids.setdefault(cid, set())
        if sd.fm_staff_id:
            class_staff_ids[cid].add(str(sd.fm_staff_id))
        if sd.em_staff_id:
            class_staff_ids[cid].add(str(sd.em_staff_id))

    # Build class balance items
    low_grades = []
    high_grades = []

    for cid, cls in classes.items():
        student_count = class_student_count.get(cid, 0)
        staff_count = len(class_staff_ids.get(cid, set()))
        ratio = student_count / max(staff_count, 1)
        # Target ratio: ~5 students per staff member
        target_staff = max(student_count / 5, 1) if student_count > 0 else 0
        surplus = staff_count - target_staff

        if surplus > 0.5:
            status = "surplus"
        elif surplus < -0.5:
            status = "deficit"
        else:
            status = "balanced"

        item = {
            "class_id": cid,
            "class_name": cls.name,
            "grade_group": cls.grade_group.value,
            "student_count": student_count,
            "staff_count": staff_count,
            "ratio": round(ratio, 1),
            "surplus": round(surplus, 1),
            "status": status,
        }

        if cls.grade_group == GradeGroup.GRADES_1_3:
            low_grades.append(item)
        else:
            high_grades.append(item)

    # Sort by deficit first
    low_grades.sort(key=lambda x: x["surplus"])
    high_grades.sort(key=lambda x: x["surplus"])

    # Generate rebalancing suggestions
    suggestions = _suggest_rebalancing(low_grades, high_grades, class_staff_ids, students_map, db)

    return {
        "weekday": weekday,
        "low_grades": low_grades,
        "high_grades": high_grades,
        "rebalancing_suggestions": suggestions,
    }


def _suggest_rebalancing(
    low_grades: list[dict],
    high_grades: list[dict],
    class_staff_ids: dict[str, set],
    students_map: dict,
    db: Session,
) -> list[dict]:
    """Suggest staff moves from surplus to deficit classes within grade groups."""
    suggestions = []
    staff_map = {
        str(s.id): s
        for s in db.query(Staff).filter(Staff.active == True).all()  # noqa: E712
    }

    for group in [low_grades, high_grades]:
        surplus_classes = [c for c in group if c["status"] == "surplus"]
        deficit_classes = [c for c in group if c["status"] == "deficit"]

        for deficit in deficit_classes:
            for surplus in surplus_classes:
                # Find staff in surplus class that could move
                surplus_staff = class_staff_ids.get(surplus["class_id"], set())
                for sid in surplus_staff:
                    staff = staff_map.get(sid)
                    if not staff or staff.role == StaffRole.TEACHER:
                        continue
                    suggestions.append({
                        "staff_id": sid,
                        "staff_name": staff.full_name,
                        "from_class": surplus["class_id"],
                        "from_class_name": surplus["class_name"],
                        "to_class": deficit["class_id"],
                        "to_class_name": deficit["class_name"],
                        "reason": f"{surplus['class_name']} har överskott ({surplus['staff_count']} personal, "
                                  f"{surplus['student_count']} elever), {deficit['class_name']} har underskott",
                    })
                    break  # One suggestion per deficit-surplus pair

    return suggestions
