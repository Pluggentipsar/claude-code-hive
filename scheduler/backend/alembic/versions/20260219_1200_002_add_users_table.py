"""Add users table

Revision ID: 002
Revises: 001
Create Date: 2026-02-19 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '002'
down_revision: Union[str, None] = '001'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create enum type
    op.execute("CREATE TYPE userrole AS ENUM ('admin', 'teacher', 'staff');")

    # Create users table
    op.create_table(
        'users',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True,
                  server_default=sa.text('gen_random_uuid()')),
        sa.Column('email', sa.String(255), nullable=False, unique=True),
        sa.Column('hashed_password', sa.String(255), nullable=False),
        sa.Column('first_name', sa.String(100), nullable=False),
        sa.Column('last_name', sa.String(100), nullable=False),
        sa.Column('role', postgresql.ENUM('admin', 'teacher', 'staff',
                  name='userrole', create_type=False), nullable=False,
                  server_default='staff'),
        sa.Column('active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('created_at', sa.DateTime(timezone=True),
                  server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True),
                  server_default=sa.func.now(), nullable=False),
    )

    # Create indexes
    op.create_index('ix_users_email', 'users', ['email'], unique=True)
    op.create_index('ix_users_active', 'users', ['active'])


def downgrade() -> None:
    op.drop_index('ix_users_active', table_name='users')
    op.drop_index('ix_users_email', table_name='users')
    op.drop_table('users')
    op.execute("DROP TYPE userrole;")
