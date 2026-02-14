import type { ReactNode } from "react"
import type { RoundType } from "./roundTypeColors"

export const roundTypeIcons: Record<RoundType, ReactNode> = {
  regular: (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <rect x="1.5" y="2" width="11" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
      <path d="M1.5 5.5h11" stroke="currentColor" strokeWidth="1.1" />
      <path d="M4.5 2v-1M9.5 2v-1" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  ),
  preround: (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.2" />
      <path d="M7 4v3.5l2.5 1.5" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
    </svg>
  ),
  playoffs: (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path
        d="M3 10V5l4-3.5L11 5v5"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M1 10h12" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      <path d="M7 5v5" stroke="currentColor" strokeWidth="1.1" strokeOpacity="0.5" />
    </svg>
  ),
  playdowns: (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path
        d="M7 2v8M4 7l3 3 3-3"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M3 12h8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  ),
  relegation: (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path
        d="M7 12V4M4 9l3 3 3-3"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M3 2h8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  ),
  placement: (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path
        d="M3 12V7h2.5v5M5.75 12V5h2.5v7M8.5 12V3H11v9"
        stroke="currentColor"
        strokeWidth="1.1"
        strokeLinejoin="round"
      />
    </svg>
  ),
  final: (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M4.5 5.5C4.5 3.5 5.3 2 7 2s2.5 1.5 2.5 3.5" stroke="currentColor" strokeWidth="1.2" />
      <path d="M3 5.5h8v2.5c0 2.2-1.8 4-4 4s-4-1.8-4-4V5.5z" stroke="currentColor" strokeWidth="1.2" />
      <path
        d="M3 7.5c-1 0-1.5-.5-1.5-1.5S2.5 4.5 3 5M11 7.5c1 0 1.5-.5 1.5-1.5S11.5 4.5 11 5"
        stroke="currentColor"
        strokeWidth="1"
      />
    </svg>
  ),
}

/** The same grid/table SVG used in DivisionNode */
export const divisionIcon = (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
    <path
      d="M2 3.5C2 2.67 2.67 2 3.5 2h9c.83 0 1.5.67 1.5 1.5v9c0 .83-.67 1.5-1.5 1.5h-9A1.5 1.5 0 012 12.5v-9z"
      stroke="currentColor"
      strokeWidth="1.3"
      fill="none"
    />
    <path d="M2 6h12M6 6v8M10 6v8M2 10h12" stroke="currentColor" strokeWidth="1.1" strokeOpacity="0.5" />
  </svg>
)
