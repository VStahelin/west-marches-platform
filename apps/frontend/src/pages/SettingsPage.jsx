import { useState } from "react";
import { uploadMapBackground } from "../lib/api.js";
import "./SettingsPage.css";

function getStoredUser() {
  try {
    return JSON.parse(localStorage.getItem("user"));
  } catch {
    return null;
  }
}

function SettingsPage() {
  const user = getStoredUser();
  const token = localStorage.getItem("token");

  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");

  async function handleUpload(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadError("");

    try {
      await uploadMapBackground(file, token);
      window.location.reload();
    } catch (err) {
      setUploadError(err.message);
      setUploading(false);
      event.target.value = "";
    }
  }

  if (!user?.isAdmin) {
    return (
      <div className="settings-page">
        <p>Só administradores podem acessar as configurações.</p>
      </div>
    );
  }

  return (
    <div className="settings-page">
      <header className="settings-header">
        <h1>Configurações</h1>
        <p>Ajustes administrativos da plataforma.</p>
      </header>

      <section className="settings-section">
        <h2>Mapa Mundial</h2>
        <p className="settings-description">
          Troca a imagem de fundo usada no grid do mapa mundial.
        </p>

        <label className="settings-upload" htmlFor="background-upload">
          {uploading ? "Enviando..." : "Trocar imagem de fundo"}
        </label>
        <input
          id="background-upload"
          type="file"
          accept="image/png,image/jpeg,image/webp"
          onChange={handleUpload}
          disabled={uploading}
        />
        {uploadError && <p className="settings-error">{uploadError}</p>}
      </section>
    </div>
  );
}

export default SettingsPage;
