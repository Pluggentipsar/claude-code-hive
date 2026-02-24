"""Add grade_group to staff table

Revision ID: 004
Revises: 003
Create Date: 2026-02-23 13:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '004'
down_revision: Union[str, None] = '003'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create the enum type first
    staff_grade_group = sa.Enum('grades_1_3', 'grades_4_6', name='staffgradegroup')
    staff_grade_group.create(op.get_bind(), checkfirst=True)

    op.add_column('staff', sa.Column('grade_group', sa.Enum('grades_1_3', 'grades_4_6', name='staffgradegroup'), nullable=True))
    op.create_index('ix_staff_grade_group', 'staff', ['grade_group'])


def downgrade() -> None:
    op.drop_index('ix_staff_grade_group', table_name='staff')
    op.drop_column('staff', 'grade_group')

    # Drop the enum type
    sa.Enum(name='staffgradegroup').drop(op.get_bind(), checkfirst=True)
