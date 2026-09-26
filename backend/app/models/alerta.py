from datetime import datetime

from sqlalchemy import (
    BigInteger,
    DateTime,
    ForeignKey,
    Integer,
    SmallInteger,
    String,
)
from sqlalchemy.orm import Mapped, mapped_column

from ..database import Base


class Alerta(Base):
    __tablename__ = "alerta"
    __table_args__ = {"schema": "energia"}

    id_alerta: Mapped[int] = mapped_column(
        BigInteger,
        primary_key=True
    )

    id_evento: Mapped[int | None] = mapped_column(
        BigInteger,
        ForeignKey("energia.evento.id_evento"),
        nullable=True
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

    ts_generacion: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False
    )

    prioridad: Mapped[int] = mapped_column(
        SmallInteger,
        nullable=False
    )

    ts_cierre: Mapped[datetime | None] = mapped_column(
        DateTime,
        nullable=True
    )

    resultado: Mapped[str | None] = mapped_column(
        String(15),
        nullable=True
    )