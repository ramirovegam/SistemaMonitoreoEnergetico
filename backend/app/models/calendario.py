from datetime import date
from decimal import Decimal

from sqlalchemy import Boolean, CHAR, Date, Numeric
from sqlalchemy.orm import Mapped, mapped_column

from ..database import Base


class Calendario(Base):
    __tablename__ = "calendario"
    __table_args__ = {"schema": "energia"}

    fecha: Mapped[date] = mapped_column(
        Date,
        primary_key=True
    )

    tipo_dia: Mapped[str] = mapped_column(
        CHAR(1),
        nullable=False
    )

    es_festivo: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False
    )

    es_vacacional: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False
    )

    temp_min_c: Mapped[Decimal] = mapped_column(
        Numeric(4, 1),
        nullable=False
    )

    temp_max_c: Mapped[Decimal] = mapped_column(
        Numeric(4, 1),
        nullable=False
    )

    factor_estacional: Mapped[Decimal] = mapped_column(
        Numeric(5, 4),
        nullable=False
    )