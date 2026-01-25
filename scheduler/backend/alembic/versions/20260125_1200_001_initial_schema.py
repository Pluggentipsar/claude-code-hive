"""Initial schema

Revision ID: 001
Revises:
Create Date: 2026-01-25 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '001'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create enums
    op.execute("""
        CREATE TYPE staffrole AS ENUM ('elevassistent', 'pedagog', 'fritidspedagog');
        CREATE TYPE scheduletype AS ENUM ('two_week_rotation', 'fixed');
        CREATE TYPE absencereason AS ENUM ('sick', 'vacation', 'parental_leave', 'training', 'other');
        CREATE TYPE gradegroup AS ENUM ('grades_1_3', 'grades_4_6');
        CREATE TYPE solverstatus AS ENUM ('optimal', 'feasible', 'infeasible', 'timeout', 'error');
        CREATE TYPE assignmenttype AS ENUM ('one_to_one', 'class_coverage', 'leisure', 'double_staffing');
        CREATE TYPE constrainttype AS ENUM ('hard', 'soft');
        CREATE TYPE constraintscope AS ENUM ('all', 'students', 'staff', 'classes');
    """)

    # Create staff table (must be before classes due to FK)
    op.create_table(
        'staff',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('personal_number', sa.String(13), unique=True, nullable=False, index=True),
        sa.Column('first_name', sa.String(100), nullable=False),
        sa.Column('last_name', sa.String(100), nullable=False),
        sa.Column('role', sa.Enum('elevassistent', 'pedagog', 'fritidspedagog', name='staffrole'), nullable=False),
        sa.Column('care_certifications', postgresql.JSONB, nullable=False, server_default='[]'),
        sa.Column('schedule_type', sa.Enum('two_week_rotation', 'fixed', name='scheduletype'), nullable=False),
        sa.Column('employment_start', sa.DateTime(timezone=True), nullable=False),
        sa.Column('active', sa.Boolean, nullable=False, server_default='true'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now(), nullable=False),
    )
    op.create_index('ix_staff_role', 'staff', ['role'])
    op.create_index('ix_staff_active', 'staff', ['active'])

    # Create classes table
    op.create_table(
        'classes',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('name', sa.String(100), nullable=False),
        sa.Column('grade_group', sa.Enum('grades_1_3', 'grades_4_6', name='gradegroup'), nullable=False),
        sa.Column('primary_teacher_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('staff.id'), nullable=True),
        sa.Column('academic_year', sa.String(20), nullable=False),
        sa.Column('active', sa.Boolean, nullable=False, server_default='true'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index('ix_classes_grade_group', 'classes', ['grade_group'])
    op.create_index('ix_classes_active', 'classes', ['active'])

    # Create students table
    op.create_table(
        'students',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('personal_number', sa.String(13), unique=True, nullable=False, index=True),
        sa.Column('first_name', sa.String(100), nullable=False),
        sa.Column('last_name', sa.String(100), nullable=False),
        sa.Column('class_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('classes.id'), nullable=True),
        sa.Column('grade', sa.Integer, nullable=False),
        sa.Column('has_care_needs', sa.Boolean, nullable=False, server_default='false'),
        sa.Column('care_requirements', postgresql.JSONB, nullable=False, server_default='[]'),
        sa.Column('preferred_staff', postgresql.JSONB, nullable=False, server_default='[]'),
        sa.Column('requires_double_staffing', sa.Boolean, nullable=False, server_default='false'),
        sa.Column('notes', sa.Text, nullable=True),
        sa.Column('active', sa.Boolean, nullable=False, server_default='true'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now(), nullable=False),
    )
    op.create_index('ix_students_active', 'students', ['active'])

    # Create care_times table
    op.create_table(
        'care_times',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('student_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('students.id', ondelete='CASCADE'), nullable=False),
        sa.Column('weekday', sa.Integer, nullable=False),
        sa.Column('start_time', sa.String(5), nullable=False),
        sa.Column('end_time', sa.String(5), nullable=False),
        sa.Column('valid_from', sa.DateTime(timezone=True), nullable=False),
        sa.Column('valid_to', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index('ix_care_times_student_id', 'care_times', ['student_id'])

    # Create work_hours table
    op.create_table(
        'work_hours',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('staff_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('staff.id', ondelete='CASCADE'), nullable=False),
        sa.Column('weekday', sa.Integer, nullable=False),
        sa.Column('week_number', sa.Integer, nullable=False, server_default='0'),
        sa.Column('start_time', sa.String(5), nullable=False),
        sa.Column('end_time', sa.String(5), nullable=False),
        sa.Column('lunch_start', sa.String(5), nullable=True),
        sa.Column('lunch_end', sa.String(5), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index('ix_work_hours_staff_id', 'work_hours', ['staff_id'])

    # Create absences table
    op.create_table(
        'absences',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('staff_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('staff.id', ondelete='CASCADE'), nullable=False),
        sa.Column('absence_date', sa.DateTime(timezone=True), nullable=False),
        sa.Column('start_time', sa.String(5), nullable=True),
        sa.Column('end_time', sa.String(5), nullable=True),
        sa.Column('reason', sa.Enum('sick', 'vacation', 'parental_leave', 'training', 'other', name='absencereason'), nullable=False),
        sa.Column('reported_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index('ix_absences_staff_id', 'absences', ['staff_id'])
    op.create_index('ix_absences_date', 'absences', ['absence_date'])

    # Create team_meetings table
    op.create_table(
        'team_meetings',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('class_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('classes.id', ondelete='CASCADE'), nullable=False),
        sa.Column('weekday', sa.String(20), nullable=False),
        sa.Column('start_time', sa.String(5), nullable=False),
        sa.Column('end_time', sa.String(5), nullable=False),
        sa.Column('is_recurring', sa.Boolean, nullable=False, server_default='true'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index('ix_team_meetings_class_id', 'team_meetings', ['class_id'])

    # Create schedules table
    op.create_table(
        'schedules',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('week_number', sa.Integer, nullable=False),
        sa.Column('year', sa.Integer, nullable=False),
        sa.Column('solver_status', sa.Enum('optimal', 'feasible', 'infeasible', 'timeout', 'error', name='solverstatus'), nullable=False),
        sa.Column('objective_value', sa.Float, nullable=True),
        sa.Column('solve_time_ms', sa.Integer, nullable=True),
        sa.Column('hard_constraints_met', sa.Boolean, nullable=False, server_default='false'),
        sa.Column('soft_constraints_score', sa.Float, nullable=True),
        sa.Column('is_published', sa.Boolean, nullable=False, server_default='false'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('created_by', sa.String(100), nullable=True),
    )
    op.create_index('ix_schedules_week_number', 'schedules', ['week_number'])
    op.create_index('ix_schedules_year', 'schedules', ['year'])
    op.create_index('ix_schedules_published', 'schedules', ['is_published'])

    # Create staff_assignments table
    op.create_table(
        'staff_assignments',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('schedule_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('schedules.id', ondelete='CASCADE'), nullable=False),
        sa.Column('staff_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('staff.id'), nullable=False),
        sa.Column('student_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('students.id'), nullable=True),
        sa.Column('class_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('classes.id'), nullable=True),
        sa.Column('weekday', sa.Integer, nullable=False),
        sa.Column('start_time', sa.String(5), nullable=False),
        sa.Column('end_time', sa.String(5), nullable=False),
        sa.Column('assignment_type', sa.Enum('one_to_one', 'class_coverage', 'leisure', 'double_staffing', name='assignmenttype'), nullable=False),
        sa.Column('is_manual_override', sa.Boolean, nullable=False, server_default='false'),
        sa.Column('notes', sa.Text, nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index('ix_staff_assignments_schedule_id', 'staff_assignments', ['schedule_id'])
    op.create_index('ix_staff_assignments_staff_id', 'staff_assignments', ['staff_id'])
    op.create_index('ix_staff_assignments_student_id', 'staff_assignments', ['student_id'])
    op.create_index('ix_staff_assignments_class_id', 'staff_assignments', ['class_id'])

    # Create constraints table
    op.create_table(
        'constraints',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('name', sa.String(200), unique=True, nullable=False),
        sa.Column('description', sa.Text, nullable=True),
        sa.Column('type', sa.Enum('hard', 'soft', name='constrainttype'), nullable=False),
        sa.Column('priority', sa.Integer, nullable=True),
        sa.Column('constraint_code', sa.Text, nullable=False),
        sa.Column('applies_to', sa.Enum('all', 'students', 'staff', 'classes', name='constraintscope'), nullable=False),
        sa.Column('active', sa.Boolean, nullable=False, server_default='true'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now(), nullable=False),
    )
    op.create_index('ix_constraints_type', 'constraints', ['type'])
    op.create_index('ix_constraints_active', 'constraints', ['active'])


def downgrade() -> None:
    # Drop tables in reverse order
    op.drop_table('constraints')
    op.drop_table('staff_assignments')
    op.drop_table('schedules')
    op.drop_table('team_meetings')
    op.drop_table('absences')
    op.drop_table('work_hours')
    op.drop_table('care_times')
    op.drop_table('students')
    op.drop_table('classes')
    op.drop_table('staff')

    # Drop enums
    op.execute("DROP TYPE IF EXISTS constraintscope")
    op.execute("DROP TYPE IF EXISTS constrainttype")
    op.execute("DROP TYPE IF EXISTS assignmenttype")
    op.execute("DROP TYPE IF EXISTS solverstatus")
    op.execute("DROP TYPE IF EXISTS gradegroup")
    op.execute("DROP TYPE IF EXISTS absencereason")
    op.execute("DROP TYPE IF EXISTS scheduletype")
    op.execute("DROP TYPE IF EXISTS staffrole")
