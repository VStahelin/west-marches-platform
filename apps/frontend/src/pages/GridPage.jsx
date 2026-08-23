import { useEffect, useRef, useState } from "react";
import PinPalette from "../components/PinPalette.jsx";
import QuadrantPanel from "../components/QuadrantPanel.jsx";
import {
  API_URL,
  createMapPin,
  deleteMapPin,
  getMapBackground,
  getMapPins,
  updateMapPin,
} from "../lib/api.js";
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

function clampPercent(value) {
  return Math.min(100, Math.max(0, value));
}

function GridPage() {
  const boardRef = useRef(null);
  const [selectedCell, setSelectedCell] = useState(null);
  const [backgroundUrl, setBackgroundUrl] = useState(null);

  const [pins, setPins] = useState([]);
  const [selectedPinId, setSelectedPinId] = useState(null);
  const [pinLabelDraft, setPinLabelDraft] = useState("");
  const [pinError, setPinError] = useState("");

  const user = getStoredUser();
  const token = localStorage.getItem("token");

  const cells = Array.from({ length: ROWS * COLS }, (_, index) => index);
  const selectedRow = selectedCell !== null ? Math.floor(selectedCell / COLS) : null;
  const selectedCol = selectedCell !== null ? selectedCell % COLS : null;

  useEffect(() => {
    getMapBackground()
      .then((data) => setBackgroundUrl(data.url))
      .catch(() => {});

    getMapPins(token)
      .then(setPins)
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function getRelativePosition(event) {
    const rect = boardRef.current.getBoundingClientRect();
    return {
      x: clampPercent(((event.clientX - rect.left) / rect.width) * 100),
      y: clampPercent(((event.clientY - rect.top) / rect.height) * 100),
    };
  }

  function handleDragOver(event) {
    event.preventDefault();
  }

  async function handleDrop(event) {
    event.preventDefault();
    const newIcon = event.dataTransfer.getData("application/x-new-pin");
    const movedPinId = event.dataTransfer.getData("application/x-move-pin");

    if (!newIcon && !movedPinId) return;

    const { x, y } = getRelativePosition(event);
    setPinError("");

    try {
      if (newIcon) {
        const pin = await createMapPin({ x, y, icon: newIcon }, token);
        setPins((prev) => [...prev, pin]);
      } else {
        const pin = await updateMapPin(movedPinId, { x, y }, token);
        setPins((prev) => prev.map((p) => (p.id === pin.id ? pin : p)));
      }
    } catch (err) {
      setPinError(err.message);
    }
  }

  function handlePinDragStart(event, pin) {
    event.stopPropagation();
    event.dataTransfer.setData("application/x-move-pin", String(pin.id));
    event.dataTransfer.effectAllowed = "move";
  }

  function togglePin(pin) {
    setPinLabelDraft(pin.label ?? "");
    setPinError("");
    setSelectedPinId((prev) => (prev === pin.id ? null : pin.id));
  }

  async function handleSavePinLabel(pin) {
    try {
      const updated = await updateMapPin(pin.id, { label: pinLabelDraft }, token);
      setPins((prev) => prev.map((p) => (p.id === pin.id ? updated : p)));
      setSelectedPinId(null);
    } catch (err) {
      setPinError(err.message);
    }
  }

  async function handleDeletePin(pin) {
    try {
      await deleteMapPin(pin.id, token);
      setPins((prev) => prev.filter((p) => p.id !== pin.id));
      setSelectedPinId(null);
    } catch (err) {
      setPinError(err.message);
    }
  }

  return (
    <div className="grid-page">
      <header className="grid-header">
        <h1>Mapa Mundial</h1>
        <p>Selecione um quadrante para ver os rumores (em construção).</p>
      </header>

      {user && <PinPalette />}
      {pinError && <p className="grid-pin-error">{pinError}</p>}

      <div className="grid-layout">
        <div
          ref={boardRef}
          className="grid-board"
          style={{
            gridTemplateColumns: `repeat(${COLS}, 1fr)`,
            gridTemplateRows: `repeat(${ROWS}, 1fr)`,
            backgroundImage: backgroundUrl ? `url(${API_URL}${backgroundUrl})` : undefined,
          }}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
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

          <div className="pin-layer">
            {pins.map((pin) => (
              <div
                key={pin.id}
                className="map-pin-wrapper"
                style={{ left: `${pin.x}%`, top: `${pin.y}%` }}
              >
                <button
                  type="button"
                  className="map-pin"
                  draggable={pin.canModify}
                  onDragStart={(event) => handlePinDragStart(event, pin)}
                  onClick={(event) => {
                    event.stopPropagation();
                    togglePin(pin);
                  }}
                  title={pin.label || undefined}
                >
                  {pin.icon}
                </button>

                {selectedPinId === pin.id && (
                  <div className="map-pin-popover" onClick={(event) => event.stopPropagation()}>
                    {pin.canModify ? (
                      <>
                        <input
                          type="text"
                          value={pinLabelDraft}
                          placeholder="Descrição do pin"
                          onChange={(event) => setPinLabelDraft(event.target.value)}
                        />
                        <div className="map-pin-popover-actions">
                          <button type="button" onClick={() => handleSavePinLabel(pin)}>
                            Salvar
                          </button>
                          <button
                            type="button"
                            className="map-pin-popover-danger"
                            onClick={() => handleDeletePin(pin)}
                          >
                            Remover
                          </button>
                        </div>
                      </>
                    ) : (
                      <p>{pin.label || "Sem descrição"}</p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {selectedCell !== null && (
          <QuadrantPanel row={selectedRow} col={selectedCol} onClose={() => setSelectedCell(null)} />
        )}
      </div>
    </div>
  );
}

export default GridPage;
