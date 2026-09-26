from decimal import Decimal

from sqlalchemy import (
    Boolean,
    ForeignKey,
    Integer,
    Numeric,
    SmallInteger,
    String,
)
from sqlalchemy.orm import Mapped, mapped_column

from ..database import Base


class Servicio(Base):
    __tablename__ = "servicio"
    __table_args__ = {"schema": "energia"}

    id_servicio: Mapped[int] = mapped_column(
        Integer,
        primary_key=True
    )

    rpu: Mapped[str] = mapped_column(
        String(12),
        nullable=False
    )

    id_zona: Mapped[int] = mapped_column(
        SmallInteger,
        ForeignKey("energia.zona.id_zona"),
        nullable=False
    )

    id_tipo_servicio: Mapped[int] = mapped_column(
        SmallInteger,
        ForeignKey("energia.tipo_servicio.id_tipo_servicio"),
        nullable=False
    )

    id_tarifa: Mapped[int] = mapped_column(
        SmallInteger,
        ForeignKey("energia.tarifa.id_tarifa"),
        nullable=False
    )

    nombre: Mapped[str] = mapped_column(
        String(120),
        nullable=False
    )

    latitud: Mapped[Decimal] = mapped_column(
        Numeric(9, 6),
        nullable=False
    )

    longitud: Mapped[Decimal] = mapped_column(
        Numeric(9, 6),
        nullable=False
    )

    ocupacion_estimada: Mapped[int | None] = mapped_column(
        SmallInteger,
        nullable=True
    )

    carga_contratada_kw: Mapped[Decimal] = mapped_column(
        Numeric(8, 2),
        nullable=False
    )

    tiene_solar: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False
    )