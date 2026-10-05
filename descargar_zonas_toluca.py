import json
import sys
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

URLS = [
    "https://raw.githubusercontent.com/planeacionterritorialmx/Delegaciones-Toluca/main/data/raw/POLIGONOS_DELEGACIONES_UNIFICADO.geojson",
    "https://cdn.jsdelivr.net/gh/planeacionterritorialmx/Delegaciones-Toluca@main/data/raw/POLIGONOS_DELEGACIONES_UNIFICADO.geojson",
    "https://raw.githack.com/planeacionterritorialmx/Delegaciones-Toluca/main/data/raw/POLIGONOS_DELEGACIONES_UNIFICADO.geojson",
]


def descargar(url: str) -> bytes:
    request = Request(
        url,
        headers={
            "User-Agent": "Mozilla/5.0 SIMET/1.0",
            "Accept": "application/json,text/plain,*/*",
        },
    )
    with urlopen(request, timeout=45) as response:
        return response.read()


def eliminar_z(valor):
    if not isinstance(valor, list):
        return valor
    if (
        len(valor) >= 2
        and isinstance(valor[0], (int, float))
        and isinstance(valor[1], (int, float))
    ):
        return [float(valor[0]), float(valor[1])]
    return [eliminar_z(item) for item in valor]


def validar(datos: dict) -> None:
    if datos.get("type") != "FeatureCollection":
        raise ValueError("El archivo descargado no es una FeatureCollection.")
    features = datos.get("features")
    if not isinstance(features, list) or not features:
        raise ValueError("El archivo descargado no contiene features.")
    for index, feature in enumerate(features, 1):
        geometry = feature.get("geometry")
        if not isinstance(geometry, dict):
            raise ValueError(f"Feature {index} sin geometría válida.")
        if geometry.get("type") not in {"Polygon", "MultiPolygon"}:
            raise ValueError(
                f"Feature {index} con geometría no admitida: "
                f"{geometry.get('type')!r}."
            )


def main() -> int:
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except AttributeError:
        pass

    print("SIMET - Descarga de polígonos reales de Toluca")
    contenido = None
    errores = []

    for numero, url in enumerate(URLS, 1):
        print(f"Intento {numero}/{len(URLS)}: {url}")
        try:
            contenido = descargar(url)
            print(f"Descarga recibida: {len(contenido):,} bytes")
            break
        except (HTTPError, URLError, TimeoutError) as exc:
            errores.append(f"{url}: {exc}")
            print(f"No disponible: {exc}")

    if contenido is None:
        print("\nNo fue posible descargar el archivo desde ninguna URL.", file=sys.stderr)
        print("Revise que GitHub no esté bloqueado por antivirus, red o proxy.", file=sys.stderr)
        for error in errores:
            print(f"- {error}", file=sys.stderr)
        return 1

    try:
        texto = contenido.decode("utf-8-sig")
        datos = json.loads(texto)
        validar(datos)

        for feature in datos["features"]:
            feature["geometry"]["coordinates"] = eliminar_z(
                feature["geometry"]["coordinates"]
            )
            feature.setdefault("properties", {})["fuente"] = (
                "POLIGONOS_DELEGACIONES_UNIFICADO"
            )

        salida = Path.cwd() / "public" / "data" / "zonas_toluca.geojson"
        salida.parent.mkdir(parents=True, exist_ok=True)
        salida.write_text(
            json.dumps(datos, ensure_ascii=False, separators=(",", ":")),
            encoding="utf-8",
        )

        comprobacion = json.loads(salida.read_text(encoding="utf-8"))
        validar(comprobacion)

        print("\nArchivo creado correctamente:")
        print(salida)
        print(f"Features: {len(comprobacion['features'])}")
        print(f"Tamaño: {salida.stat().st_size:,} bytes")

        if len(comprobacion["features"]) != 47:
            print(
                "ADVERTENCIA: se esperaban 47 features en la fuente cartográfica."
            )
        return 0

    except (UnicodeDecodeError, json.JSONDecodeError, ValueError) as exc:
        print(f"\nEl contenido descargado no es un GeoJSON válido: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
