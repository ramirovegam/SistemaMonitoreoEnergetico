from datetime import date, datetime

from sqlalchemy import (
    BigInteger,
    CHAR,
    Date,
    DateTime,
    SmallInteger,
    String,
)
from sqlalchemy.orm import Mapped, mapped_column

from ..database import Base


class CorridaGeneracion(Base):
    __tablename__ = "corrida_generacion"
    __table_args__ = {"schema": "energia"}

    id_corrida: Mapped[int] = mapped_column(
        SmallInteger,
        primary_key=True
    )

    nombre: Mapped[str] = mapped_column(
        String(40),
        nullable=False
    )

    semilla: Mapped[int] = mapped_column(
        BigInteger,
        nullable=False
    )

    version_reglas: Mapped[str] = mapped_column(
        String(12),
        nullable=False
    )

    hash_parametros: Mapped[str] = mapped_column(
        CHAR(64),
        nullable=False
    )

    ts_inicio_ejecucion: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False
    )

    ts_fin_ejecucion: Mapped[datetime | None] = mapped_column(
        DateTime,
        nullable=True
    )

    fecha_desde: Mapped[date] = mapped_column(
        Date,
        nullable=False
    )

    fecha_hasta: Mapped[date] = mapped_column(
        Date,
        nullable=False
    )

    intervalo_min: Mapped[int] = mapped_column(
        SmallInteger,
        nullable=False
    )

    total_lecturas: Mapped[int | None] = mapped_column(
        BigInteger,
        nullable=True
    )

    notas: Mapped[str | None] = mapped_column(
        String(300),
        nullable=True
    )