from decimal import Decimal

from sqlalchemy import Numeric, SmallInteger, String
from sqlalchemy.orm import Mapped, mapped_column

from ..database import Base


class TipoServicio(Base):
    __tablename__ = "tipo_servicio"
    __table_args__ = {"schema": "energia"}

    id_tipo_servicio: Mapped[int] = mapped_column(
        SmallInteger,
        primary_key=True
    )

    clave: Mapped[str] = mapped_column(
        String(14),
        nullable=False
    )

    nombre: Mapped[str] = mapped_column(
        String(60),
        nullable=False
    )

    categoria: Mapped[str] = mapped_column(
        String(12),
        nullable=False
    )

    consumo_base_kwh_h: Mapped[Decimal] = mapped_column(
        Numeric(8, 3),
        nullable=False
    )

    factor_dispersion: Mapped[Decimal] = mapped_column(
        Numeric(4, 3),
        nullable=False
    )

    sensibilidad_temp: Mapped[Decimal] = mapped_column(
        Numeric(4, 3),
        nullable=False
    )