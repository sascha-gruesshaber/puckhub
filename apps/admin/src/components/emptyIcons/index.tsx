import type { SVGProps } from "react"
import "./emptyIcons.css"

/**
 * Hockey-themed, subtly animated icons for `EmptyState`.
 * 48-unit viewBox drawn at 32 px; accent colour via `currentColor`,
 * the secondary cyan via the `--ice` token. Animations live in emptyIcons.css.
 */

type IconProps = Omit<SVGProps<SVGSVGElement>, "viewBox" | "fill" | "stroke">

function Svg({ name, className, children, ...props }: IconProps & { name: string }) {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={["empty-icon", `empty-icon-${name}`, className].filter(Boolean).join(" ")}
      {...props}
    >
      {children}
    </svg>
  )
}

/** Players: a jersey with the number still to be filled in. */
export function JerseyIcon(props: IconProps) {
  return (
    <Svg name="jersey" {...props}>
      <path d="M16 7 12 9 5 17l6 5 3-2v20h20V20l3 2 6-5-7-8-4-2c-2 4-14 4-16 0Z" />
      <circle className="dash ice" cx="24" cy="29" r="6" strokeDasharray="3 3" />
    </Svg>
  )
}

/** Teams: a face-off circle waiting for the drop. */
export function FaceoffIcon(props: IconProps) {
  return (
    <Svg name="faceoff" {...props}>
      <circle cx="24" cy="24" r="17" />
      <path d="M9 18h5M9 30h5M34 18h5M34 30h5" />
      <circle className="ping ice" cx="24" cy="24" r="12" />
      <circle className="dot ice-fill" cx="24" cy="24" r="2.2" stroke="none" />
    </Svg>
  )
}

/** Games and seasons context: a period clock that ticks. */
export function PeriodClockIcon(props: IconProps) {
  return (
    <Svg name="clock" {...props}>
      <rect x="5" y="9" width="38" height="30" rx="3" />
      <circle cx="24" cy="24" r="10" />
      <path className="ice" d="M24 15.5v2" />
      <path className="hand" d="M24 24V17" />
      <circle cx="24" cy="24" r="1.2" fill="currentColor" stroke="none" />
    </Svg>
  )
}

/** Trikots: a jersey on a hanger, swaying. */
export function HangerJerseyIcon(props: IconProps) {
  return (
    <Svg name="hanger" {...props}>
      <g className="swing">
        <path className="ice" d="M24 10V8.5a2.5 2.5 0 1 1 2.5-2.5" />
        <path className="ice" d="M24 10 17 16M24 10l7 6" />
        <path d="M17 16 7 22l4 6 4-2v16h18V26l4 2 4-6-10-6c-2 3-12 3-14 0Z" />
      </g>
    </Svg>
  )
}

/** Sponsors: an empty rink board with a light sweeping across. */
export function RinkBoardIcon(props: IconProps) {
  return (
    <Svg name="board" {...props}>
      <defs>
        <clipPath id="empty-icon-board-clip">
          <rect x="9" y="17" width="30" height="12" />
        </clipPath>
        <linearGradient id="empty-icon-board-sheen" x1="0" x2="1">
          <stop offset="0" stopColor="hsl(var(--ice))" stopOpacity="0" />
          <stop offset=".5" stopColor="hsl(var(--ice))" stopOpacity=".45" />
          <stop offset="1" stopColor="hsl(var(--ice))" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d="M5 8h38" />
      <rect x="5" y="13" width="38" height="20" rx="2" />
      <rect x="9" y="17" width="30" height="12" rx="1" strokeDasharray="3 2.5" opacity=".8" />
      <g clipPath="url(#empty-icon-board-clip)">
        <rect
          className="sheen"
          x="14"
          y="15"
          width="12"
          height="16"
          fill="url(#empty-icon-board-sheen)"
          stroke="none"
          transform="skewX(-18)"
        />
      </g>
      <path className="ice" d="M5 40h38" />
    </Svg>
  )
}

/** News: a goal horn with sound waves fading in and out. */
export function GoalHornIcon(props: IconProps) {
  return (
    <Svg name="horn" {...props}>
      <path d="M7 19h8l12-8v26l-12-8H7z" />
      <path d="M11 29v7h5" />
      <path className="w1 ice" d="M32 19a7 7 0 0 1 0 10" />
      <path className="w2 ice" d="M36.5 14.5a13 13 0 0 1 0 19" />
    </Svg>
  )
}

/** Pages: a sheet whose lines are being written. */
export function PageSheetIcon(props: IconProps) {
  return (
    <Svg name="page" {...props}>
      <path d="M12 5h18l8 8v30H12z" />
      <path d="M30 5v8h8" />
      <g className="ice">
        <path className="ln" d="M18 22h13" />
        <path className="ln" d="M18 28h10" />
        <path className="ln" d="M18 34h7" />
      </g>
    </Svg>
  )
}

/** Seasons and history: a trophy with a glint. */
export function TrophyIcon(props: IconProps) {
  return (
    <Svg name="trophy" {...props}>
      <path d="M14 8h20v10a10 10 0 0 1-20 0z" />
      <path d="M14 11H9a5 5 0 0 0 5 8M34 11h5a5 5 0 0 1-5 8" />
      <path d="M24 28v6M20 34h8l2 6H18z" />
      <path className="glint ice" d="M31 12v6M28 15h6" />
    </Svg>
  )
}

/** Users: a whistle. */
export function WhistleIcon(props: IconProps) {
  return (
    <Svg name="whistle" {...props}>
      <path d="M21.5 21h17a2.5 2.5 0 0 1 2.5 2.5v2a2.5 2.5 0 0 1-2.5 2.5H24l-1.6 4.8A7.5 7.5 0 1 1 21.5 21Z" />
      <path d="M33 21v-3.5a2 2 0 0 1 2-2" />
      <g className="ice">
        <path className="tk" d="M43.5 19.5l2-2" />
        <path className="tk" d="M44.5 24.5h2.5" />
      </g>
    </Svg>
  )
}

/** Search without results: a lens drifting over the ice. */
export function LensIcon(props: IconProps) {
  return (
    <Svg name="lens" {...props}>
      <g className="drift">
        <circle cx="20" cy="20" r="10" />
        <ellipse className="ice" cx="20" cy="21" rx="4.5" ry="2.2" strokeDasharray="2 2" />
        <path d="M27.5 27.5 40 40" />
      </g>
      <path className="ice" d="M6 41h10" opacity=".6" />
    </Svg>
  )
}

/** Roster: an empty bench under a flickering light. */
export function BenchIcon(props: IconProps) {
  return (
    <Svg name="bench" {...props}>
      <path d="M6 24h36" />
      <path d="M8 24v-7a2 2 0 0 1 2-2h28a2 2 0 0 1 2 2v7" />
      <path d="M10 24v10M38 24v10M18 24v8M30 24v8" />
      <path className="ice" d="M6 40h36" />
      <g className="flick ice">
        <path d="M20 8h8M24 5v3" />
      </g>
    </Svg>
  )
}
