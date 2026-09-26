from datetime import date
from decimal import Decimal

from sqlalchemy import (
    Boolean,
    Date,
    ForeignKey,
    Integer,
    Numeric,
    SmallInteger,
    String,
)
from sqlalchemy.orm import Mapped, mapped_column

from ..database import Base


class PeriodoFacturacion(Base):
    __tablename__ = "periodo_facturacion"
    __table_args__ = {"schema": "energia"}

    id_periodo: Mapped[int] = mapped_column(
        Integer,
        primary_key=True
    )

    id_servicio: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("energia.servicio.id_servicio"),
        nullable=False
    )

    folio: Mapped[str] = mapped_column(
        String(20),
        nullable=False
    )

    fecha_inicio: Mapped[date] = mapped_column(
        Date,
        nullable=False
    )

    fecha_fin: Mapped[date] = mapped_column(
        Date,
        nullable=False
    )

    id_tarifa_aplicada: Mapped[int] = mapped_column(
        SmallInteger,
        ForeignKey("energia.tarifa.id_tarifa"),
        nullable=False
    )

    registro_inicial_kwh: Mapped[Decimal] = mapped_column(
        Numeric(12, 3),
        nullable=False
    )

    registro_final_kwh: Mapped[Decimal] = mapped_column(
        Numeric(12, 3),
        nullable=False
    )

    consumo_real_kwh: Mapped[Decimal] = mapped_column(
        Numeric(12, 3),
        nullable=False
    )

    clasificacion_dac: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False
    )