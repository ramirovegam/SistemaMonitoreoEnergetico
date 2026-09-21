from decimal import Decimal

from sqlalchemy import Numeric, SmallInteger, String
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