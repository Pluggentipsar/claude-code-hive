"""
Core scheduling logic for Kålgårdens Schemaläggningssystem.

Contains the constraint programming engine and scheduler.
"""

from app.core.scheduler import SchoolScheduler, SchedulingError
from app.core.constraints import ConstraintEngine

__all__ = [
    "SchoolScheduler",
    "SchedulingError",
    "ConstraintEngine",
]