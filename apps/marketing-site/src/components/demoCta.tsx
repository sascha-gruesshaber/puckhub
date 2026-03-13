import { useState } from "react"
import { useScrollReveal, revealClasses } from "~/hooks/useScrollEffects"
import { ExternalLink, X, LogIn, Shield, Pencil, ClipboardList, Globe } from "lucide-react"
import { getAdminUrl } from "@/env"

const DEMO_ORG = "demo-league"
const DEMO_PASSWORD = "demo1234"

interface DemoUser {
  label: string
  description: string
  icon: typeof Shield
  prefix: string
}

const DEMO_USERS: DemoUser[] = [
  { label: "Admin (Owner)", description: "Voller Zugriff auf alle Funktionen", icon: Shield, prefix: "admin" },
  { label: "Editor", description: "Inhalte bearbeiten, keine Verwaltung", icon: Pencil, prefix: "editor" },
  { label: "Reporter", description: "Nur Spielberichte erfassen", icon: ClipboardList, prefix: "reporter" },
]

function getDemoDomain(): string {
  if (typeof window !== "undefined") {
    return `${DEMO_ORG}.${window.location.hostname}`
  }
  return `${DEMO_ORG}.puckhub.localhost`
}

export function DemoCta({ onOpenDemo }: { onOpenDemo: () => void }) {
  const reveal = useScrollReveal()

  return (
    <section id="demo" className="py-20 sm:py-28 scroll-mt-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div ref={reveal.ref} className={`relative rounded-2xl border border-brand-gold/20 bg-gradient-to-br from-brand-gold/[0.06] to-brand-blue/[0.04] p-10 sm:p-16 text-center overflow-hidden ${revealClasses(reveal)}`}>
          <div className="absolute top-0 left-1/2 -translate-x-1/2 h-px w-1/2 bg-gradient-to-r from-transparent via-brand-gold/40 to-transparent" />

          <h2 className="text-3xl sm:text-4xl font-bold mb-4">Jetzt kostenlos testen</h2>
          <p className="text-lg text-brand-slate max-w-xl mx-auto mb-8">
            Teste alle Features in unserer Demo-Umgebung – kein Account nötig.
            Die Demo-Daten werden regelmäßig zurückgesetzt.
          </p>
          <button
            type="button"
            onClick={onOpenDemo}
            className="inline-flex items-center gap-2 rounded-lg bg-brand-gold px-6 py-3 text-base font-semibold text-brand-navy hover:bg-brand-gold-dark transition-colors shadow-lg shadow-brand-gold/20"
          >
            Demo-Portal öffnen
            <ExternalLink className="h-4 w-4" />
          </button>
        </div>
      </div>
    </section>
  )
}

export function DemoDialog({ onClose }: { onClose: () => void }) {
  const adminUrl = getAdminUrl()
  const demoDomain = getDemoDomain()

  function loginAs(prefix: string) {
    const email = `${prefix}@${demoDomain}`
    const url = `${adminUrl}/login?email=${encodeURIComponent(email)}&password=${encodeURIComponent(DEMO_PASSWORD)}`
    window.open(url, "_blank", "noopener,noreferrer")
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-dialog-backdrop" />

      <div
        className="relative w-full max-w-md rounded-2xl border border-white/10 bg-brand-navy-light shadow-2xl animate-dialog-content"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-brand-slate hover:text-white hover:bg-white/10 transition-colors"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="p-6 sm:p-8">
          <h3 className="text-xl font-bold mb-1">Demo-Zugang wählen</h3>
          <p className="text-sm text-brand-slate mb-6">
            Wähle eine Rolle – das Login wird automatisch ausgefüllt.
          </p>

          <div className="space-y-3">
            {DEMO_USERS.map((user) => (
              <button
                key={user.prefix}
                type="button"
                onClick={() => loginAs(user.prefix)}
                className="group w-full flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.02] hover:bg-white/[0.05] hover:border-brand-gold/30 transition-all p-4 text-left"
              >
                <div className="shrink-0 rounded-lg bg-brand-gold/10 p-2.5 group-hover:bg-brand-gold/20 transition-colors">
                  <user.icon className="h-4 w-4 text-brand-gold" />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="block font-semibold text-sm">{user.label}</span>
                  <span className="block text-xs text-brand-slate">{user.description}</span>
                </div>
                <LogIn className="h-4 w-4 shrink-0 text-brand-slate/40 group-hover:text-brand-gold transition-colors" />
              </button>
            ))}
          </div>

          <div className="mt-6 pt-5 border-t border-white/10">
            <a
              href={`${typeof window !== "undefined" ? window.location.protocol : "http:"}//${getDemoDomain()}`}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.02] hover:bg-white/[0.05] hover:border-brand-blue/30 transition-all p-4"
            >
              <div className="shrink-0 rounded-lg bg-brand-blue/10 p-2.5 group-hover:bg-brand-blue/20 transition-colors">
                <Globe className="h-4 w-4 text-brand-blue" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="block font-semibold text-sm">Liga-Website ansehen</span>
                <span className="block text-xs text-brand-slate">Die öffentliche Seite der Demo-Liga</span>
              </div>
              <ExternalLink className="h-4 w-4 shrink-0 text-brand-slate/40 group-hover:text-brand-blue transition-colors" />
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
