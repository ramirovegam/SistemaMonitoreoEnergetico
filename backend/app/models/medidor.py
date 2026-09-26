from datetime import date
from decimal import Decimal

from sqlalchemy import (
    Date,
    ForeignKey,
    Integer,
    Numeric,
    SmallInteger,
    String,
)
from sqlalchemy.orm import Mapped, mapped_column

from ..database import Base


class Medidor(Base):
    __tablename__ = "medidor"
    __table_args__ = {"schema": "energia"}

    id_medidor: Mapped[int] = mapped_column(
        Integer,
        primary_key=True
    )

    id_servicio: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("energia.servicio.id_servicio"),
        nullable=False
    )

    numero_serie: Mapped[str] = mapped_column(
        String(24),
        nullable=False
    )

    marca: Mapped[str] = mapped_column(
        String(24),
        nullable=False
    )

    multiplicador: Mapped[int] = mapped_column(
        SmallInteger,
        nullable=False
    )

    fecha_instalacion: Mapped[date] = mapped_column(
        Date,
        nullable=False
    )

    fecha_retiro: Mapped[date | None] = mapped_column(
        Date,
        nullable=True
    )

    calidad_enlace: Mapped[Decimal] = mapped_column(
        Numeric(5, 4),
        nullable=False
    )