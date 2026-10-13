export interface Tarifa {
  id_tarifa: number;
  codigo: string;
  nombre: string;
  categoria: string;
  limite_dac_kwh_mes: number | null;
  total_servicios: number;
}


export interface TarifaCreate {
  id_tarifa: number;
  codigo: string;
  nombre: string;
  categoria: string;
  limite_dac_kwh_mes: number | null;
}


export interface TarifaUpdate {
  codigo: string;
  nombre: string;
  categoria: string;
  limite_dac_kwh_mes: number | null;
}


interface ApiMessage {
  mensaje: string;
}


const API_URL =
  import.meta.env.VITE_API_URL ||
  "http://127.0.0.1:8000";


async function obtenerDetalleError(
  response: Response,
): Promise<string> {
  try {
    const data = await response.json();

    if (typeof data.detail === "string") {
      return data.detail;
    }

    if (Array.isArray(data.detail)) {
      return data.detail
        .map((item: { msg?: string }) =>
          item.msg ?? "Dato inválido",
        )
        .join(". ");
    }
  } catch {
    return response.statusText;
  }

  return `Error HTTP ${response.status}`;
}


export async function obtenerTarifas(): Promise<Tarifa[]> {
  const response = await fetch(
    `${API_URL}/api/tarifas`,
  );

  if (!response.ok) {
    throw new Error(
      await obtenerDetalleError(response),
    );
  }

  return response.json();
}


export async function crearTarifa(
  datos: TarifaCreate,
): Promise<Tarifa> {
  const response = await fetch(
    `${API_URL}/api/tarifas`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(datos),
    },
  );

  if (!response.ok) {
    throw new Error(
      await obtenerDetalleError(response),
    );
  }

  return response.json();
}


export async function actualizarTarifa(
  idTarifa: number,
  datos: TarifaUpdate,
): Promise<Tarifa> {
  const response = await fetch(
    `${API_URL}/api/tarifas/${idTarifa}`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(datos),
    },
  );

  if (!response.ok) {
    throw new Error(
      await obtenerDetalleError(response),
    );
  }

  return response.json();
}


export async function eliminarTarifa(
  idTarifa: number,
): Promise<ApiMessage> {
  const response = await fetch(
    `${API_URL}/api/tarifas/${idTarifa}`,
    {
      method: "DELETE",
    },
  );

  if (!response.ok) {
    throw new Error(
      await obtenerDetalleError(response),
    );
  }

  return response.json();
}