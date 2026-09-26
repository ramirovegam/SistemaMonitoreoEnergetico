from datetime import datetime
from decimal import Decimal

from sqlalchemy import (
    BigInteger,
    DateTime,
    ForeignKey,
    Integer,
    Numeric,
)
from sqlalchemy.orm import Mapped, mapped_column

from ..database import Base


class Lectura(Base):
    __tablename__ = "lectura"
    __table_args__ = {"schema": "energia"}

    id_medidor: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("energia.medidor.id_medidor"),
        primary_key=True
    )

    ts: Mapped[datetime] = mapped_column(
        DateTime,
        primary_key=True
    )

    consumo_kwh: Mapped[Decimal | None] = mapped_column(
        Numeric(9, 4),
        nullable=True
    )

    consumo_real_kwh: Mapped[Decimal] = mapped_column(
        Numeric(9, 4),
        nullable=False
    )

    id_evento: Mapped[int | None] = mapped_column(
        BigInteger,
        ForeignKey("energia.evento.id_evento"),
        nullable=True
    )