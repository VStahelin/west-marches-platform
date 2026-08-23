import "./PinPalette.css";

const PIN_ICONS = [
  { icon: "💀", label: "Death point" },
  { icon: "💰", label: "Loot" },
  { icon: "❗", label: "Missão" },
  { icon: "🏰", label: "Cidade" },
  { icon: "⚔️", label: "Combate" },
  { icon: "📍", label: "Marcador" },
];

function PinPalette() {
  return (
    <div className="pin-palette">
      <span className="pin-palette-label">Arraste um ícone para o mapa</span>
      <div className="pin-palette-icons">
        {PIN_ICONS.map(({ icon, label }) => (
          <span
            key={icon}
            className="pin-palette-icon"
            draggable
            title={label}
            onDragStart={(event) => {
              event.dataTransfer.setData("application/x-new-pin", icon);
              event.dataTransfer.effectAllowed = "copy";
            }}
          >
            {icon}
          </span>
        ))}
      </div>
    </div>
  );
}

export default PinPalette;
