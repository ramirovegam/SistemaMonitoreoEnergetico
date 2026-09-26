from sqlalchemy import Integer, SmallInteger, String
from sqlalchemy.orm import Mapped, mapped_column

from ..database import Base


class Tarifa(Base):
    __tablename__ = "tarifa"
    __table_args__ = {"schema": "energia"}

    id_tarifa: Mapped[int] = mapped_column(
        SmallInteger,
        primary_key=True
    )

    codigo: Mapped[str] = mapped_column(
        String(6),
        nullable=False
    )

    nombre: Mapped[str] = mapped_column(
        String(60),
        nullable=False
    )

    categoria: Mapped[str] = mapped_column(
        String(18),
        nullable=False
    )

    limite_dac_kwh_mes: Mapped[int | None] = mapped_column(
        Integer,
        nullable=True
    )