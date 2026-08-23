import { useCallback, useEffect, useState } from "react";
import DOMPurify from "dompurify";
import { marked } from "marked";
import { useNavigate, useParams } from "react-router-dom";
import {
  createWikiFolder,
  createWikiPage,
  deleteWikiFolder,
  deleteWikiPage,
  getWikiPage,
  getWikiTree,
  updateWikiPage,
} from "../lib/api.js";
import "./WikiPage.css";

function getStoredUser() {
  try {
    return JSON.parse(localStorage.getItem("user"));
  } catch {
    return null;
  }
}

function findNode(nodes, targetPath) {
  for (const node of nodes) {
    if (node.path === targetPath) return node;
    if (node.type === "folder") {
      const found = findNode(node.children, targetPath);
      if (found) return found;
    }
  }
  return null;
}

function parentPathOf(wikiPath) {
  const segments = wikiPath.split("/");
  segments.pop();
  return segments.join("/");
}

function Breadcrumb({ wikiPath, onNavigate }) {
  const segments = wikiPath.split("/").filter(Boolean);

  return (
    <nav className="wiki-breadcrumb" aria-label="Caminho na wiki">
      <button type="button" onClick={() => onNavigate("")}>
        Wiki
      </button>
      {segments.map((name, index) => {
        const path = segments.slice(0, index + 1).join("/");
        const isLast = index === segments.length - 1;
        return (
          <span key={path}>
            <span className="wiki-breadcrumb-sep">/</span>
            <button type="button" onClick={() => onNavigate(path)} disabled={isLast}>
              {name}
            </button>
          </span>
        );
      })}
    </nav>
  );
}

function AddChildForm({ onCreatePage, onCreateFolder, onCancel }) {
  const [kind, setKind] = useState("page");
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;

    setSubmitting(true);
    try {
      if (kind === "page") {
        await onCreatePage(trimmed);
      } else {
        await onCreateFolder(trimmed);
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="wiki-add-form" onSubmit={handleSubmit}>
      <div className="wiki-add-kind" role="radiogroup" aria-label="Tipo de item">
        <button type="button" className={kind === "page" ? "is-active" : ""} onClick={() => setKind("page")}>
          Página
        </button>
        <button type="button" className={kind === "folder" ? "is-active" : ""} onClick={() => setKind("folder")}>
          Pasta
        </button>
      </div>
      <input
        autoFocus
        type="text"
        value={name}
        placeholder={kind === "page" ? "Nome da página" : "Nome da pasta"}
        onChange={(event) => setName(event.target.value)}
      />
      <div className="wiki-add-form-actions">
        <button type="submit" disabled={submitting || !name.trim()}>
          Criar
        </button>
        <button type="button" className="wiki-secondary" onClick={onCancel}>
          Cancelar
        </button>
      </div>
    </form>
  );
}

function WikiTreeNode({ node, activePath, isAdmin, onSelect, onCreatePage, onCreateFolder, onDeleteNode }) {
  const [open, setOpen] = useState(true);
  const [adding, setAdding] = useState(false);
  const isFolder = node.type === "folder";
  const isActive = activePath === node.path;

  return (
    <li className="wiki-tree-item">
      <div className={`wiki-tree-row ${isActive ? "is-active" : ""}`}>
        {isFolder ? (
          <button
            type="button"
            className="wiki-tree-label wiki-tree-label--folder"
            onClick={() => setOpen((value) => !value)}
            title={node.name}
          >
            <span className="wiki-tree-caret">{open ? "▾" : "▸"}</span>
            <span className="wiki-tree-name">{node.name}</span>
          </button>
        ) : (
          <button type="button" className="wiki-tree-label" onClick={() => onSelect(node.path)} title={node.name}>
            <span className="wiki-tree-name">{node.name}</span>
          </button>
        )}

        {isAdmin && (
          <div className="wiki-row-actions">
            {isFolder && (
              <button
                type="button"
                className="wiki-icon-btn"
                onClick={() => setAdding((value) => !value)}
                title="Adicionar aqui"
              >
                +
              </button>
            )}
            <button
              type="button"
              className="wiki-icon-btn wiki-icon-btn--danger"
              onClick={() => onDeleteNode(node)}
              title={isFolder ? `Remover pasta ${node.name}` : `Remover página ${node.name}`}
            >
              ×
            </button>
          </div>
        )}
      </div>

      {adding && (
        <div className="wiki-add-form-wrap">
          <AddChildForm
            onCancel={() => setAdding(false)}
            onCreatePage={async (name) => {
              await onCreatePage(node.path, name);
              setAdding(false);
              setOpen(true);
            }}
            onCreateFolder={async (name) => {
              await onCreateFolder(node.path, name);
              setAdding(false);
              setOpen(true);
            }}
          />
        </div>
      )}

      {isFolder && open && node.children.length > 0 && (
        <ul className="wiki-tree-children">
          {node.children.map((child) => (
            <WikiTreeNode
              key={child.path}
              node={child}
              activePath={activePath}
              isAdmin={isAdmin}
              onSelect={onSelect}
              onCreatePage={onCreatePage}
              onCreateFolder={onCreateFolder}
              onDeleteNode={onDeleteNode}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

function WikiPage() {
  const { "*": rawSplat } = useParams();
  const selectedPath = rawSplat || "";
  const navigate = useNavigate();

  const user = getStoredUser();
  const token = localStorage.getItem("token");
  const isAdmin = Boolean(user?.isAdmin);

  const [tree, setTree] = useState([]);
  const [loadingTree, setLoadingTree] = useState(true);
  const [treeError, setTreeError] = useState("");
  const [addingRoot, setAddingRoot] = useState(false);

  const [page, setPage] = useState(null);
  const [loadingPage, setLoadingPage] = useState(false);

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  const refreshTree = useCallback(() => {
    return getWikiTree()
      .then(setTree)
      .catch((err) => setTreeError(err.message));
  }, []);

  useEffect(() => {
    setLoadingTree(true);
    refreshTree().finally(() => setLoadingTree(false));
  }, [refreshTree]);

  useEffect(() => {
    setEditing(false);
    setSaveError("");

    if (!selectedPath) {
      setPage(null);
      return;
    }

    setLoadingPage(true);
    getWikiPage(selectedPath)
      .then(setPage)
      .catch(() => setPage(null))
      .finally(() => setLoadingPage(false));
  }, [selectedPath]);

  function selectPath(path) {
    navigate(path ? `/wiki/${path}` : "/wiki");
  }

  async function handleCreatePage(parentPath, name) {
    setTreeError("");
    try {
      const created = await createWikiPage({ parentPath, name, content: "" }, token);
      await refreshTree();
      selectPath(created.path);
    } catch (err) {
      setTreeError(err.message);
    }
  }

  async function handleCreateFolder(parentPath, name) {
    setTreeError("");
    try {
      await createWikiFolder({ parentPath, name }, token);
      await refreshTree();
    } catch (err) {
      setTreeError(err.message);
    }
  }

  async function handleDeleteNode(node) {
    const confirmed = window.confirm(
      node.type === "folder"
        ? `Remover a pasta "${node.name}" e tudo dentro dela?`
        : `Remover a página "${node.name}"?`,
    );
    if (!confirmed) return;

    setTreeError("");
    try {
      if (node.type === "folder") {
        await deleteWikiFolder(node.path, token);
      } else {
        await deleteWikiPage(node.path, token);
      }
      await refreshTree();

      if (selectedPath === node.path || selectedPath.startsWith(`${node.path}/`)) {
        selectPath(parentPathOf(node.path));
      }
    } catch (err) {
      setTreeError(err.message);
    }
  }

  function startEditing() {
    setDraft(page.content);
    setSaveError("");
    setEditing(true);
  }

  async function handleSave() {
    setSaving(true);
    setSaveError("");
    try {
      const updated = await updateWikiPage(selectedPath, draft, token);
      setPage(updated);
      setEditing(false);
    } catch (err) {
      setSaveError(err.message);
    } finally {
      setSaving(false);
    }
  }

  const selectedNode = selectedPath ? findNode(tree, selectedPath) : null;
  const pageHtml = page ? DOMPurify.sanitize(marked.parse(page.content || "_Página vazia._")) : "";

  return (
    <div className="wiki-page">
      <aside className="wiki-sidebar">
        <div className="wiki-sidebar-header">
          <h2>Wiki</h2>
          {isAdmin && (
            <button
              type="button"
              className="wiki-icon-btn wiki-icon-btn--static"
              onClick={() => setAddingRoot((value) => !value)}
              title="Adicionar"
            >
              +
            </button>
          )}
        </div>

        {addingRoot && (
          <div className="wiki-add-form-wrap">
            <AddChildForm
              onCancel={() => setAddingRoot(false)}
              onCreatePage={async (name) => {
                await handleCreatePage("", name);
                setAddingRoot(false);
              }}
              onCreateFolder={async (name) => {
                await handleCreateFolder("", name);
                setAddingRoot(false);
              }}
            />
          </div>
        )}

        {treeError && <p className="wiki-error">{treeError}</p>}
        {loadingTree && <p className="wiki-empty">Carregando...</p>}
        {!loadingTree && tree.length === 0 && (
          <p className="wiki-empty">
            A wiki ainda está vazia.
            {isAdmin && " Use o + acima para criar a primeira página ou pasta."}
          </p>
        )}

        <ul className="wiki-tree">
          {tree.map((node) => (
            <WikiTreeNode
              key={node.path}
              node={node}
              activePath={selectedPath}
              isAdmin={isAdmin}
              onSelect={selectPath}
              onCreatePage={handleCreatePage}
              onCreateFolder={handleCreateFolder}
              onDeleteNode={handleDeleteNode}
            />
          ))}
        </ul>
      </aside>

      <main className="wiki-content">
        {!selectedPath && (
          <div className="wiki-welcome">
            <h1>Wiki</h1>
            <p>Regras do jogo, personagens/NPCs conhecidos e quests em aberto, escritos em markdown.</p>
            <p className="wiki-empty">Selecione uma página na barra lateral para começar.</p>
          </div>
        )}

        {selectedPath && (
          <div className="wiki-content-toolbar">
            <Breadcrumb wikiPath={selectedPath} onNavigate={selectPath} />

            {isAdmin && !loadingPage && page && !editing && (
              <div className="wiki-row-actions wiki-row-actions--static">
                <button type="button" className="wiki-icon-btn" onClick={startEditing} title="Editar página">
                  ✎
                </button>
                <button
                  type="button"
                  className="wiki-icon-btn wiki-icon-btn--danger"
                  onClick={() => handleDeleteNode(selectedNode ?? { path: selectedPath, name: page.name, type: "file" })}
                  title="Remover página"
                >
                  ×
                </button>
              </div>
            )}

            {isAdmin && !loadingPage && !page && selectedNode?.type === "folder" && (
              <div className="wiki-row-actions wiki-row-actions--static">
                <button
                  type="button"
                  className="wiki-icon-btn wiki-icon-btn--danger"
                  onClick={() => handleDeleteNode(selectedNode)}
                  title="Remover pasta"
                >
                  ×
                </button>
              </div>
            )}
          </div>
        )}

        {selectedPath && loadingPage && <p className="wiki-empty">Carregando...</p>}

        {selectedPath && !loadingPage && page && (
          editing ? (
            <>
              <textarea value={draft} onChange={(event) => setDraft(event.target.value)} rows={18} />
              {saveError && <p className="wiki-error">{saveError}</p>}
              <div className="wiki-actions">
                <button type="button" onClick={handleSave} disabled={saving}>
                  {saving ? "Salvando..." : "Salvar"}
                </button>
                <button
                  type="button"
                  className="wiki-secondary"
                  onClick={() => setEditing(false)}
                  disabled={saving}
                >
                  Cancelar
                </button>
              </div>
            </>
          ) : (
            <div className="wiki-markdown" dangerouslySetInnerHTML={{ __html: pageHtml }} />
          )
        )}

        {selectedPath && !loadingPage && !page && selectedNode?.type === "folder" && (
          selectedNode.children.length === 0 ? (
            <p className="wiki-empty">Essa pasta ainda não tem páginas.</p>
          ) : (
            <ul className="wiki-folder-list">
              {selectedNode.children.map((child) => (
                <li key={child.path}>
                  <button type="button" onClick={() => selectPath(child.path)}>
                    {child.type === "folder" && <span className="wiki-folder-list-badge">Pasta</span>}
                    {child.name}
                  </button>
                </li>
              ))}
            </ul>
          )
        )}

        {selectedPath && !loadingPage && !page && !selectedNode && (
          <p className="wiki-empty">Página não encontrada.</p>
        )}
      </main>
    </div>
  );
}

export default WikiPage;
