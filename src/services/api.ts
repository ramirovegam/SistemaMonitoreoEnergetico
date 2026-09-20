const API_URL = "http://127.0.0.1:8000";

export async function testBackend() {
  const response = await fetch(`${API_URL}/api/test`);

  if (!response.ok) {
    throw new Error("Error al conectar con el backend");
  }

  return response.json();
}