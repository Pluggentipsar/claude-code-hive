"""Add friday_rotation_group to staff

Revision ID: 005_add_friday_rotation
Revises: 20260223_1300_004_add_staff_grade_group
Create Date: 2026-02-25 12:00:00.000000
"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '005_add_friday_rotation'
down_revision = '20260223_1300_004_add_staff_grade_group'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('staff', sa.Column('friday_rotation_group', sa.Integer(), nullable=True))


def downgrade() -> None:
    op.drop_column('staff', 'friday_rotation_group')
