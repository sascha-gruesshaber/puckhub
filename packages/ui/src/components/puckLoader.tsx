import * as React from "react"
import { cn } from "../lib/utils"

type PuckLoaderVariant = "orbit" | "spin" | "drop" | "breathe"

interface PuckLoaderProps extends Omit<React.SVGAttributes<SVGSVGElement>, "width" | "height"> {
  /** Rendered size in px. Below 28 px the cylinder collapses into a flat, top-down coin. */
  size?: number
  /** Motion style. `orbit` is the house default. */
  variant?: PuckLoaderVariant
  /** Accessible name. Pass an empty string to hide the loader from assistive tech. */
  label?: string
}

const COIN_BREAKPOINT = 28

// Brand colours of the puck mark. Fixed on purpose: the puck is an image, not
// themed chrome, so it looks the same on every ground.
const C = {
  top1: "#FFE1B8",
  top2: "#FFB36A",
  x: "#FFF6E8",
  side1: "#F2A45A",
  side2: "#D87D33",
  ice: "#4FC6E8",
  iceLight: "#9BEBFF",
  rim: "#FFD9A5",
  rimIce: "#B6F1FF",
  glow: "#3FC3EE",
} as const

// One shared stylesheet, inlined once per SVG. Class names are prefixed so the
// rules never leak; identical keyframes from several instances simply overwrite
// each other with the same values.
const STYLE = `
.ph-rot{transform-box:fill-box;transform-origin:center;animation:ph-spin 2.4s linear infinite}
.ph-stripes{animation:ph-stripes 2.4s linear infinite}
.ph-body{transform-box:fill-box;transform-origin:50% 100%}
.ph-ripple{transform-box:fill-box;transform-origin:center;opacity:0}
.ph-orbit{display:none}
[data-v="drop"] .ph-rot{animation-duration:1.6s}
[data-v="drop"] .ph-body{animation:ph-drop 1.6s cubic-bezier(.5,0,.9,.4) infinite}
[data-v="drop"] .ph-ripple{animation:ph-ripple 1.6s ease-out infinite}
[data-v="drop"] .ph-glow{animation:ph-glow-hit 1.6s ease-out infinite}
[data-v="orbit"] .ph-orbit{display:block}
[data-v="orbit"] .ph-rot{animation-duration:6s}
[data-v="orbit"] .ph-stripes{animation-duration:6s}
[data-v="orbit"] .ph-orbit-path{stroke-dasharray:62 202;animation:ph-orbit 1.5s linear infinite}
[data-v="breathe"] .ph-rot,[data-v="breathe"] .ph-stripes{animation:none}
[data-v="breathe"] .ph-body{animation:ph-breathe 2s ease-in-out infinite}
[data-v="breathe"] .ph-glow{animation:ph-glow-breathe 2s ease-in-out infinite}
.ph-coin-rot{transform-box:fill-box;transform-origin:center;animation:ph-spin 1.4s linear infinite}
.ph-coin-arc{transform-box:fill-box;transform-origin:center;animation:ph-spin 1.1s linear infinite reverse}
@keyframes ph-spin{to{transform:rotate(360deg)}}
@keyframes ph-stripes{to{transform:translateX(-88px)}}
@keyframes ph-drop{0%{transform:translateY(-30px)}42%{transform:translateY(0) scale(1,1);animation-timing-function:ease-out}50%{transform:translateY(0) scale(1.03,.86);animation-timing-function:ease-in-out}62%{transform:translateY(0) scale(1,1);animation-timing-function:ease-out}74%{transform:translateY(-7px);animation-timing-function:ease-in}84%,100%{transform:translateY(0)}}
@keyframes ph-ripple{0%,42%{transform:scale(.35);opacity:0}48%{opacity:.75}100%{transform:scale(1.15);opacity:0}}
@keyframes ph-glow-hit{0%,40%{opacity:.25}48%{opacity:.9}100%{opacity:.35}}
@keyframes ph-orbit{to{stroke-dashoffset:-264}}
@keyframes ph-breathe{0%,100%{transform:scale(1)}50%{transform:scale(.96)}}
@keyframes ph-glow-breathe{0%,100%{opacity:.35}50%{opacity:.85}}
@media (prefers-reduced-motion:reduce){.ph-rot,.ph-stripes,.ph-body,.ph-ripple,.ph-glow,.ph-orbit-path,.ph-coin-rot,.ph-coin-arc{animation:none!important}}
`

const SIDE_PATH = "M20 48V82A44 16 0 0 0 108 82V48A44 16 0 0 1 20 48Z"
const STRIPES = Array.from({ length: 25 }, (_, i) => `M${-68 + i * 11} 40v56`).join("")

function Puck({ id, variant }: { id: string; variant: PuckLoaderVariant }) {
  const side = `${id}-side`
  const shade = `${id}-shade`
  const top = `${id}-top`
  const sideClip = `${id}-sideclip`
  const back = `${id}-back`
  const front = `${id}-front`
  const blur = `${id}-blur`

  return (
    <g data-v={variant}>
      <defs>
        <linearGradient id={side} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={C.side1} />
          <stop offset=".45" stopColor={C.side2} />
          <stop offset=".78" stopColor={C.ice} />
          <stop offset="1" stopColor={C.iceLight} />
        </linearGradient>
        <linearGradient id={shade} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#3a1c08" stopOpacity=".55" />
          <stop offset=".22" stopColor="#3a1c08" stopOpacity=".05" />
          <stop offset=".5" stopColor="#fff" stopOpacity=".12" />
          <stop offset=".8" stopColor="#3a1c08" stopOpacity=".08" />
          <stop offset="1" stopColor="#3a1c08" stopOpacity=".6" />
        </linearGradient>
        <radialGradient id={top} cx=".4" cy=".35" r=".75">
          <stop offset="0" stopColor={C.top1} />
          <stop offset="1" stopColor={C.top2} />
        </radialGradient>
        <clipPath id={sideClip}>
          <path d={SIDE_PATH} />
        </clipPath>
        <clipPath id={back}>
          <rect x="-10" y="-10" width="148" height="94" />
        </clipPath>
        <clipPath id={front}>
          <rect x="-10" y="84" width="148" height="60" />
        </clipPath>
        <filter id={blur} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="4" />
        </filter>
      </defs>

      <ellipse
        className="ph-glow"
        cx="64"
        cy="86"
        rx="48"
        ry="11"
        fill={C.glow}
        opacity=".55"
        filter={`url(#${blur})`}
      />
      <ellipse className="ph-ripple" cx="64" cy="84" rx="58" ry="21" fill="none" stroke={C.glow} strokeWidth="2.5" />

      <g className="ph-orbit" clipPath={`url(#${back})`}>
        <ellipse
          className="ph-orbit-path"
          cx="64"
          cy="84"
          rx="58"
          ry="22"
          fill="none"
          stroke={C.glow}
          strokeWidth="3"
          strokeLinecap="round"
          opacity=".55"
        />
      </g>

      <g className="ph-body">
        <g clipPath={`url(#${sideClip})`}>
          <path d={SIDE_PATH} fill={`url(#${side})`} />
          <g className="ph-stripes" stroke="#fff" strokeOpacity=".28" strokeWidth="2.2">
            <path d={STRIPES} />
          </g>
          <path d={SIDE_PATH} fill={`url(#${shade})`} />
        </g>
        <ellipse
          cx="64"
          cy="82"
          rx="44"
          ry="16"
          fill="none"
          stroke={C.rimIce}
          strokeWidth="1.8"
          opacity=".95"
          clipPath={`url(#${front})`}
        />
        <ellipse cx="64" cy="48" rx="44" ry="16" fill={`url(#${top})`} />
        <g transform="translate(64 48) scale(1 .364)">
          <g className="ph-rot">
            <rect x="-42" y="-6.5" width="84" height="13" rx="6.5" fill={C.x} opacity=".92" transform="rotate(45)" />
            <rect x="-42" y="-6.5" width="84" height="13" rx="6.5" fill={C.x} opacity=".92" transform="rotate(-45)" />
          </g>
        </g>
        <ellipse cx="64" cy="48" rx="44" ry="16" fill="none" stroke={C.rim} strokeWidth="1.6" />
      </g>

      <g className="ph-orbit" clipPath={`url(#${front})`}>
        <ellipse
          className="ph-orbit-path"
          cx="64"
          cy="84"
          rx="58"
          ry="22"
          fill="none"
          stroke={C.glow}
          strokeWidth="3"
          strokeLinecap="round"
        />
      </g>
    </g>
  )
}

function Coin({ id }: { id: string }) {
  const top = `${id}-coin`
  return (
    <>
      <defs>
        <radialGradient id={top} cx=".4" cy=".35" r=".75">
          <stop offset="0" stopColor={C.top1} />
          <stop offset="1" stopColor={C.top2} />
        </radialGradient>
      </defs>
      <circle cx="16" cy="16" r="10.5" fill={`url(#${top})`} />
      <g className="ph-coin-rot">
        <rect x="6" y="14.4" width="20" height="3.2" rx="1.6" fill={C.x} transform="rotate(45 16 16)" />
        <rect x="6" y="14.4" width="20" height="3.2" rx="1.6" fill={C.x} transform="rotate(-45 16 16)" />
      </g>
      <circle
        className="ph-coin-arc"
        cx="16"
        cy="16"
        r="14"
        fill="none"
        stroke={C.glow}
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeDasharray="30 58"
      />
    </>
  )
}

/**
 * Animated puck loader in the brand colours. Inline SVG with its own CSS, so it
 * needs no stylesheet and honours `prefers-reduced-motion` everywhere.
 */
const PuckLoader = React.forwardRef<SVGSVGElement, PuckLoaderProps>(
  ({ size = 44, variant = "orbit", label = "Loading", className, ...props }, ref) => {
    const id = React.useId().replace(/:/g, "")
    const coin = size < COIN_BREAKPOINT
    const a11y = label ? { role: "status" as const, "aria-label": label } : { "aria-hidden": true as const }

    return (
      <svg
        ref={ref}
        viewBox={coin ? "0 0 32 32" : "0 0 128 128"}
        width={size}
        height={size}
        className={cn("shrink-0 overflow-visible", className)}
        {...a11y}
        {...props}
      >
        <title>{label || "Loading"}</title>
        <style>{STYLE}</style>
        {coin ? <Coin id={id} /> : <Puck id={id} variant={variant} />}
      </svg>
    )
  },
)
PuckLoader.displayName = "PuckLoader"

export { PuckLoader, type PuckLoaderProps, type PuckLoaderVariant }
