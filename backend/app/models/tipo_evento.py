from decimal import Decimal

from sqlalchemy import Boolean, Numeric, SmallInteger, String
from sqlalchemy.orm import Mapped, mapped_column

from ..database import Base


class TipoEvento(Base):
    __tablename__ = "tipo_evento"
    __table_args__ = {"schema": "energia"}

    id_tipo_evento: Mapped[int] = mapped_column(
        SmallInteger,
        primary_key=True
    )

    clave: Mapped[str] = mapped_column(
        String(20),
        nullable=False
    )

    nombre: Mapped[str] = mapped_column(
        String(60),
        nullable=False
    )

    efecto: Mapped[str] = mapped_column(
        String(14),
        nullable=False
    )

    afecta_acumulado: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False
    )

    duracion_min_h: Mapped[int] = mapped_column(
        SmallInteger,
        nullable=False
    )

    duracion_max_h: Mapped[int] = mapped_column(
        SmallInteger,
        nullable=False
    )

    intensidad_min: Mapped[Decimal | None] = mapped_column(
        Numeric(5, 3),
        nullable=True
    )

    intensidad_max: Mapped[Decimal | None] = mapped_column(
        Numeric(5, 3),
        nullable=True
    )

    tasa_por_medidor_mes: Mapped[Decimal] = mapped_column(
        Numeric(6, 4),
        nullable=False
    )

    prob_deteccion: Mapped[Decimal] = mapped_column(
        Numeric(4, 3),
        nullable=False
    )

    regla_deteccion: Mapped[str] = mapped_column(
        String(30),
        nullable=False
    )