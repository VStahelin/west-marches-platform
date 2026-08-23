import { useEffect, useState } from "react";
import QuadrantPanel from "../components/QuadrantPanel.jsx";
import { API_URL, getMapBackground } from "../lib/api.js";
import "./GridPage.css";

const ROWS = 20;
const COLS = 32;

function GridPage() {
  const [selectedCell, setSelectedCell] = useState(null);
  const [backgroundUrl, setBackgroundUrl] = useState(null);

  const cells = Array.from({ length: ROWS * COLS }, (_, index) => index);
  const selectedRow = selectedCell !== null ? Math.floor(selectedCell / COLS) : null;
  const selectedCol = selectedCell !== null ? selectedCell % COLS : null;

  useEffect(() => {
    getMapBackground()
      .then((data) => setBackgroundUrl(data.url))
      .catch(() => {});
  }, []);

  return (
    <div className="grid-page">
      <header className="grid-header">
        <h1>Mapa Mundial</h1>
        <p>Selecione um quadrante para ver os rumores (em construção).</p>
      </header>

      <div className="grid-layout">
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
              onClick={() => setSelectedCell((prev) => (prev === index ? null : index))}
              aria-label={`Quadrante ${Math.floor(index / COLS)}, ${index % COLS}`}
            />
          ))}
        </div>

        {selectedCell !== null && (
          <QuadrantPanel row={selectedRow} col={selectedCol} onClose={() => setSelectedCell(null)} />
        )}
      </div>
    </div>
  );
}

export default GridPage;
