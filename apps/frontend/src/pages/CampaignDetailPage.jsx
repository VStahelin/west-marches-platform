import { useEffect, useState } from "react";
import DOMPurify from "dompurify";
import { marked } from "marked";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  createCampaignAta,
  deleteCampaign,
  deleteCampaignAta,
  getCampaign,
  getCampaignAtas,
  updateCampaignAta,
  updateCampaignPrologo,
} from "../lib/api.js";
import "./CampaignDetailPage.css";

function getStoredUser() {
  try {
    return JSON.parse(localStorage.getItem("user"));
  } catch {
    return null;
  }
}

function formatDate(value) {
  return new Date(value).toLocaleString("pt-BR");
}

function renderMarkdown(content) {
  return DOMPurify.sanitize(marked.parse(content || "_Vazio._"));
}

function AtaItem({ ata, isLoggedIn, onUpdate, onDelete }) {
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({ title: ata.title, content: ata.content });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function startEditing() {
    setDraft({ title: ata.title, content: ata.content });
    setError("");
    setEditing(true);
    setExpanded(true);
  }

  async function handleSave() {
    if (!draft.title.trim()) return;

    setSaving(true);
    setError("");

    try {
      await onUpdate(ata.id, draft);
      setEditing(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <li className="ata-item">
      <button type="button" className="ata-item-header" onClick={() => setExpanded((value) => !value)}>
        <span className="ata-item-caret">{expanded ? "▾" : "▸"}</span>
        <strong>{ata.title}</strong>
        <span className="ata-item-meta">
          {ata.created_by} · {formatDate(ata.created_at)}
        </span>
      </button>

      {expanded && (
        <div className="ata-item-body">
          {editing ? (
            <>
              <input
                type="text"
                value={draft.title}
                onChange={(event) => setDraft((prev) => ({ ...prev, title: event.target.value }))}
                placeholder="Título da sessão"
              />
              <textarea
                value={draft.content}
                onChange={(event) => setDraft((prev) => ({ ...prev, content: event.target.value }))}
                rows={10}
              />
              {error && <p className="campaigns-error">{error}</p>}
              <div className="ata-item-actions">
                <button type="button" onClick={handleSave} disabled={saving}>
                  {saving ? "Salvando..." : "Salvar"}
                </button>
                <button
                  type="button"
                  className="campaign-secondary"
                  onClick={() => setEditing(false)}
                  disabled={saving}
                >
                  Cancelar
                </button>
              </div>
            </>
          ) : (
            <>
              <div
                className="campaign-markdown"
                dangerouslySetInnerHTML={{ __html: renderMarkdown(ata.content) }}
              />
              {isLoggedIn && (
                <div className="ata-item-actions">
                  <button type="button" className="campaign-secondary" onClick={startEditing}>
                    Editar
                  </button>
                  <button type="button" className="campaign-danger" onClick={() => onDelete(ata.id)}>
                    Remover
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </li>
  );
}

function CampaignDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const user = getStoredUser();
  const token = localStorage.getItem("token");

  const [campaign, setCampaign] = useState(null);
  const [loadingCampaign, setLoadingCampaign] = useState(true);
  const [campaignError, setCampaignError] = useState("");

  const [prologoEditing, setPrologoEditing] = useState(false);
  const [prologoDraft, setPrologoDraft] = useState("");
  const [savingPrologo, setSavingPrologo] = useState(false);
  const [prologoError, setPrologoError] = useState("");

  const [atas, setAtas] = useState([]);
  const [loadingAtas, setLoadingAtas] = useState(true);

  const [newAtaTitle, setNewAtaTitle] = useState("");
  const [newAtaContent, setNewAtaContent] = useState("");
  const [creatingAta, setCreatingAta] = useState(false);
  const [ataError, setAtaError] = useState("");

  useEffect(() => {
    setLoadingCampaign(true);
    getCampaign(id)
      .then(setCampaign)
      .catch((err) => setCampaignError(err.message))
      .finally(() => setLoadingCampaign(false));

    setLoadingAtas(true);
    getCampaignAtas(id)
      .then(setAtas)
      .catch(() => setAtas([]))
      .finally(() => setLoadingAtas(false));
  }, [id]);

  function startEditingPrologo() {
    setPrologoDraft(campaign.prologo);
    setPrologoError("");
    setPrologoEditing(true);
  }

  async function handleSavePrologo() {
    setSavingPrologo(true);
    setPrologoError("");

    try {
      const updated = await updateCampaignPrologo(id, prologoDraft, token);
      setCampaign(updated);
      setPrologoEditing(false);
    } catch (err) {
      setPrologoError(err.message);
    } finally {
      setSavingPrologo(false);
    }
  }

  async function handleCreateAta(event) {
    event.preventDefault();
    if (!newAtaTitle.trim()) return;

    setCreatingAta(true);
    setAtaError("");

    try {
      const ata = await createCampaignAta(id, { title: newAtaTitle, content: newAtaContent }, token);
      setAtas((prev) => [...prev, ata]);
      setNewAtaTitle("");
      setNewAtaContent("");
    } catch (err) {
      setAtaError(err.message);
    } finally {
      setCreatingAta(false);
    }
  }

  async function handleUpdateAta(ataId, draft) {
    const updated = await updateCampaignAta(id, ataId, draft, token);
    setAtas((prev) => prev.map((ata) => (ata.id === ataId ? updated : ata)));
  }

  async function handleDeleteAta(ataId) {
    if (!window.confirm("Remover essa ata?")) return;

    setAtaError("");
    try {
      await deleteCampaignAta(id, ataId, token);
      setAtas((prev) => prev.filter((ata) => ata.id !== ataId));
    } catch (err) {
      setAtaError(err.message);
    }
  }

  async function handleDeleteCampaign() {
    if (!window.confirm(`Remover a campanha "${campaign.name}" e todas as atas dela?`)) return;

    try {
      await deleteCampaign(id, token);
      navigate("/campanhas");
    } catch (err) {
      setCampaignError(err.message);
    }
  }

  const canDeleteCampaign = Boolean(
    campaign && user && (user.isAdmin || user.username === campaign.master_username),
  );

  if (loadingCampaign) {
    return (
      <div className="campaign-detail-page">
        <p className="campaigns-empty">Carregando...</p>
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="campaign-detail-page">
        <p className="campaigns-error">{campaignError || "Campanha não encontrada."}</p>
        <Link to="/campanhas" className="campaign-back-link">
          ← Campanhas
        </Link>
      </div>
    );
  }

  return (
    <div className="campaign-detail-page">
      <Link to="/campanhas" className="campaign-back-link">
        ← Campanhas
      </Link>

      <header className="campaign-detail-header">
        <div>
          <h1>{campaign.name}</h1>
          <p>Mestre: {campaign.master_username}</p>
        </div>
        {canDeleteCampaign && (
          <button type="button" className="campaign-danger" onClick={handleDeleteCampaign}>
            Remover campanha
          </button>
        )}
      </header>

      <section className="campaign-section">
        <h2>Prólogo</h2>

        {prologoEditing ? (
          <>
            <textarea value={prologoDraft} onChange={(event) => setPrologoDraft(event.target.value)} rows={10} />
            {prologoError && <p className="campaigns-error">{prologoError}</p>}
            <div className="campaign-actions">
              <button type="button" onClick={handleSavePrologo} disabled={savingPrologo}>
                {savingPrologo ? "Salvando..." : "Salvar"}
              </button>
              <button
                type="button"
                className="campaign-secondary"
                onClick={() => setPrologoEditing(false)}
                disabled={savingPrologo}
              >
                Cancelar
              </button>
            </div>
          </>
        ) : (
          <>
            <div
              className="campaign-markdown"
              dangerouslySetInnerHTML={{ __html: renderMarkdown(campaign.prologo) }}
            />
            {user && (
              <button type="button" className="campaign-secondary" onClick={startEditingPrologo}>
                Editar prólogo
              </button>
            )}
          </>
        )}
      </section>

      <section className="campaign-section">
        <h2>Atas das sessões</h2>

        {loadingAtas && <p className="campaigns-empty">Carregando...</p>}
        {!loadingAtas && atas.length === 0 && <p className="campaigns-empty">Nenhuma ata registrada ainda.</p>}

        <ul className="ata-list">
          {atas.map((ata) => (
            <AtaItem
              key={ata.id}
              ata={ata}
              isLoggedIn={Boolean(user)}
              onUpdate={handleUpdateAta}
              onDelete={handleDeleteAta}
            />
          ))}
        </ul>

        {ataError && <p className="campaigns-error">{ataError}</p>}

        {user ? (
          <form className="campaign-form campaign-form--new" onSubmit={handleCreateAta}>
            <h3>Nova ata</h3>
            <input
              type="text"
              placeholder="Título da sessão (ex: Sessão 3 - A Torre Afundada)"
              value={newAtaTitle}
              onChange={(event) => setNewAtaTitle(event.target.value)}
              required
            />
            <textarea
              placeholder="O que rolou nessa sessão..."
              value={newAtaContent}
              onChange={(event) => setNewAtaContent(event.target.value)}
              rows={6}
            />
            <button type="submit" disabled={creatingAta}>
              {creatingAta ? "Salvando..." : "Adicionar ata"}
            </button>
          </form>
        ) : (
          <p className="campaigns-empty">Faça login para escrever uma ata.</p>
        )}
      </section>
    </div>
  );
}

export default CampaignDetailPage;
