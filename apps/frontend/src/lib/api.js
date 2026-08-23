export const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

export async function login(username, password) {
  const response = await fetch(`${API_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Não foi possível entrar.");
  }

  return data;
}

export async function getMapBackground() {
  const response = await fetch(`${API_URL}/api/map/background`);

  if (!response.ok) {
    throw new Error("Não foi possível carregar o mapa.");
  }

  return response.json();
}

export async function uploadMapBackground(file, token) {
  const formData = new FormData();
  formData.append("image", file);

  const response = await fetch(`${API_URL}/api/map/background`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Não foi possível enviar a imagem.");
  }

  return data;
}
