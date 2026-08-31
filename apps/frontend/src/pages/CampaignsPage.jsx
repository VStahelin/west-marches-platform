import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { createCampaign, getCampaigns } from "../lib/api.js";
import "./CampaignsPage.css";

function getStoredUser() {
  try {
    return JSON.parse(localStorage.getItem("user"));
  } catch {
    return null;
  }
}

function formatDate(value) {
  return new Date(value).toLocaleDateString("pt-BR");
}

function CampaignsPage() {
  const user = getStoredUser();
  const token = localStorage.getItem("token");

  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");

  useEffect(() => {
    getCampaigns()
      .then(setCampaigns)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  async function handleCreate(event) {
    event.preventDefault();
    if (!name.trim()) return;

    setCreating(true);
    setCreateError("");

    try {
      const campaign = await createCampaign(name, token);
      setCampaigns((prev) => [...prev, campaign]);
      setName("");
    } catch (err) {
      setCreateError(err.message);
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="campaigns-page">
      <header className="campaigns-header">
        <h1>Campanhas em Curso</h1>
        <p>Prólogo e atas de cada campanha que roda nesse mundo compartilhado.</p>
      </header>

      {error && <p className="campaigns-error">{error}</p>}
      {loading && <p className="campaigns-empty">Carregando...</p>}
      {!loading && campaigns.length === 0 && <p className="campaigns-empty">Nenhuma campanha criada ainda.</p>}

      <ul className="campaign-list">
        {campaigns.map((campaign) => (
          <li key={campaign.id} className="campaign-card">
            <Link to={`/campanhas/${campaign.id}`} className="campaign-card-link">
              <strong>{campaign.name}</strong>
              <span>
                Mestre: {campaign.master_username} · desde {formatDate(campaign.created_at)}
              </span>
            </Link>
          </li>
        ))}
      </ul>

      {user ? (
        <form className="campaign-form campaign-form--new" onSubmit={handleCreate}>
          <h3>Nova campanha</h3>
          <input
            type="text"
            placeholder="Nome da campanha"
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
          />
          <button type="submit" disabled={creating}>
            {creating ? "Criando..." : "Criar campanha"}
          </button>
          {createError && <p className="campaigns-error">{createError}</p>}
        </form>
      ) : (
        <p className="campaigns-empty">Faça login para criar uma campanha.</p>
      )}
    </div>
  );
}

export default CampaignsPage;
