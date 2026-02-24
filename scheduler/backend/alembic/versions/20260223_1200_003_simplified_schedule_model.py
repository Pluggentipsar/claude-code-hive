"""Simplified schedule model — Digital Excel

Revision ID: 003
Revises: 002
Create Date: 2026-02-23 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '003'
down_revision: Union[str, None] = '002'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create enum types
    op.execute("CREATE TYPE weekstatus AS ENUM ('draft', 'published');")
    op.execute("CREATE TYPE dayassignmentrole AS ENUM ('school_support', 'double_staffing', 'extra_care');")

    # --- week_schedules ---
    op.create_table(
        'week_schedules',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True,
                  server_default=sa.text('gen_random_uuid()')),
        sa.Column('year', sa.Integer(), nullable=False),
        sa.Column('week_number', sa.Integer(), nullable=False),
        sa.Column('status', postgresql.ENUM('draft', 'published',
                  name='weekstatus', create_type=False), nullable=False,
                  server_default='draft'),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('copied_from_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True),
                  server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True),
                  server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(['copied_from_id'], ['week_schedules.id']),
        sa.UniqueConstraint('year', 'week_number', name='uq_week_schedules_year_week'),
    )

    # --- student_days ---
    op.create_table(
        'student_days',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True,
                  server_default=sa.text('gen_random_uuid()')),
        sa.Column('week_schedule_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('student_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('weekday', sa.Integer(), nullable=False),
        sa.Column('arrival_time', sa.String(5), nullable=True),
        sa.Column('departure_time', sa.String(5), nullable=True),
        sa.Column('fm_staff_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('em_staff_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.ForeignKeyConstraint(['week_schedule_id'], ['week_schedules.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['student_id'], ['students.id']),
        sa.ForeignKeyConstraint(['fm_staff_id'], ['staff.id']),
        sa.ForeignKeyConstraint(['em_staff_id'], ['staff.id']),
        sa.UniqueConstraint('week_schedule_id', 'student_id', 'weekday',
                            name='uq_student_days_week_student_day'),
    )
    op.create_index('ix_student_days_week_schedule_id', 'student_days', ['week_schedule_id'])
    op.create_index('ix_student_days_student_id', 'student_days', ['student_id'])

    # --- day_assignments ---
    op.create_table(
        'day_assignments',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True,
                  server_default=sa.text('gen_random_uuid()')),
        sa.Column('week_schedule_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('student_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('staff_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('weekday', sa.Integer(), nullable=False),
        sa.Column('start_time', sa.String(5), nullable=False),
        sa.Column('end_time', sa.String(5), nullable=False),
        sa.Column('role', postgresql.ENUM('school_support', 'double_staffing', 'extra_care',
                  name='dayassignmentrole', create_type=False), nullable=False),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.ForeignKeyConstraint(['week_schedule_id'], ['week_schedules.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['student_id'], ['students.id']),
        sa.ForeignKeyConstraint(['staff_id'], ['staff.id']),
    )
    op.create_index('ix_day_assignments_week_schedule_id', 'day_assignments', ['week_schedule_id'])
    op.create_index('ix_day_assignments_student_id', 'day_assignments', ['student_id'])
    op.create_index('ix_day_assignments_staff_id', 'day_assignments', ['staff_id'])

    # --- staff_shifts ---
    op.create_table(
        'staff_shifts',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True,
                  server_default=sa.text('gen_random_uuid()')),
        sa.Column('week_schedule_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('staff_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('weekday', sa.Integer(), nullable=False),
        sa.Column('start_time', sa.String(5), nullable=False),
        sa.Column('end_time', sa.String(5), nullable=False),
        sa.Column('break_minutes', sa.Integer(), nullable=False, server_default='30'),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.ForeignKeyConstraint(['week_schedule_id'], ['week_schedules.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['staff_id'], ['staff.id']),
        sa.UniqueConstraint('week_schedule_id', 'staff_id', 'weekday',
                            name='uq_staff_shifts_week_staff_day'),
    )
    op.create_index('ix_staff_shifts_week_schedule_id', 'staff_shifts', ['week_schedule_id'])
    op.create_index('ix_staff_shifts_staff_id', 'staff_shifts', ['staff_id'])

    # --- Add default_times to students ---
    op.add_column('students', sa.Column('default_times', postgresql.JSONB(),
                  nullable=False, server_default='{}'))

    # --- Add default_shifts to staff ---
    op.add_column('staff', sa.Column('default_shifts', postgresql.JSONB(),
                  nullable=False, server_default='{}'))


def downgrade() -> None:
    # Remove added columns
    op.drop_column('staff', 'default_shifts')
    op.drop_column('students', 'default_times')

    # Drop tables (reverse order)
    op.drop_index('ix_staff_shifts_staff_id', table_name='staff_shifts')
    op.drop_index('ix_staff_shifts_week_schedule_id', table_name='staff_shifts')
    op.drop_table('staff_shifts')

    op.drop_index('ix_day_assignments_staff_id', table_name='day_assignments')
    op.drop_index('ix_day_assignments_student_id', table_name='day_assignments')
    op.drop_index('ix_day_assignments_week_schedule_id', table_name='day_assignments')
    op.drop_table('day_assignments')

    op.drop_index('ix_student_days_student_id', table_name='student_days')
    op.drop_index('ix_student_days_week_schedule_id', table_name='student_days')
    op.drop_table('student_days')

    op.drop_table('week_schedules')

    # Drop enum types
    op.execute("DROP TYPE dayassignmentrole;")
    op.execute("DROP TYPE weekstatus;")
