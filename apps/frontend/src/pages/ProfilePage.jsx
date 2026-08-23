import { useEffect, useState } from "react";
import {
  createCharacter,
  createUser,
  deleteCharacter,
  deleteUser,
  getCharacters,
  getUsers,
  updateCharacter,
  updateUser,
} from "../lib/api.js";
import "./ProfilePage.css";

const EMPTY_FORM = { name: "", race: "", class: "", level: 1 };
const EMPTY_USER_FORM = { username: "", password: "", isAdmin: false };

function getStoredUser() {
  try {
    return JSON.parse(localStorage.getItem("user"));
  } catch {
    return null;
  }
}

function ProfilePage() {
  const user = getStoredUser();
  const token = localStorage.getItem("token");

  const [characters, setCharacters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(EMPTY_FORM);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editingForm, setEditingForm] = useState(EMPTY_FORM);

  const isAdmin = Boolean(user?.isAdmin);
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [userForm, setUserForm] = useState(EMPTY_USER_FORM);
  const [creatingUser, setCreatingUser] = useState(false);
  const [userError, setUserError] = useState("");
  const [editingUserId, setEditingUserId] = useState(null);
  const [editingUserForm, setEditingUserForm] = useState(EMPTY_USER_FORM);

  useEffect(() => {
    if (!user) return;

    getCharacters(token)
      .then(setCharacters)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [user, token]);

  useEffect(() => {
    if (!isAdmin) return;

    getUsers(token)
      .then(setUsers)
      .catch((err) => setUserError(err.message))
      .finally(() => setLoadingUsers(false));
  }, [isAdmin, token]);

  async function handleCreateUser(event) {
    event.preventDefault();
    if (!userForm.username.trim() || !userForm.password) return;

    setCreatingUser(true);
    setUserError("");

    try {
      const created = await createUser(userForm, token);
      setUsers((prev) => [...prev, created]);
      setUserForm(EMPTY_USER_FORM);
    } catch (err) {
      setUserError(err.message);
    } finally {
      setCreatingUser(false);
    }
  }

  function startEditingUser(target) {
    setEditingUserId(target.id);
    setEditingUserForm({ username: target.username, password: "", isAdmin: target.is_admin });
    setUserError("");
  }

  async function handleSaveUserEdit(id) {
    setUserError("");

    try {
      const updated = await updateUser(id, editingUserForm, token);
      setUsers((prev) => prev.map((u) => (u.id === id ? updated : u)));
      setEditingUserId(null);
    } catch (err) {
      setUserError(err.message);
    }
  }

  async function handleDeleteUser(id) {
    setUserError("");

    try {
      await deleteUser(id, token);
      setUsers((prev) => prev.filter((u) => u.id !== id));
    } catch (err) {
      setUserError(err.message);
    }
  }

  async function handleCreate(event) {
    event.preventDefault();
    if (!form.name.trim()) return;

    setCreating(true);
    setError("");

    try {
      const character = await createCharacter(form, token);
      setCharacters((prev) => [...prev, character]);
      setForm(EMPTY_FORM);
    } catch (err) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  }

  function startEditing(character) {
    setEditingId(character.id);
    setEditingForm({
      name: character.name,
      race: character.race ?? "",
      class: character.class ?? "",
      level: character.level,
    });
    setError("");
  }

  async function handleSaveEdit(id) {
    try {
      const updated = await updateCharacter(id, editingForm, token);
      setCharacters((prev) => prev.map((character) => (character.id === id ? updated : character)));
      setEditingId(null);
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDelete(id) {
    try {
      await deleteCharacter(id, token);
      setCharacters((prev) => prev.filter((character) => character.id !== id));
    } catch (err) {
      setError(err.message);
    }
  }

  if (!user) {
    return (
      <div className="profile-page">
        <p>Faça login para gerenciar seus personagens.</p>
      </div>
    );
  }

  return (
    <div className="profile-page">
      <header className="profile-header">
        <h1>Meu Perfil</h1>
        <p>
          Logado como <strong>{user.username}</strong> (Player{user.isAdmin ? " + Admin" : ""})
        </p>
      </header>

      <section className="profile-characters">
        <h2>Meus Personagens</h2>

        {loading && <p className="profile-empty">Carregando...</p>}
        {!loading && characters.length === 0 && (
          <p className="profile-empty">Você ainda não criou nenhum personagem.</p>
        )}

        <ul className="character-list">
          {characters.map((character) => (
            <li key={character.id} className="character-card">
              {editingId === character.id ? (
                <div className="character-form">
                  <input
                    type="text"
                    placeholder="Nome"
                    value={editingForm.name}
                    onChange={(event) =>
                      setEditingForm((prev) => ({ ...prev, name: event.target.value }))
                    }
                  />
                  <input
                    type="text"
                    placeholder="Raça"
                    value={editingForm.race}
                    onChange={(event) =>
                      setEditingForm((prev) => ({ ...prev, race: event.target.value }))
                    }
                  />
                  <input
                    type="text"
                    placeholder="Classe"
                    value={editingForm.class}
                    onChange={(event) =>
                      setEditingForm((prev) => ({ ...prev, class: event.target.value }))
                    }
                  />
                  <input
                    type="number"
                    min="1"
                    placeholder="Nível"
                    value={editingForm.level}
                    onChange={(event) =>
                      setEditingForm((prev) => ({ ...prev, level: event.target.value }))
                    }
                  />
                  <div className="character-actions">
                    <button type="button" onClick={() => handleSaveEdit(character.id)}>
                      Salvar
                    </button>
                    <button
                      type="button"
                      className="character-secondary"
                      onClick={() => setEditingId(null)}
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="character-info">
                    <strong>{character.name}</strong>
                    <span>
                      {[character.race, character.class].filter(Boolean).join(" · ") || "Sem raça/classe definida"}
                      {" — "}
                      Nível {character.level}
                    </span>
                  </div>
                  <div className="character-actions">
                    <button
                      type="button"
                      className="character-secondary"
                      onClick={() => startEditing(character)}
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      className="character-danger"
                      onClick={() => handleDelete(character.id)}
                    >
                      Remover
                    </button>
                  </div>
                </>
              )}
            </li>
          ))}
        </ul>

        {error && <p className="profile-error">{error}</p>}

        <form className="character-form character-form--new" onSubmit={handleCreate}>
          <h3>Criar novo personagem</h3>
          <input
            type="text"
            placeholder="Nome"
            value={form.name}
            onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
            required
          />
          <input
            type="text"
            placeholder="Raça (ex: Anão, Elfo...)"
            value={form.race}
            onChange={(event) => setForm((prev) => ({ ...prev, race: event.target.value }))}
          />
          <input
            type="text"
            placeholder="Classe (ex: Guerreiro, Mago...)"
            value={form.class}
            onChange={(event) => setForm((prev) => ({ ...prev, class: event.target.value }))}
          />
          <input
            type="number"
            min="1"
            placeholder="Nível"
            value={form.level}
            onChange={(event) => setForm((prev) => ({ ...prev, level: event.target.value }))}
          />
          <button type="submit" disabled={creating}>
            {creating ? "Criando..." : "Criar personagem"}
          </button>
        </form>
      </section>

      {isAdmin && (
        <section className="profile-users">
          <h2>Usuários</h2>

          {loadingUsers && <p className="profile-empty">Carregando...</p>}
          {!loadingUsers && users.length === 0 && (
            <p className="profile-empty">Nenhum usuário cadastrado ainda.</p>
          )}

          <ul className="character-list">
            {users.map((u) => (
              <li key={u.id} className="character-card">
                {editingUserId === u.id ? (
                  <div className="character-form">
                    <input
                      type="text"
                      placeholder="Usuário"
                      value={editingUserForm.username}
                      onChange={(event) =>
                        setEditingUserForm((prev) => ({ ...prev, username: event.target.value }))
                      }
                    />
                    <input
                      type="password"
                      placeholder="Nova senha (deixe em branco para manter)"
                      value={editingUserForm.password}
                      onChange={(event) =>
                        setEditingUserForm((prev) => ({ ...prev, password: event.target.value }))
                      }
                    />
                    <label className="profile-checkbox">
                      <input
                        type="checkbox"
                        checked={editingUserForm.isAdmin}
                        onChange={(event) =>
                          setEditingUserForm((prev) => ({ ...prev, isAdmin: event.target.checked }))
                        }
                      />
                      Também é admin
                    </label>
                    <div className="character-actions">
                      <button type="button" onClick={() => handleSaveUserEdit(u.id)}>
                        Salvar
                      </button>
                      <button
                        type="button"
                        className="character-secondary"
                        onClick={() => setEditingUserId(null)}
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="character-info">
                      <strong>{u.username}</strong>
                      <span>Player{u.is_admin ? " + Admin" : ""}</span>
                    </div>
                    <div className="character-actions">
                      <button
                        type="button"
                        className="character-secondary"
                        onClick={() => startEditingUser(u)}
                      >
                        Editar
                      </button>
                      {u.username !== user.username && (
                        <button
                          type="button"
                          className="character-danger"
                          onClick={() => handleDeleteUser(u.id)}
                        >
                          Remover
                        </button>
                      )}
                    </div>
                  </>
                )}
              </li>
            ))}
          </ul>

          {userError && <p className="profile-error">{userError}</p>}

          <form className="character-form character-form--new" onSubmit={handleCreateUser}>
            <h3>Criar novo usuário</h3>
            <input
              type="text"
              placeholder="Usuário"
              value={userForm.username}
              onChange={(event) => setUserForm((prev) => ({ ...prev, username: event.target.value }))}
              required
            />
            <input
              type="password"
              placeholder="Senha (mínimo 4 caracteres)"
              value={userForm.password}
              onChange={(event) => setUserForm((prev) => ({ ...prev, password: event.target.value }))}
              required
            />
            <label className="profile-checkbox">
              <input
                type="checkbox"
                checked={userForm.isAdmin}
                onChange={(event) =>
                  setUserForm((prev) => ({ ...prev, isAdmin: event.target.checked }))
                }
              />
              Também é admin
            </label>
            <button type="submit" disabled={creatingUser}>
              {creatingUser ? "Criando..." : "Criar usuário"}
            </button>
          </form>
        </section>
      )}
    </div>
  );
}

export default ProfilePage;
