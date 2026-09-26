from decimal import Decimal

from sqlalchemy import CHAR, ForeignKey, Numeric, SmallInteger
from sqlalchemy.orm import Mapped, mapped_column

from ..database import Base


class PerfilCargaHoraria(Base):
    __tablename__ = "perfil_carga_horaria"
    __table_args__ = {"schema": "energia"}

    id_tipo_servicio: Mapped[int] = mapped_column(
        SmallInteger,
        ForeignKey("energia.tipo_servicio.id_tipo_servicio"),
        primary_key=True
    )

    tipo_dia: Mapped[str] = mapped_column(
        CHAR(1),
        primary_key=True
    )

    hora: Mapped[int] = mapped_column(
        SmallInteger,
        primary_key=True
    )

    factor: Mapped[Decimal] = mapped_column(
        Numeric(5, 4),
        nullable=False
    )