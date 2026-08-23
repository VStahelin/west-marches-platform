import { useEffect, useState } from "react";
import { API_URL, getMapBackground, uploadMapBackground } from "../lib/api.js";
import "./GridPage.css";

const ROWS = 20;
const COLS = 32;

function getStoredUser() {
  try {
    return JSON.parse(localStorage.getItem("user"));
  } catch {
    return null;
  }
}

function GridPage() {
  const [selectedCell, setSelectedCell] = useState(null);
  const [backgroundUrl, setBackgroundUrl] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");

  const user = getStoredUser();
  const isAdmin = user?.role === "admin";

  const cells = Array.from({ length: ROWS * COLS }, (_, index) => index);

  useEffect(() => {
    getMapBackground()
      .then((data) => setBackgroundUrl(data.url))
      .catch(() => {});
  }, []);

  async function handleUpload(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadError("");

    try {
      const token = localStorage.getItem("token");
      await uploadMapBackground(file, token);
      window.location.reload();
    } catch (err) {
      setUploadError(err.message);
      setUploading(false);
      event.target.value = "";
    }
  }

  return (
    <div className="grid-page">
      <header className="grid-header">
        <h1>Mapa Mundial</h1>
        <p>Selecione um quadrante para ver os rumores (em construção).</p>

        {isAdmin && (
          <div className="grid-admin-upload">
            <label htmlFor="background-upload">
              {uploading ? "Enviando..." : "Trocar imagem de fundo"}
            </label>
            <input
              id="background-upload"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={handleUpload}
              disabled={uploading}
            />
            {uploadError && <p className="grid-upload-error">{uploadError}</p>}
          </div>
        )}
      </header>

      <div
        className="grid-board"
        style={{
          gridTemplateColumns: `repeat(${COLS}, 1fr)`,
          gridTemplateRows: `repeat(${ROWS}, 1fr)`,
          backgroundImage: backgroundUrl ? `url(${API_URL}${backgroundUrl})` : undefined,
        }}
      >
        {cells.map((index) => (
          <button
            key={index}
            type="button"
            className={`grid-cell${selectedCell === index ? " grid-cell--selected" : ""}`}
            onClick={() => setSelectedCell(index)}
            aria-label={`Quadrante ${Math.floor(index / COLS)}, ${index % COLS}`}
          />
        ))}
      </div>

      {selectedCell !== null && (
        <div className="grid-info">
          Quadrante selecionado: {Math.floor(selectedCell / COLS)}, {selectedCell % COLS}
        </div>
      )}
    </div>
  );
}

export default GridPage;
