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

export async function getQuadrantSummary(row, col) {
  const response = await fetch(`${API_URL}/api/quadrants/${row}/${col}/summary`);

  if (!response.ok) {
    throw new Error("Não foi possível carregar o resumo do quadrante.");
  }

  return response.json();
}

export async function updateQuadrantSummary(row, col, content, token) {
  const response = await fetch(`${API_URL}/api/quadrants/${row}/${col}/summary`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ content }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Não foi possível salvar o resumo.");
  }

  return data;
}

export async function getQuadrantComments(row, col) {
  const response = await fetch(`${API_URL}/api/quadrants/${row}/${col}/comments`);

  if (!response.ok) {
    throw new Error("Não foi possível carregar os rumores.");
  }

  return response.json();
}

export async function createQuadrantComment(row, col, { author, content }, token) {
  const response = await fetch(`${API_URL}/api/quadrants/${row}/${col}/comments`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ author, content }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Não foi possível publicar o rumor.");
  }

  return data;
}

export async function updateQuadrantComment(row, col, id, { author, content }, token) {
  const response = await fetch(`${API_URL}/api/quadrants/${row}/${col}/comments/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ author, content }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Não foi possível editar o rumor.");
  }

  return data;
}

export async function deleteQuadrantComment(row, col, id, token) {
  const response = await fetch(`${API_URL}/api/quadrants/${row}/${col}/comments/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.message || "Não foi possível remover o rumor.");
  }
}
