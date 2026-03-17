import { useState, useRef, useEffect, useCallback } from "react"
import { Link } from "@tanstack/react-router"
import {
  Send,
  Mail,
  User,
  MessageSquare,
  ChevronRight,
  ArrowLeft,
  CheckCircle2,
  Loader2,
  Sparkles,
  HelpCircle,
  Headphones,
} from "lucide-react"
import { useScrollReveal, revealClasses } from "~/hooks/useScrollEffects"
import { useT } from "~/i18n"
import { trpc } from "../../lib/trpc"

type Phase = "form" | "otp" | "success"
type InquiryType = "general" | "demo" | "support"

const TYPE_ICONS = {
  general: HelpCircle,
  demo: Sparkles,
  support: Headphones,
} as const

export function ContactForm({ plan }: { plan?: string }) {
  const t = useT()
  const reveal = useScrollReveal()

  const planMessage = plan
    ? t.contact.form.planContext.replace("{plan}", plan.charAt(0).toUpperCase() + plan.slice(1))
    : ""

  const [phase, setPhase] = useState<Phase>("form")
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    type: (plan ? "general" : "demo") as InquiryType,
    message: planMessage,
  })
  const [otpDigits, setOtpDigits] = useState(["", "", "", "", "", ""])
  const [error, setError] = useState("")
  const [formOpenedAt] = useState(Date.now)

  // Honeypot
  const [hp, setHp] = useState("")

  const requestOtp = trpc.contactForm.requestOtp.useMutation()
  const submit = trpc.contactForm.submit.useMutation()

  const errorMap = t.contact.errors as Record<string, string>

  function mapError(err: unknown): string {
    const code = (err as any)?.data?.code ?? (err as any)?.message ?? ""
    return errorMap[code] ?? t.contact.errors.generic
  }

  // ── Phase 1: Form ──

  async function handleRequestOtp(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    try {
      await requestOtp.mutateAsync({ email: formData.email })
      setPhase("otp")
    } catch (err) {
      setError(mapError(err))
    }
  }

  // ── Phase 2: OTP ──

  const otpRefs = useRef<(HTMLInputElement | null)[]>([])

  const handleOtpChange = useCallback(
    (index: number, value: string) => {
      if (!/^\d*$/.test(value)) return
      const digit = value.slice(-1)
      setOtpDigits((prev) => {
        const next = [...prev]
        next[index] = digit
        return next
      })
      if (digit && index < 5) {
        otpRefs.current[index + 1]?.focus()
      }
    },
    [],
  )

  function handleOtpKeyDown(index: number, e: React.KeyboardEvent) {
    if (e.key === "Backspace" && !otpDigits[index] && index > 0) {
      otpRefs.current[index - 1]?.focus()
    }
  }

  function handleOtpPaste(e: React.ClipboardEvent) {
    e.preventDefault()
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6)
    if (!pasted) return
    const digits = pasted.split("")
    setOtpDigits((prev) => {
      const next = [...prev]
      digits.forEach((d, i) => {
        next[i] = d
      })
      return next
    })
    const focusIdx = Math.min(digits.length, 5)
    otpRefs.current[focusIdx]?.focus()
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    const code = otpDigits.join("")
    if (code.length !== 6) return

    try {
      await submit.mutateAsync({
        ...formData,
        otpCode: code,
        _hp: hp,
        _ts: formOpenedAt,
      })
      setPhase("success")
    } catch (err) {
      setError(mapError(err))
    }
  }

  async function handleResend() {
    setError("")
    setOtpDigits(["", "", "", "", "", ""])
    try {
      await requestOtp.mutateAsync({ email: formData.email })
    } catch (err) {
      setError(mapError(err))
    }
  }

  // Auto-focus first OTP input when entering OTP phase
  useEffect(() => {
    if (phase === "otp") {
      otpRefs.current[0]?.focus()
    }
  }, [phase])

  return (
    <section className="relative min-h-screen pt-28 pb-20 sm:pt-36 sm:pb-28">
      {/* Background atmosphere */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/3 h-[500px] w-[500px] -translate-x-1/2 rounded-full bg-brand-blue/[0.04] blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 h-[400px] w-[400px] rounded-full bg-brand-gold/[0.03] blur-[100px]" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div
          ref={reveal.ref}
          className={`mx-auto max-w-2xl ${revealClasses(reveal)}`}
        >
          {/* Header */}
          <div className="mb-12 text-center">
            {plan ? (
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-brand-blue/20 bg-brand-blue/[0.06] px-4 py-1.5 text-xs font-semibold tracking-wider text-brand-blue uppercase">
                <Sparkles className="h-3.5 w-3.5" />
                {plan} Plan
              </div>
            ) : (
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-brand-gold/20 bg-brand-gold/[0.06] px-4 py-1.5 text-xs font-semibold tracking-wider text-brand-gold uppercase">
                <Mail className="h-3.5 w-3.5" />
                {t.contact.navLabel}
              </div>
            )}
            <h1 className="mb-4 text-4xl font-bold sm:text-5xl">
              <span className="gradient-text">{t.contact.heading}</span>
            </h1>
            <p className="mx-auto max-w-lg text-lg text-brand-slate leading-relaxed">
              {t.contact.subheading}
            </p>
          </div>

          {/* Form card */}
          <div className="relative rounded-2xl border border-white/[0.06] bg-brand-navy-light/80 backdrop-blur-sm shadow-2xl shadow-black/30 overflow-hidden">
            {/* Top accent line */}
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-brand-gold/30 to-transparent" />

            <div className="p-6 sm:p-10">
              {phase === "form" && (
                <FormPhase
                  t={t}
                  formData={formData}
                  setFormData={setFormData}
                  error={error}
                  loading={requestOtp.isPending}
                  onSubmit={handleRequestOtp}
                  hp={hp}
                  setHp={setHp}
                />
              )}

              {phase === "otp" && (
                <OtpPhase
                  t={t}
                  email={formData.email}
                  otpDigits={otpDigits}
                  otpRefs={otpRefs}
                  error={error}
                  loading={submit.isPending}
                  resending={requestOtp.isPending}
                  onSubmit={handleSubmit}
                  onResend={handleResend}
                  onBack={() => {
                    setPhase("form")
                    setError("")
                    setOtpDigits(["", "", "", "", "", ""])
                  }}
                  onOtpChange={handleOtpChange}
                  onOtpKeyDown={handleOtpKeyDown}
                  onOtpPaste={handleOtpPaste}
                />
              )}

              {phase === "success" && <SuccessPhase t={t} />}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

// ── Form Phase ──────────────────────────────────────────────────────────────

function FormPhase({
  t,
  formData,
  setFormData,
  error,
  loading,
  onSubmit,
  hp,
  setHp,
}: {
  t: ReturnType<typeof useT>
  formData: { name: string; email: string; type: InquiryType; message: string }
  setFormData: React.Dispatch<React.SetStateAction<typeof formData>>
  error: string
  loading: boolean
  onSubmit: (e: React.FormEvent) => void
  hp: string
  setHp: (v: string) => void
}) {
  const ct = t.contact.form
  const types: InquiryType[] = ["general", "demo", "support"]

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {/* Inquiry type selector */}
      <div>
        <label className="mb-2.5 block text-sm font-medium text-brand-slate">
          {ct.type}
        </label>
        <div className="grid grid-cols-3 gap-3">
          {types.map((typeKey) => {
            const Icon = TYPE_ICONS[typeKey]
            const active = formData.type === typeKey
            return (
              <button
                key={typeKey}
                type="button"
                onClick={() => setFormData((p) => ({ ...p, type: typeKey }))}
                className={`group relative flex flex-col items-center gap-2 rounded-xl border p-4 text-center transition-all ${
                  active
                    ? "border-brand-gold/40 bg-brand-gold/[0.08]"
                    : "border-white/[0.06] bg-white/[0.02] hover:border-white/10 hover:bg-white/[0.04]"
                }`}
              >
                <div
                  className={`rounded-lg p-2 transition-colors ${
                    active
                      ? "bg-brand-gold/20 text-brand-gold"
                      : "bg-white/[0.06] text-brand-slate group-hover:text-white"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                </div>
                <span
                  className={`text-xs font-medium transition-colors ${
                    active ? "text-brand-gold" : "text-brand-slate"
                  }`}
                >
                  {ct.types[typeKey]}
                </span>
                {active && (
                  <div className="absolute -bottom-px left-1/4 right-1/4 h-px bg-brand-gold/60" />
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Name + Email row */}
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="contact-name" className="mb-2 block text-sm font-medium text-brand-slate">
            {ct.name}
          </label>
          <div className="relative">
            <User className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-slate/40" />
            <input
              id="contact-name"
              type="text"
              required
              maxLength={100}
              value={formData.name}
              onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
              placeholder={ct.namePlaceholder}
              className="w-full rounded-xl border border-white/[0.08] bg-white/[0.03] py-3 pl-11 pr-4 text-sm text-white placeholder:text-brand-slate/40 transition-colors focus:border-brand-gold/40 focus:outline-none focus:ring-1 focus:ring-brand-gold/20"
            />
          </div>
        </div>
        <div>
          <label htmlFor="contact-email" className="mb-2 block text-sm font-medium text-brand-slate">
            {ct.email}
          </label>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-slate/40" />
            <input
              id="contact-email"
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData((p) => ({ ...p, email: e.target.value }))}
              placeholder={ct.emailPlaceholder}
              className="w-full rounded-xl border border-white/[0.08] bg-white/[0.03] py-3 pl-11 pr-4 text-sm text-white placeholder:text-brand-slate/40 transition-colors focus:border-brand-gold/40 focus:outline-none focus:ring-1 focus:ring-brand-gold/20"
            />
          </div>
        </div>
      </div>

      {/* Message */}
      <div>
        <label htmlFor="contact-message" className="mb-2 block text-sm font-medium text-brand-slate">
          {ct.message}
        </label>
        <div className="relative">
          <MessageSquare className="pointer-events-none absolute left-3.5 top-3.5 h-4 w-4 text-brand-slate/40" />
          <textarea
            id="contact-message"
            required
            minLength={10}
            maxLength={5000}
            rows={5}
            value={formData.message}
            onChange={(e) => setFormData((p) => ({ ...p, message: e.target.value }))}
            placeholder={ct.messagePlaceholder}
            className="w-full rounded-xl border border-white/[0.08] bg-white/[0.03] py-3 pl-11 pr-4 text-sm text-white placeholder:text-brand-slate/40 transition-colors resize-none focus:border-brand-gold/40 focus:outline-none focus:ring-1 focus:ring-brand-gold/20"
          />
        </div>
      </div>

      {/* Honeypot — invisible to humans */}
      <div className="absolute -left-[9999px] -top-[9999px]" aria-hidden="true">
        <input
          type="text"
          name="website"
          tabIndex={-1}
          autoComplete="off"
          value={hp}
          onChange={(e) => setHp(e.target.value)}
        />
      </div>

      {error && (
        <p className="rounded-lg border border-red-500/20 bg-red-500/[0.06] px-4 py-3 text-sm text-red-400">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={loading || !formData.name || !formData.email || !formData.message}
        className="group flex w-full items-center justify-center gap-2.5 rounded-xl bg-brand-gold px-6 py-3.5 text-sm font-semibold text-brand-navy transition-all hover:bg-brand-gold-dark hover:shadow-lg hover:shadow-brand-gold/20 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            {ct.sending}
          </>
        ) : (
          <>
            {ct.sendCode}
            <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </>
        )}
      </button>
    </form>
  )
}

// ── OTP Phase ───────────────────────────────────────────────────────────────

function OtpPhase({
  t,
  email,
  otpDigits,
  otpRefs,
  error,
  loading,
  resending,
  onSubmit,
  onResend,
  onBack,
  onOtpChange,
  onOtpKeyDown,
  onOtpPaste,
}: {
  t: ReturnType<typeof useT>
  email: string
  otpDigits: string[]
  otpRefs: React.MutableRefObject<(HTMLInputElement | null)[]>
  error: string
  loading: boolean
  resending: boolean
  onSubmit: (e: React.FormEvent) => void
  onResend: () => void
  onBack: () => void
  onOtpChange: (index: number, value: string) => void
  onOtpKeyDown: (index: number, e: React.KeyboardEvent) => void
  onOtpPaste: (e: React.ClipboardEvent) => void
}) {
  const ct = t.contact.otp
  const allFilled = otpDigits.every((d) => d !== "")

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-blue/10">
          <Mail className="h-6 w-6 text-brand-blue" />
        </div>
        <h2 className="mb-2 text-xl font-bold">{ct.heading}</h2>
        <p className="text-sm text-brand-slate">
          {ct.description.replace("{email}", email)}
        </p>
      </div>

      {/* OTP inputs */}
      <div className="flex justify-center gap-2.5 sm:gap-3" onPaste={onOtpPaste}>
        {otpDigits.map((digit, i) => (
          <input
            key={i}
            ref={(el) => { otpRefs.current[i] = el }}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={digit}
            onChange={(e) => onOtpChange(i, e.target.value)}
            onKeyDown={(e) => onOtpKeyDown(i, e)}
            className={`h-13 w-11 sm:h-14 sm:w-12 rounded-xl border text-center text-xl font-bold transition-all focus:outline-none ${
              digit
                ? "border-brand-gold/40 bg-brand-gold/[0.06] text-brand-gold"
                : "border-white/[0.08] bg-white/[0.03] text-white"
            } focus:border-brand-gold/50 focus:ring-1 focus:ring-brand-gold/20`}
          />
        ))}
      </div>

      {error && (
        <p className="rounded-lg border border-red-500/20 bg-red-500/[0.06] px-4 py-3 text-center text-sm text-red-400">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={loading || !allFilled}
        className="group flex w-full items-center justify-center gap-2.5 rounded-xl bg-brand-gold px-6 py-3.5 text-sm font-semibold text-brand-navy transition-all hover:bg-brand-gold-dark hover:shadow-lg hover:shadow-brand-gold/20 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            {ct.submitting}
          </>
        ) : (
          <>
            <Send className="h-4 w-4" />
            {ct.submit}
          </>
        )}
      </button>

      <div className="flex items-center justify-between text-sm">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1.5 text-brand-slate hover:text-white transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          {ct.back}
        </button>
        <button
          type="button"
          onClick={onResend}
          disabled={resending}
          className="text-brand-slate hover:text-brand-gold transition-colors disabled:opacity-50"
        >
          {resending ? <Loader2 className="inline h-3.5 w-3.5 animate-spin mr-1" /> : null}
          {ct.resend}
        </button>
      </div>
    </form>
  )
}

// ── Success Phase ───────────────────────────────────────────────────────────

function SuccessPhase({ t }: { t: ReturnType<typeof useT> }) {
  const ct = t.contact.success

  return (
    <div className="py-6 text-center">
      <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/10">
        <CheckCircle2 className="h-8 w-8 text-emerald-400" />
      </div>
      <h2 className="mb-2 text-2xl font-bold">{ct.heading}</h2>
      <p className="mx-auto mb-8 max-w-sm text-brand-slate leading-relaxed">
        {ct.description}
      </p>
      <Link
        to="/"
        className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-6 py-3 text-sm font-medium text-white hover:bg-white/[0.08] transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        {ct.backToHome}
      </Link>
    </div>
  )
}
