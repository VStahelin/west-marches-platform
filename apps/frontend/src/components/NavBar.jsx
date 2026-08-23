import { NavLink, useNavigate } from "react-router-dom";
import "./NavBar.css";

function getStoredUser() {
  try {
    return JSON.parse(localStorage.getItem("user"));
  } catch {
    return null;
  }
}

function NavBar() {
  const navigate = useNavigate();
  const user = getStoredUser();

  function handleLogout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/");
  }

  return (
    <nav className="navbar">
      <span className="navbar-brand">West Marches</span>

      <div className="navbar-links">
        <NavLink to="/mapa" className={({ isActive }) => (isActive ? "navbar-link active" : "navbar-link")}>
          Mapa
        </NavLink>
        <NavLink to="/perfil" className={({ isActive }) => (isActive ? "navbar-link active" : "navbar-link")}>
          Meu Perfil
        </NavLink>
        {user?.isAdmin && (
          <NavLink to="/config" className={({ isActive }) => (isActive ? "navbar-link active" : "navbar-link")}>
            Configurações
          </NavLink>
        )}
      </div>

      {user && (
        <div className="navbar-user">
          <span>{user.username}</span>
          <button type="button" onClick={handleLogout}>
            Sair
          </button>
        </div>
      )}
    </nav>
  );
}

export default NavBar;
