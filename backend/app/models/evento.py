from datetime import datetime
from decimal import Decimal

from sqlalchemy import (
    BigInteger,
    DateTime,
    ForeignKey,
    Integer,
    Numeric,
    SmallInteger,
)
from sqlalchemy.orm import Mapped, mapped_column

from ..database import Base


class Evento(Base):
    __tablename__ = "evento"
    __table_args__ = {"schema": "energia"}

    id_evento: Mapped[int] = mapped_column(
        BigInteger,
        primary_key=True
    )

    id_medidor: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("energia.medidor.id_medidor"),
        nullable=False
    )

    id_tipo_evento: Mapped[int] = mapped_column(
        SmallInteger,
        ForeignKey("energia.tipo_evento.id_tipo_evento"),
        nullable=False
    )

    ts_inicio: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False
    )

    ts_fin: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False
    )

    intensidad: Mapped[Decimal | None] = mapped_column(
        Numeric(5, 3),
        nullable=True
    )

    kwh_desviados: Mapped[Decimal] = mapped_column(
        Numeric(12, 4),
        nullable=False
    )