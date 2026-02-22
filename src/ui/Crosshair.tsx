import './Crosshair.css';

export function Crosshair() {
  return (
    <div className="crosshair">
      <div className="crosshair-line crosshair-horizontal" />
      <div className="crosshair-line crosshair-vertical" />
      <div className="crosshair-dot" />
    </div>
  );
}

