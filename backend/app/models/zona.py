from decimal import Decimal

from sqlalchemy import Integer, Numeric, SmallInteger, String
from sqlalchemy.orm import Mapped, mapped_column

from ..database import Base


class Zona(Base):
    __tablename__ = "zona"
    __table_args__ = {"schema": "energia"}

    id_zona: Mapped[int] = mapped_column(
        SmallInteger,
        primary_key=True
    )

    nombre: Mapped[str] = mapped_column(
        String(60),
        nullable=False,
        unique=True
    )

    tipo_urbano: Mapped[str] = mapped_column(
        String(20),
        nullable=False
    )

    superficie_km2: Mapped[Decimal] = mapped_column(
        Numeric(6, 3),
        nullable=False
    )

    factor_socioeconomico: Mapped[Decimal] = mapped_column(
        Numeric(4, 3),
        nullable=False
    )

    poblacion_total: Mapped[int | None] = mapped_column(
        Integer,
        nullable=True
    )

    viviendas_habitadas: Mapped[int | None] = mapped_column(
        Integer,
        nullable=True
    )

    grado_rezago_representativo: Mapped[str | None] = mapped_column(
        String(12),
        nullable=True
    )

    id_referencia: Mapped[int | None] = mapped_column(
        Integer,
        nullable=True
    )