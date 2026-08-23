import { NavLink, useNavigate } from "react-router-dom";
import "./NavBar.css";

const NAV_LINKS = [
  { to: "/mapa", label: "Mapa", icon: "🗺️" },
  { to: "/wiki", label: "Wiki", icon: "📖" },
  { to: "/perfil", label: "Meu Perfil", icon: "👤" },
];

const ADMIN_LINK = { to: "/config", label: "Configurações", icon: "⚙️" };

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
  const links = user?.isAdmin ? [...NAV_LINKS, ADMIN_LINK] : NAV_LINKS;

  function handleLogout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/");
  }

  return (
    <nav className="navbar">
      <NavLink to="/mapa" className="navbar-brand">
        <span className="navbar-brand-icon" aria-hidden="true">
          🧭
        </span>
        <span className="navbar-brand-text">West Marches</span>
      </NavLink>

      <div className="navbar-links">
        {links.map(({ to, label, icon }) => (
          <NavLink key={to} to={to} className={({ isActive }) => (isActive ? "navbar-link active" : "navbar-link")}>
            <span className="navbar-link-icon" aria-hidden="true">
              {icon}
            </span>
            <span className="navbar-link-text">{label}</span>
          </NavLink>
        ))}
      </div>

      {user && (
        <div className="navbar-user">
          <div className="navbar-user-info">
            <span className="navbar-username">{user.username}</span>
            {user.isAdmin && <span className="navbar-badge">Admin</span>}
          </div>
          <button type="button" className="navbar-logout" onClick={handleLogout} title="Sair">
            Sair
          </button>
        </div>
      )}
    </nav>
  );
}

export default NavBar;
