import { useState, useRef, useCallback, useEffect } from 'react';

function hslToHex(h, s, l) {
  s /= 100;
  l /= 100;
  const a = s * Math.min(l, 1 - l);
  const f = (n) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

function hexToHsl(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return { h: 200, s: 75, l: 65 };
  let r = parseInt(result[1], 16) / 255;
  let g = parseInt(result[2], 16) / 255;
  let b = parseInt(result[3], 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
    else if (max === g) h = ((b - r) / d + 2) / 6;
    else h = ((r - g) / d + 4) / 6;
  }
  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}

function drawWheel(canvas, lightness) {
  const ctx = canvas.getContext('2d');
  const size = canvas.width;
  const cx = size / 2;
  const cy = size / 2;
  const outerR = size / 2 - 2;
  const innerR = outerR * 0.55;

  ctx.clearRect(0, 0, size, size);

  for (let angle = 0; angle < 360; angle += 1) {
    const startRad = ((angle - 1) * Math.PI) / 180;
    const endRad = ((angle + 1) * Math.PI) / 180;
    ctx.beginPath();
    ctx.arc(cx, cy, outerR, startRad, endRad);
    ctx.arc(cx, cy, innerR, endRad, startRad, true);
    ctx.closePath();
    ctx.fillStyle = `hsl(${angle}, 100%, ${lightness}%)`;
    ctx.fill();
  }
}

export default function ColorWheel({ value = '#75cff5', onChange, label }) {
  const [hsl, setHsl] = useState(() => hexToHsl(value));
  const [inputHex, setInputHex] = useState(value);
  const wheelRef = useRef(null);
  const dragging = useRef(false);

  useEffect(() => {
    const parsed = hexToHsl(value);
    setHsl(parsed);
    setInputHex(value);
  }, [value]);

  useEffect(() => {
    if (wheelRef.current) drawWheel(wheelRef.current, hsl.l);
  }, [hsl.l]);

  const updateFromWheel = useCallback((e) => {
    const canvas = wheelRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const cx = rect.width / 2;
    const cy = rect.height / 2;
    const angle = Math.atan2(y - cy, x - cx);
    const hue = ((angle * 180) / Math.PI + 360 + 90) % 360;
    const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
    const outerR = rect.width / 2 - 2;
    const innerR = outerR * 0.55;
    if (dist < innerR || dist > outerR) return;
    const newHsl = { h: Math.round(hue), s: hsl.s, l: hsl.l };
    setHsl(newHsl);
    const hex = hslToHex(newHsl.h, newHsl.s, newHsl.l);
    setInputHex(hex);
    onChange(hex);
  }, [hsl.s, hsl.l, onChange]);

  const handleMouseDown = (e) => {
    dragging.current = true;
    updateFromWheel(e);
  };

  useEffect(() => {
    const handleMouseMove = (e) => { if (dragging.current) updateFromWheel(e); };
    const handleMouseUp = () => { dragging.current = false; };
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [updateFromWheel]);

  const currentHex = hslToHex(hsl.h, hsl.s, hsl.l);
  const wheelR = 70;
  const innerR = wheelR * 0.55;
  const selectorAngle = (hsl.h - 90) * Math.PI / 180;
  const selectorDist = innerR + (outerR - innerR) * 0.5;
  const outerR2 = wheelR - 2;

  const PRESETS = [
    '#75cff5', '#57f287', '#fee75c', '#eb459e', '#ed4245',
    '#ffffff', '#f47fff', '#5865f2', '#ff9b2b', '#45ddc0',
  ];

  return (
    <div className="flex flex-col gap-2">
      {label && <span className="text-xs font-medium text-dark-400 uppercase tracking-wider">{label}</span>}
      <div className="flex gap-3 items-start">
        <div className="relative flex-shrink-0" style={{ width: 140, height: 140 }}>
          <canvas
            ref={wheelRef}
            width={140}
            height={140}
            onMouseDown={handleMouseDown}
            className="rounded-full cursor-crosshair"
            style={{ touchAction: 'none' }}
          />
          <div
            className="absolute w-3.5 h-3.5 rounded-full border-2 border-white pointer-events-none"
            style={{
              left: `${Math.cos(selectorAngle) * selectorDist + wheelR}px`,
              top: `${Math.sin(selectorAngle) * selectorDist + wheelR}px`,
              transform: 'translate(-50%, -50%)',
              backgroundColor: currentHex,
              boxShadow: '0 1px 4px rgba(0,0,0,0.5)',
            }}
          />
        </div>
        <div className="flex-1 space-y-2 min-w-0">
          <div className="flex gap-2 items-center">
            <div className="w-8 h-8 rounded-lg flex-shrink-0 border border-dark-700/50" style={{ backgroundColor: currentHex }} />
            <input
              type="text"
              value={inputHex}
              onChange={(e) => {
                let v = e.target.value;
                if (!v.startsWith('#')) v = '#' + v;
                setInputHex(v);
                if (/^#[0-9a-fA-F]{6}$/.test(v)) {
                  setHsl(hexToHsl(v));
                  onChange(v);
                }
              }}
              className="input-dark text-xs font-mono flex-1 min-w-0"
              placeholder="#75cff5"
            />
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-dark-500 w-4">H</span>
              <input type="range" min="0" max="360" value={hsl.h}
                onChange={(e) => { const n = { ...hsl, h: parseInt(e.target.value) }; setHsl(n); const hex = hslToHex(n.h, n.s, n.l); setInputHex(hex); onChange(hex); }}
                className="flex-1 h-2 rounded-full appearance-none cursor-pointer"
                style={{ background: `linear-gradient(to right, hsl(0,${hsl.s}%,${hsl.l}%), hsl(60,${hsl.s}%,${hsl.l}%), hsl(120,${hsl.s}%,${hsl.l}%), hsl(180,${hsl.s}%,${hsl.l}%), hsl(240,${hsl.s}%,${hsl.l}%), hsl(300,${hsl.s}%,${hsl.l}%), hsl(360,${hsl.s}%,${hsl.l}%))` }}
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-dark-500 w-4">S</span>
              <input type="range" min="0" max="100" value={hsl.s}
                onChange={(e) => { const n = { ...hsl, s: parseInt(e.target.value) }; setHsl(n); const hex = hslToHex(n.h, n.s, n.l); setInputHex(hex); onChange(hex); }}
                className="flex-1 h-2 rounded-full appearance-none cursor-pointer"
                style={{ background: `linear-gradient(to right, hsl(${hsl.h},0%,${hsl.l}%), hsl(${hsl.h},100%,${hsl.l}%))` }}
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-dark-500 w-4">L</span>
              <input type="range" min="0" max="100" value={hsl.l}
                onChange={(e) => { const n = { ...hsl, l: parseInt(e.target.value) }; setHsl(n); const hex = hslToHex(n.h, n.s, n.l); setInputHex(hex); onChange(hex); }}
                className="flex-1 h-2 rounded-full appearance-none cursor-pointer"
                style={{ background: `linear-gradient(to right, hsl(${hsl.h},${hsl.s}%,0%), hsl(${hsl.h},${hsl.s}%,50%), hsl(${hsl.h},${hsl.s}%,100%))` }}
              />
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5 pt-1">
            {PRESETS.map((preset) => (
              <button key={preset} onClick={() => { setHsl(hexToHsl(preset)); setInputHex(preset); onChange(preset); }}
                className="w-5 h-5 rounded-md border border-dark-700/50 hover:scale-110 transition-transform"
                style={{ backgroundColor: preset }} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
