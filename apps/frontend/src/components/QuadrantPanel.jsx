import { useEffect, useState } from "react";
import DOMPurify from "dompurify";
import { marked } from "marked";
import { Link } from "react-router-dom";
import {
  createQuadrantComment,
  deleteQuadrantComment,
  getCharacters,
  getQuadrantComments,
  getQuadrantSummary,
  updateQuadrantComment,
  updateQuadrantSummary,
} from "../lib/api.js";
import "./QuadrantPanel.css";

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

function displayAuthor(comment) {
  if (comment.is_anonymous) return "Anônimo";
  if (comment.character_name) return comment.character_name;
  return "Personagem removido";
}

function displaySubtitle(comment) {
  if (comment.is_anonymous || !comment.character_name) return null;
  const details = [comment.character_race, comment.character_class].filter(Boolean).join(" · ");
  return details ? `${details} — Nível ${comment.character_level}` : `Nível ${comment.character_level}`;
}

function QuadrantPanel({ row, col, onClose }) {
  const [summary, setSummary] = useState("");
  const [summaryDraft, setSummaryDraft] = useState("");
  const [editingSummary, setEditingSummary] = useState(false);
  const [savingSummary, setSavingSummary] = useState(false);
  const [summaryError, setSummaryError] = useState("");

  const [comments, setComments] = useState([]);
  const [loadingComments, setLoadingComments] = useState(true);
  const [characters, setCharacters] = useState([]);

  const [isAnonymous, setIsAnonymous] = useState(true);
  const [characterId, setCharacterId] = useState("");
  const [commentContent, setCommentContent] = useState("");
  const [commentError, setCommentError] = useState("");
  const [postingComment, setPostingComment] = useState(false);

  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editingDraft, setEditingDraft] = useState({ content: "", isAnonymous: true, characterId: "" });

  const user = getStoredUser();
  const token = localStorage.getItem("token");

  useEffect(() => {
    setEditingSummary(false);
    setSummaryError("");
    setEditingCommentId(null);
    setCommentError("");

    getQuadrantSummary(row, col)
      .then((data) => setSummary(data.content))
      .catch(() => setSummary(""));

    setLoadingComments(true);
    getQuadrantComments(row, col, token)
      .then(setComments)
      .catch(() => setComments([]))
      .finally(() => setLoadingComments(false));
  }, [row, col]);

  useEffect(() => {
    if (!user) return;

    getCharacters(token)
      .then((data) => {
        setCharacters(data);
        if (data.length > 0) {
          setIsAnonymous(false);
          setCharacterId(String(data[0].id));
        }
      })
      .catch(() => setCharacters([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.username]);

  function startEditingSummary() {
    setSummaryDraft(summary);
    setSummaryError("");
    setEditingSummary(true);
  }

  async function handleSaveSummary() {
    setSavingSummary(true);
    setSummaryError("");

    try {
      const data = await updateQuadrantSummary(row, col, summaryDraft, token);
      setSummary(data.content);
      setEditingSummary(false);
    } catch (err) {
      setSummaryError(err.message);
    } finally {
      setSavingSummary(false);
    }
  }

  async function handleAddComment(event) {
    event.preventDefault();
    if (!commentContent.trim()) return;
    if (!isAnonymous && !characterId) return;

    setPostingComment(true);
    setCommentError("");

    try {
      const comment = await createQuadrantComment(
        row,
        col,
        { content: commentContent, isAnonymous, characterId },
        token,
      );
      setComments((prev) => [...prev, comment]);
      setCommentContent("");
    } catch (err) {
      setCommentError(err.message);
    } finally {
      setPostingComment(false);
    }
  }

  function startEditingComment(comment) {
    setEditingCommentId(comment.id);
    setEditingDraft({
      content: comment.content,
      isAnonymous: comment.is_anonymous,
      characterId: comment.character_id ? String(comment.character_id) : "",
    });
    setCommentError("");
  }

  async function handleSaveComment(id) {
    try {
      const updated = await updateQuadrantComment(row, col, id, editingDraft, token);
      setComments((prev) => prev.map((comment) => (comment.id === id ? updated : comment)));
      setEditingCommentId(null);
    } catch (err) {
      setCommentError(err.message);
    }
  }

  async function handleDeleteComment(id) {
    try {
      await deleteQuadrantComment(row, col, id, token);
      setComments((prev) => prev.filter((comment) => comment.id !== id));
    } catch (err) {
      setCommentError(err.message);
    }
  }

  const summaryHtml = DOMPurify.sanitize(marked.parse(summary || "_Nenhum resumo ainda._"));

  return (
    <aside className="quadrant-panel">
      <div className="quadrant-panel-header">
        <h2>
          Quadrante {row}, {col}
        </h2>
        <button type="button" className="quadrant-panel-close" onClick={onClose} aria-label="Fechar">
          ×
        </button>
      </div>

      <section className="quadrant-summary">
        {editingSummary ? (
          <>
            <textarea
              value={summaryDraft}
              onChange={(event) => setSummaryDraft(event.target.value)}
              rows={10}
            />
            {summaryError && <p className="quadrant-error">{summaryError}</p>}
            <div className="quadrant-actions">
              <button type="button" onClick={handleSaveSummary} disabled={savingSummary}>
                {savingSummary ? "Salvando..." : "Salvar"}
              </button>
              <button
                type="button"
                className="quadrant-secondary"
                onClick={() => setEditingSummary(false)}
                disabled={savingSummary}
              >
                Cancelar
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="quadrant-summary-content" dangerouslySetInnerHTML={{ __html: summaryHtml }} />
            {user && (
              <button type="button" className="quadrant-secondary" onClick={startEditingSummary}>
                Editar resumo
              </button>
            )}
          </>
        )}
      </section>

      <section className="quadrant-comments">
        <h3>Rumores</h3>

        {loadingComments && <p className="quadrant-empty">Carregando...</p>}
        {!loadingComments && comments.length === 0 && (
          <p className="quadrant-empty">Nenhum rumor ainda por aqui.</p>
        )}

        <ul className="quadrant-comment-list">
          {comments.map((comment) => (
            <li key={comment.id} className="quadrant-comment">
              {editingCommentId === comment.id ? (
                <>
                  <label className="quadrant-checkbox">
                    <input
                      type="checkbox"
                      checked={editingDraft.isAnonymous}
                      onChange={(event) =>
                        setEditingDraft((prev) => ({ ...prev, isAnonymous: event.target.checked }))
                      }
                    />
                    Publicar como anônimo
                  </label>
                  {!editingDraft.isAnonymous && (
                    <select
                      value={editingDraft.characterId}
                      onChange={(event) =>
                        setEditingDraft((prev) => ({ ...prev, characterId: event.target.value }))
                      }
                    >
                      <option value="">Selecione um personagem</option>
                      {characters.map((character) => (
                        <option key={character.id} value={character.id}>
                          {character.name}
                        </option>
                      ))}
                    </select>
                  )}
                  <textarea
                    value={editingDraft.content}
                    onChange={(event) =>
                      setEditingDraft((prev) => ({ ...prev, content: event.target.value }))
                    }
                    rows={3}
                  />
                  <div className="quadrant-actions">
                    <button type="button" onClick={() => handleSaveComment(comment.id)}>
                      Salvar
                    </button>
                    <button
                      type="button"
                      className="quadrant-secondary"
                      onClick={() => setEditingCommentId(null)}
                    >
                      Cancelar
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="quadrant-comment-meta">
                    <div>
                      <strong>{displayAuthor(comment)}</strong>
                      {displaySubtitle(comment) && (
                        <span className="quadrant-comment-subtitle"> · {displaySubtitle(comment)}</span>
                      )}
                    </div>
                    <span>{formatDate(comment.created_at)}</span>
                  </div>
                  <p>{comment.content}</p>
                  {comment.canModify && (
                    <div className="quadrant-actions">
                      <button
                        type="button"
                        className="quadrant-secondary"
                        onClick={() => startEditingComment(comment)}
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        className="quadrant-danger"
                        onClick={() => handleDeleteComment(comment.id)}
                      >
                        Remover
                      </button>
                    </div>
                  )}
                </>
              )}
            </li>
          ))}
        </ul>

        {commentError && <p className="quadrant-error">{commentError}</p>}

        {user ? (
          <form className="quadrant-comment-form" onSubmit={handleAddComment}>
            <label className="quadrant-checkbox">
              <input
                type="checkbox"
                checked={isAnonymous}
                onChange={(event) => setIsAnonymous(event.target.checked)}
              />
              Publicar como anônimo
            </label>

            {!isAnonymous &&
              (characters.length > 0 ? (
                <select value={characterId} onChange={(event) => setCharacterId(event.target.value)}>
                  <option value="">Selecione um personagem</option>
                  {characters.map((character) => (
                    <option key={character.id} value={character.id}>
                      {character.name}
                    </option>
                  ))}
                </select>
              ) : (
                <p className="quadrant-empty">
                  Você ainda não tem personagens. Crie um no seu <Link to="/perfil">perfil</Link> ou
                  marque como anônimo.
                </p>
              ))}

            <textarea
              placeholder="Ficou-se sabendo que..."
              value={commentContent}
              onChange={(event) => setCommentContent(event.target.value)}
              rows={3}
              required
            />
            <button
              type="submit"
              disabled={postingComment || (!isAnonymous && !characterId)}
            >
              {postingComment ? "Publicando..." : "Publicar rumor"}
            </button>
          </form>
        ) : (
          <p className="quadrant-empty">Faça login para adicionar rumores.</p>
        )}
      </section>
    </aside>
  );
}

export default QuadrantPanel;
