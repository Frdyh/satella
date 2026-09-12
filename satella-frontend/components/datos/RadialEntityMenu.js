'use client';

import { useState } from 'react';
import { ENTITY_ICONS } from './entityIcons';

const TAU = Math.PI / 180;

function polar(cx, cy, r, deg) {
  const rad = deg * TAU;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function sectorPath(cx, cy, rOuter, rInner, startDeg, endDeg) {
  const p1 = polar(cx, cy, rOuter, startDeg);
  const p2 = polar(cx, cy, rOuter, endDeg);
  const p3 = polar(cx, cy, rInner, endDeg);
  const p4 = polar(cx, cy, rInner, startDeg);
  const largeArc = endDeg - startDeg > 180 ? 1 : 0;
  return [
    `M ${p1.x.toFixed(2)} ${p1.y.toFixed(2)}`,
    `A ${rOuter} ${rOuter} 0 ${largeArc} 1 ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`,
    `L ${p3.x.toFixed(2)} ${p3.y.toFixed(2)}`,
    `A ${rInner} ${rInner} 0 ${largeArc} 0 ${p4.x.toFixed(2)} ${p4.y.toFixed(2)}`,
    'Z',
  ].join(' ');
}

const CX = 150;
const CY = 150;
const R_OUTER = 140;
const R_INNER = 56;
const GAP_DEG = 3;

export default function RadialEntityMenu({ entities, counts, activeKey, onSelect, size = 380 }) {
  const [hoverKey, setHoverKey] = useState(null);

  const anglePer = 360 / entities.length;
  const displayKey = hoverKey || activeKey;
  const displayEntity = entities.find((e) => e.key === displayKey);

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg viewBox="0 0 300 300" className="w-full h-full overflow-visible">
        <defs>
          <radialGradient id="wheelGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.32" />
            <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
          </radialGradient>
        </defs>

        <circle cx={CX} cy={CY} r={R_OUTER + 12} fill="url(#wheelGlow)" opacity={0.65} />

        <g style={{ transformOrigin: `${CX}px ${CY}px`, animation: 'radial-spin 16s linear infinite' }}>
          <circle
            cx={CX}
            cy={CY}
            r={R_OUTER + 8}
            fill="none"
            stroke="var(--accent)"
            strokeOpacity="0.4"
            strokeWidth="1"
            strokeDasharray="3 7"
          />
        </g>

        {entities.map((entity, i) => {
          const start = -90 + i * anglePer + GAP_DEG / 2;
          const end = -90 + (i + 1) * anglePer - GAP_DEG / 2;
          const mid = (start + end) / 2;
          const rMid = (R_OUTER + R_INNER) / 2;
          const iconPos = polar(CX, CY, rMid, mid);
          const isActive = entity.key === activeKey;
          const isHover = entity.key === hoverKey;
          const highlighted = isActive || isHover;

          return (
            <g
              key={entity.key}
              onMouseEnter={() => setHoverKey(entity.key)}
              onMouseLeave={() => setHoverKey(null)}
              onClick={() => onSelect(entity.key)}
              className="cursor-pointer"
            >
              <path
                d={sectorPath(CX, CY, R_OUTER, R_INNER, start, end)}
                fill={highlighted ? 'var(--accent)' : 'var(--surface-2)'}
                stroke={isActive ? 'var(--accent)' : 'var(--border)'}
                strokeWidth={isActive ? 2 : 1}
                style={{
                  transition: 'fill 0.2s ease, filter 0.2s ease',
                  filter: highlighted ? 'drop-shadow(0 0 10px var(--accent))' : 'none',
                }}
              />
              <g
                transform={`translate(${(iconPos.x - 10).toFixed(2)} ${(iconPos.y - 10).toFixed(2)})`}
                fill="none"
                stroke={highlighted ? 'var(--primary-strong)' : 'var(--text-secondary)'}
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ pointerEvents: 'none', transition: 'stroke 0.2s ease' }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24">
                  {ENTITY_ICONS[entity.key]}
                </svg>
              </g>
            </g>
          );
        })}

        <circle cx={CX} cy={CY} r={R_INNER - 4} fill="var(--surface)" stroke="var(--border)" />
      </svg>

      <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none px-4">
        {displayEntity && (
          <>
            <span className="font-semibold text-text-primary leading-tight text-sm">
              {displayEntity.label}
            </span>
            <span className="text-text-muted text-xs mt-0.5">
              {counts[displayEntity.key] ?? '—'} registros
            </span>
          </>
        )}
      </div>
    </div>
  );
}
