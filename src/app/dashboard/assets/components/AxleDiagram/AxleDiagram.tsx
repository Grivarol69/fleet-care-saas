'use client';

import {
  getSerialItemColor,
  AXLE_CONFIG_POSITIONS,
} from '@/lib/serialized-asset-constants';
import type { AxleDiagramProps, SerializedSlotData } from './AxleDiagram.types';

// ---------------------------------------------------------------------------
// Layout types
// ---------------------------------------------------------------------------

interface SlotRect {
  position: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rx: number;
}

interface BodyRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface AxleLayout {
  viewHeight: number;
  bodies: BodyRect[];
  slots: SlotRect[];
}

// ---------------------------------------------------------------------------
// Shared constants
// ---------------------------------------------------------------------------

const W = 180; // viewBox width (fixed)

// Single tire dimensions
const SW = 18;
const SH = 36;
const SRX = 4;

// Double tire dimensions (inner / outer pair)
const DW_OUTER = 18;
const DW_INNER = 14;
const DH_DOUBLE = 30;
const DRX = 3;
const DOUBLE_GAP = 2;

// Horizontal positions — single tires
const X_LEFT_SINGLE = 10;
const X_RIGHT_SINGLE = W - SW - 10; // 152

// Horizontal positions — double tires
const X_DOUBLE_OUTER_LEFT = 8;
const X_DOUBLE_INNER_LEFT = X_DOUBLE_OUTER_LEFT + DW_OUTER + DOUBLE_GAP; // 28
const X_DOUBLE_OUTER_RIGHT = W - DW_OUTER - 8; // 154
const X_DOUBLE_INNER_RIGHT = X_DOUBLE_OUTER_RIGHT - DW_INNER - DOUBLE_GAP; // 138

// ---------------------------------------------------------------------------
// Helper builders
// ---------------------------------------------------------------------------

function singleLeft(position: string, y: number): SlotRect {
  return { position, x: X_LEFT_SINGLE, y, width: SW, height: SH, rx: SRX };
}

function singleRight(position: string, y: number): SlotRect {
  return { position, x: X_RIGHT_SINGLE, y, width: SW, height: SH, rx: SRX };
}

/** Double axle row: outer-left, inner-left, inner-right, outer-right */
function doubleRow(
  outerLeft: string,
  innerLeft: string,
  innerRight: string,
  outerRight: string,
  y: number
): SlotRect[] {
  const midY = y + (SH - DH_DOUBLE) / 2; // vertically centre doubles vs single row height
  return [
    {
      position: outerLeft,
      x: X_DOUBLE_OUTER_LEFT,
      y: midY,
      width: DW_OUTER,
      height: DH_DOUBLE,
      rx: DRX,
    },
    {
      position: innerLeft,
      x: X_DOUBLE_INNER_LEFT,
      y: midY,
      width: DW_INNER,
      height: DH_DOUBLE,
      rx: DRX,
    },
    {
      position: innerRight,
      x: X_DOUBLE_INNER_RIGHT,
      y: midY,
      width: DW_INNER,
      height: DH_DOUBLE,
      rx: DRX,
    },
    {
      position: outerRight,
      x: X_DOUBLE_OUTER_RIGHT,
      y: midY,
      width: DW_OUTER,
      height: DH_DOUBLE,
      rx: DRX,
    },
  ];
}

// ---------------------------------------------------------------------------
// Layout definitions per axleConfig string
// ---------------------------------------------------------------------------

function getAxleLayout(axleConfig: string): AxleLayout {
  switch (axleConfig) {
    // -----------------------------------------------------------------------
    case 'STANDARD_4': {
      return {
        viewHeight: 180,
        bodies: [{ x: 50, y: 10, width: 80, height: 160 }],
        slots: [
          singleLeft('FL', 30),
          singleRight('FR', 30),
          singleLeft('RL', 110),
          singleRight('RR', 110),
        ],
      };
    }

    // -----------------------------------------------------------------------
    case 'PACHA_6': {
      return {
        viewHeight: 230,
        bodies: [{ x: 50, y: 10, width: 80, height: 210 }],
        slots: [
          singleLeft('FL', 30),
          singleRight('FR', 30),
          singleLeft('ML', 105),
          singleRight('MR', 105),
          singleLeft('RL', 180),
          singleRight('RR', 180),
        ],
      };
    }

    // -----------------------------------------------------------------------
    case 'TRUCK_10': {
      return {
        viewHeight: 280,
        bodies: [{ x: 45, y: 10, width: 90, height: 260 }],
        slots: [
          singleLeft('FL', 30),
          singleRight('FR', 30),
          ...doubleRow('ML', 'ML2', 'MR2', 'MR', 110),
          ...doubleRow('RL', 'RL2', 'RR2', 'RR', 200),
        ],
      };
    }

    // -----------------------------------------------------------------------
    case 'TRUCK_14': {
      return {
        viewHeight: 340,
        bodies: [{ x: 45, y: 10, width: 90, height: 320 }],
        slots: [
          singleLeft('FL2', 25),
          singleRight('FR2', 25),
          singleLeft('FL', 90),
          singleRight('FR', 90),
          ...doubleRow('ML', 'ML2', 'MR2', 'MR', 160),
          ...doubleRow('RL', 'RL2', 'RR2', 'RR', 250),
        ],
      };
    }

    // -----------------------------------------------------------------------
    case 'SEMI_18': {
      const TRACTOR_BODY: BodyRect = { x: 45, y: 10, width: 90, height: 180 };
      const TRAILER_BODY: BodyRect = { x: 45, y: 210, width: 90, height: 165 };
      return {
        viewHeight: 420,
        bodies: [TRACTOR_BODY, TRAILER_BODY],
        slots: [
          // Tractor
          singleLeft('FL', 25),
          singleRight('FR', 25),
          ...doubleRow('ML', 'ML2', 'MR2', 'MR', 95),
          ...doubleRow('RL', 'RL2', 'RR2', 'RR', 155),
          // Trailer
          singleLeft('FL3', 225),
          singleRight('FR3', 225),
          singleLeft('RL3', 315),
          singleRight('RR3', 315),
          // Spare — centred at the bottom
          {
            position: 'SPARE',
            x: W / 2 - 12,
            y: 378,
            width: 24,
            height: 24,
            rx: 12,
          },
        ],
      };
    }

    // -----------------------------------------------------------------------
    case 'VAN': {
      const SPARE_SIZE = 20;
      return {
        viewHeight: 220,
        bodies: [{ x: 40, y: 10, width: 100, height: 180 }],
        slots: [
          singleLeft('FL', 30),
          singleRight('FR', 30),
          singleLeft('RL', 125),
          singleRight('RR', 125),
          // Spare — centred
          {
            position: 'SPARE',
            x: W / 2 - SPARE_SIZE / 2,
            y: 188,
            width: SPARE_SIZE,
            height: SPARE_SIZE,
            rx: SPARE_SIZE / 2,
          },
        ],
      };
    }

    // -----------------------------------------------------------------------
    default: {
      // Fallback: render known positions from AXLE_CONFIG_POSITIONS if available
      const known = AXLE_CONFIG_POSITIONS[axleConfig];
      if (known) {
        return {
          viewHeight: 180,
          bodies: [{ x: 50, y: 10, width: 80, height: 160 }],
          slots: known.map((pos, i) => ({
            position: pos,
            x: i % 2 === 0 ? X_LEFT_SINGLE : X_RIGHT_SINGLE,
            y: 30 + Math.floor(i / 2) * 50,
            width: SW,
            height: SH,
            rx: SRX,
          })),
        };
      }
      return { viewHeight: 180, bodies: [], slots: [] };
    }
  }
}

// ---------------------------------------------------------------------------
// Legend helper
// ---------------------------------------------------------------------------

function LegendItem({
  color,
  label,
  dashed,
}: {
  color: string;
  label: string;
  dashed?: boolean;
}) {
  return (
    <div className="flex items-center gap-1">
      <div
        style={{
          width: 12,
          height: 12,
          backgroundColor: color,
          borderRadius: 2,
          border: dashed ? '1px dashed #9CA3AF' : '1px solid #374151',
          flexShrink: 0,
        }}
      />
      <span>{label}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function AxleDiagram({
  axleConfig,
  slots,
  onSlotClick,
  className,
}: AxleDiagramProps) {
  const layout = getAxleLayout(axleConfig);
  const slotMap = new Map<string, SerializedSlotData>(
    slots.map(s => [s.position, s])
  );

  return (
    <div className={className}>
      <svg
        viewBox={`0 0 ${W} ${layout.viewHeight}`}
        xmlns="http://www.w3.org/2000/svg"
        className="w-full max-w-[220px] mx-auto"
        aria-label="Diagrama de ejes del vehículo"
      >
        {/* Vehicle body / bodies */}
        {layout.bodies.map((body, i) => (
          <rect
            key={i}
            x={body.x}
            y={body.y}
            width={body.width}
            height={body.height}
            rx={10}
            fill="#F3F4F6"
            stroke="#D1D5DB"
            strokeWidth={1.5}
          />
        ))}

        {/* Item slots */}
        {layout.slots.map(slot => {
          const itemData = slotMap.get(slot.position);
          const color = getSerialItemColor(
            itemData ? { specs: itemData.specs } : null
          );
          const isEmpty = !itemData;
          const label = itemData ? itemData.serialNumber.slice(0, 4) : null;
          const titleText = itemData ? itemData.serialNumber : 'Vacío';

          return (
            <g
              key={slot.position}
              onClick={() => onSlotClick?.(slot.position, itemData ?? null)}
              style={{ cursor: 'pointer' }}
              role="button"
              aria-label={titleText}
            >
              <title>{titleText}</title>
              <rect
                x={slot.x}
                y={slot.y}
                width={slot.width}
                height={slot.height}
                rx={slot.rx}
                fill={color}
                stroke={isEmpty ? '#9CA3AF' : '#374151'}
                strokeWidth={1}
                strokeDasharray={isEmpty ? '3 2' : undefined}
              />
              {label && (
                <text
                  x={slot.x + slot.width / 2}
                  y={slot.y + slot.height / 2 + 3}
                  textAnchor="middle"
                  fontSize={7}
                  fill="white"
                  fontWeight="bold"
                >
                  {label}
                </text>
              )}
            </g>
          );
        })}
      </svg>

      {/* Legend */}
      <div className="flex items-center gap-3 mt-3 flex-wrap justify-center text-xs text-muted-foreground">
        <LegendItem color="#E5E7EB" label="Vacío" dashed />
        <LegendItem color="#22C55E" label="Bueno ≥60%" />
        <LegendItem color="#EAB308" label="Atención 30-59%" />
        <LegendItem color="#EF4444" label="Crítico <30%" />
      </div>
    </div>
  );
}
