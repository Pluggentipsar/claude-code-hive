"""
Pydantic schemas for rule-based suggestions.

Used by RuleBasedAdvisor to return actionable improvement suggestions.
"""

from pydantic import BaseModel, Field
from typing import List, Optional
from uuid import UUID


class RuleActionDetail(BaseModel):
    """An executable action that can be applied to the schedule."""

    type: str = Field(..., description="Action type: reassign, add_assignment, swap, remove")
    assignment_id: Optional[UUID] = Field(default=None, description="Existing assignment to modify")
    new_staff_id: Optional[UUID] = Field(default=None, description="Staff member for the action")
    new_staff_name: Optional[str] = Field(default=None, description="Display name of new staff")
    student_id: Optional[UUID] = Field(default=None, description="Affected student")
    student_name: Optional[str] = Field(default=None, description="Display name of student")
    weekday: Optional[int] = Field(default=None, description="0=Monday, 4=Friday")
    start_time: Optional[str] = Field(default=None, description="HH:MM")
    end_time: Optional[str] = Field(default=None, description="HH:MM")
    assignment_type: Optional[str] = Field(default=None, description="one_to_one, double_staffing, etc.")
    swap_assignment_id: Optional[UUID] = Field(default=None, description="Second assignment for swap")
    side_effects: List[str] = Field(default_factory=list, description="Human-readable side effects")
    description: str = Field(..., description="Human-readable description of the action")


class RuleSuggestion(BaseModel):
    """A single rule-based suggestion for schedule improvement."""

    id: str = Field(..., description="Unique suggestion ID")
    conflict_id: str = Field(..., description="ID of the conflict this addresses")
    suggestion_type: str = Field(..., description="coverage_gap, double_staffing, workload_balance, continuity")
    priority: int = Field(..., ge=1, le=4, description="1=critical, 4=nice-to-have")
    root_cause: str = Field(..., description="Human-readable description of the problem")
    actions: List[RuleActionDetail] = Field(default_factory=list, description="Possible actions to resolve")


class RuleSuggestionsResponse(BaseModel):
    """Response containing all rule-based suggestions."""

    suggestions: List[RuleSuggestion]
    total: int


class ApplyActionRequest(BaseModel):
    """Request to apply a single action from a suggestion."""

    action: RuleActionDetail
    suggestion_id: str


class ApplyActionResponse(BaseModel):
    """Response after applying an action."""

    success: bool
    message: str
    modified_assignment_id: Optional[UUID] = None
    created_assignment_id: Optional[UUID] = None
