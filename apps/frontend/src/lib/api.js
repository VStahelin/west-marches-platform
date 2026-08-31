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

export async function getQuadrantComments(row, col, token) {
  const response = await fetch(`${API_URL}/api/quadrants/${row}/${col}/comments`, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });

  if (!response.ok) {
    throw new Error("Não foi possível carregar os rumores.");
  }

  return response.json();
}

export async function createQuadrantComment(row, col, { content, isAnonymous, characterId }, token) {
  const response = await fetch(`${API_URL}/api/quadrants/${row}/${col}/comments`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ content, isAnonymous, characterId }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Não foi possível publicar o rumor.");
  }

  return data;
}

export async function updateQuadrantComment(row, col, id, { content, isAnonymous, characterId }, token) {
  const response = await fetch(`${API_URL}/api/quadrants/${row}/${col}/comments/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ content, isAnonymous, characterId }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Não foi possível editar o rumor.");
  }

  return data;
}

export async function getCharacters(token) {
  const response = await fetch(`${API_URL}/api/characters`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    throw new Error("Não foi possível carregar seus personagens.");
  }

  return response.json();
}

export async function createCharacter(character, token) {
  const response = await fetch(`${API_URL}/api/characters`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(character),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Não foi possível criar o personagem.");
  }

  return data;
}

export async function updateCharacter(id, character, token) {
  const response = await fetch(`${API_URL}/api/characters/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(character),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Não foi possível editar o personagem.");
  }

  return data;
}

export async function deleteCharacter(id, token) {
  const response = await fetch(`${API_URL}/api/characters/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.message || "Não foi possível remover o personagem.");
  }
}

export async function getUsers(token) {
  const response = await fetch(`${API_URL}/api/users`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    throw new Error("Não foi possível carregar os usuários.");
  }

  return response.json();
}

export async function createUser(user, token) {
  const response = await fetch(`${API_URL}/api/users`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(user),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Não foi possível criar o usuário.");
  }

  return data;
}

export async function updateUser(id, user, token) {
  const response = await fetch(`${API_URL}/api/users/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(user),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Não foi possível editar o usuário.");
  }

  return data;
}

export async function deleteUser(id, token) {
  const response = await fetch(`${API_URL}/api/users/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.message || "Não foi possível remover o usuário.");
  }
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

function encodeWikiPath(wikiPath) {
  return String(wikiPath ?? "")
    .split("/")
    .filter(Boolean)
    .map(encodeURIComponent)
    .join("/");
}

export async function getWikiTree() {
  const response = await fetch(`${API_URL}/api/wiki/tree`);

  if (!response.ok) {
    throw new Error("Não foi possível carregar a wiki.");
  }

  return response.json();
}

export async function getWikiPage(wikiPath) {
  const response = await fetch(`${API_URL}/api/wiki/pages/${encodeWikiPath(wikiPath)}`);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Não foi possível carregar a página.");
  }

  return data;
}

export async function createWikiPage({ parentPath, name, content }, token) {
  const response = await fetch(`${API_URL}/api/wiki/pages`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ parentPath, name, content }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Não foi possível criar a página.");
  }

  return data;
}

export async function updateWikiPage(wikiPath, content, token) {
  const response = await fetch(`${API_URL}/api/wiki/pages/${encodeWikiPath(wikiPath)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ content }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Não foi possível salvar a página.");
  }

  return data;
}

export async function deleteWikiPage(wikiPath, token) {
  const response = await fetch(`${API_URL}/api/wiki/pages/${encodeWikiPath(wikiPath)}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.message || "Não foi possível remover a página.");
  }
}

export async function createWikiFolder({ parentPath, name }, token) {
  const response = await fetch(`${API_URL}/api/wiki/folders`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ parentPath, name }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Não foi possível criar a pasta.");
  }

  return data;
}

export async function deleteWikiFolder(wikiPath, token) {
  const response = await fetch(`${API_URL}/api/wiki/folders/${encodeWikiPath(wikiPath)}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.message || "Não foi possível remover a pasta.");
  }
}

export async function getMapPins(token) {
  const response = await fetch(`${API_URL}/api/pins`, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });

  if (!response.ok) {
    throw new Error("Não foi possível carregar os pins.");
  }

  return response.json();
}

export async function createMapPin(pin, token) {
  const response = await fetch(`${API_URL}/api/pins`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(pin),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Não foi possível criar o pin.");
  }

  return data;
}

export async function updateMapPin(id, pin, token) {
  const response = await fetch(`${API_URL}/api/pins/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(pin),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Não foi possível editar o pin.");
  }

  return data;
}

export async function deleteMapPin(id, token) {
  const response = await fetch(`${API_URL}/api/pins/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.message || "Não foi possível remover o pin.");
  }
}

export async function getCampaigns() {
  const response = await fetch(`${API_URL}/api/campaigns`);

  if (!response.ok) {
    throw new Error("Não foi possível carregar as campanhas.");
  }

  return response.json();
}

export async function createCampaign(name, token) {
  const response = await fetch(`${API_URL}/api/campaigns`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ name }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Não foi possível criar a campanha.");
  }

  return data;
}

export async function getCampaign(id) {
  const response = await fetch(`${API_URL}/api/campaigns/${id}`);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Não foi possível carregar a campanha.");
  }

  return data;
}

export async function updateCampaignPrologo(id, prologo, token) {
  const response = await fetch(`${API_URL}/api/campaigns/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ prologo }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Não foi possível salvar o prólogo.");
  }

  return data;
}

export async function deleteCampaign(id, token) {
  const response = await fetch(`${API_URL}/api/campaigns/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.message || "Não foi possível remover a campanha.");
  }
}

export async function getCampaignAtas(campaignId) {
  const response = await fetch(`${API_URL}/api/campaigns/${campaignId}/atas`);

  if (!response.ok) {
    throw new Error("Não foi possível carregar as atas.");
  }

  return response.json();
}

export async function createCampaignAta(campaignId, { title, content }, token) {
  const response = await fetch(`${API_URL}/api/campaigns/${campaignId}/atas`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ title, content }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Não foi possível criar a ata.");
  }

  return data;
}

export async function updateCampaignAta(campaignId, ataId, { title, content }, token) {
  const response = await fetch(`${API_URL}/api/campaigns/${campaignId}/atas/${ataId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ title, content }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Não foi possível salvar a ata.");
  }

  return data;
}

export async function deleteCampaignAta(campaignId, ataId, token) {
  const response = await fetch(`${API_URL}/api/campaigns/${campaignId}/atas/${ataId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.message || "Não foi possível remover a ata.");
  }
}
