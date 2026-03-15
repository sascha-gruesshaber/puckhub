import { CheckCircle2, ChevronDown, ChevronUp, Loader2, Mail, Send, Shield, X } from "lucide-react"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useFeatures, useOrg } from "~/lib/context"
import { useT } from "~/lib/i18n"
import { trpc } from "../../../lib/trpc"

type Phase = "form" | "otp" | "success"

interface PublicReportFormProps {
  gameId: string
  homeTeamShortName: string
  awayTeamShortName: string
  homeTeamLogoUrl?: string | null
  awayTeamLogoUrl?: string | null
}

export function PublicReportButton({ onClick }: { onClick: () => void }) {
  const t = useT()
  return (
    <button
      type="button"
      onClick={onClick}
      className="group relative w-full overflow-hidden rounded-xl border border-league-primary/20 bg-gradient-to-r from-league-primary/[0.06] to-league-primary/[0.02] px-5 py-4 text-left transition-all hover:border-league-primary/40 hover:shadow-lg hover:shadow-league-primary/5 active:scale-[0.995]"
    >
      <div className="flex items-center gap-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-league-primary/10 text-league-primary transition-transform group-hover:scale-110">
          <Send className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-sm text-league-text">{t.publicReport.title}</div>
          <div className="text-xs text-league-text/50 mt-0.5">{t.publicReport.buttonDesc}</div>
        </div>
        <div className="text-league-primary/60 transition-transform group-hover:translate-x-0.5">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path
              d="M7.5 5L12.5 10L7.5 15"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </div>
    </button>
  )
}

// ─── Math challenge generation ───────────────────────────────────────────────

function generateMathChallenge(): { question: string; answer: number } {
  const a = Math.floor(Math.random() * 10) + 1
  const b = Math.floor(Math.random() * 10) + 1
  return { question: `${a} + ${b}`, answer: a + b }
}

// ─── Panel ───────────────────────────────────────────────────────────────────

export function PublicReportPanel({
  open,
  onClose,
  gameId,
  homeTeamShortName,
  awayTeamShortName,
  homeTeamLogoUrl,
  awayTeamLogoUrl,
}: PublicReportFormProps & { open: boolean; onClose: () => void }) {
  const org = useOrg()
  const t = useT()
  const features = useFeatures()
  const utils = trpc.useUtils()

  const requireEmail = features.publicReportsRequireEmail
  const botDetection = features.publicReportsBotDetection

  const [phase, setPhase] = useState<Phase>("form")
  const [email, setEmail] = useState("")
  const [homeScore, setHomeScore] = useState(0)
  const [awayScore, setAwayScore] = useState(0)
  const [comment, setComment] = useState("")
  const [otpDigits, setOtpDigits] = useState(["", "", "", "", "", ""])
  const [error, setError] = useState<string | null>(null)
  const [closing, setClosing] = useState(false)

  // Bot detection state
  const [honeypot, setHoneypot] = useState("")
  const formOpenedAt = useRef<number>(0)
  const [mathChallenge] = useState(() => generateMathChallenge())
  const [mathAnswer, setMathAnswer] = useState("")

  const otpRefs = useRef<(HTMLInputElement | null)[]>([])

  // Record when panel opens
  useEffect(() => {
    if (open) {
      formOpenedAt.current = Date.now()
      document.body.style.overflow = "hidden"
      return () => {
        document.body.style.overflow = ""
      }
    }
  }, [open])

  // Focus first OTP input when entering OTP phase
  useEffect(() => {
    if (phase === "otp") {
      setTimeout(() => otpRefs.current[0]?.focus(), 400)
    }
  }, [phase])

  const handleClose = useCallback(() => {
    setClosing(true)
    setTimeout(() => {
      setClosing(false)
      onClose()
      setTimeout(() => {
        setPhase("form")
        setEmail("")
        setHomeScore(0)
        setAwayScore(0)
        setComment("")
        setOtpDigits(["", "", "", "", "", ""])
        setError(null)
        setHoneypot("")
        setMathAnswer("")
      }, 100)
    }, 280)
  }, [onClose])

  const requestOtp = trpc.publicSite.reportRequestOtp.useMutation({
    onSuccess: () => {
      setError(null)
      setPhase("otp")
    },
    onError: (err: any) => {
      const code = err.data?.appErrorCode
      setError(code === "PUBLIC_REPORT_RATE_LIMITED" ? t.publicReport.rateLimited : t.publicReport.error)
    },
  })

  const submitReport = trpc.publicSite.reportSubmit.useMutation({
    onSuccess: () => {
      setError(null)
      setPhase("success")
      utils.publicSite.getGameDetail.invalidate({ organizationId: org.id, gameId })
      utils.publicSite.reportHasReport.invalidate({ organizationId: org.id, gameId })
    },
    onError: (err: any) => {
      const code = err.data?.appErrorCode
      if (code === "PUBLIC_REPORT_INVALID_OTP") setError(t.publicReport.invalidCode)
      else if (code === "PUBLIC_REPORT_DUPLICATE") setError(t.publicReport.duplicate)
      else if (code === "PUBLIC_REPORT_RATE_LIMITED") setError(t.publicReport.rateLimited)
      else setError(t.publicReport.error)
      if (code === "PUBLIC_REPORT_INVALID_OTP") {
        setOtpDigits(["", "", "", "", "", ""])
        setTimeout(() => otpRefs.current[0]?.focus(), 50)
      }
    },
  })

  // Build the bot-detection payload
  const botPayload = useMemo(
    () => ({
      _hp: honeypot,
      _ts: formOpenedAt.current,
    }),
    [honeypot],
  )

  function validateBotDetection(): boolean {
    if (!botDetection) return true
    // Math challenge validation (client-side)
    if (Number(mathAnswer) !== mathChallenge.answer) {
      setError(t.publicReport.mathIncorrect)
      return false
    }
    return true
  }

  function handleFormSubmit(ev: React.FormEvent) {
    ev.preventDefault()
    if (!email) return
    setError(null)

    if (!validateBotDetection()) return

    if (requireEmail) {
      // Send OTP and go to OTP phase
      requestOtp.mutate({ organizationId: org.id, email })
    } else {
      // Skip OTP — submit directly
      submitReport.mutate({
        organizationId: org.id,
        gameId,
        homeScore,
        awayScore,
        comment: comment || undefined,
        email,
        ...botPayload,
      })
    }
  }

  function handleOtpChange(index: number, value: string) {
    const digit = value.replace(/\D/g, "").slice(-1)
    const next = [...otpDigits]
    next[index] = digit
    setOtpDigits(next)

    if (digit && index < 5) {
      otpRefs.current[index + 1]?.focus()
    }

    const fullCode = next.join("")
    if (fullCode.length === 6) {
      setError(null)
      submitReport.mutate({
        organizationId: org.id,
        gameId,
        homeScore,
        awayScore,
        comment: comment || undefined,
        email,
        otpCode: fullCode,
        ...botPayload,
      })
    }
  }

  function handleOtpKeyDown(index: number, ev: React.KeyboardEvent) {
    if (ev.key === "Backspace" && !otpDigits[index] && index > 0) {
      otpRefs.current[index - 1]?.focus()
    }
  }

  function handleOtpPaste(ev: React.ClipboardEvent) {
    ev.preventDefault()
    const pasted = ev.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6)
    if (!pasted) return
    const next = [...otpDigits]
    for (let i = 0; i < 6; i++) next[i] = pasted[i] || ""
    setOtpDigits(next)
    const focusIdx = Math.min(pasted.length, 5)
    otpRefs.current[focusIdx]?.focus()
    if (pasted.length === 6) {
      setError(null)
      submitReport.mutate({
        organizationId: org.id,
        gameId,
        homeScore,
        awayScore,
        comment: comment || undefined,
        email,
        otpCode: pasted,
        ...botPayload,
      })
    }
  }

  if (!open) return null

  const isVisible = open && !closing
  const isPending = requestOtp.isPending || submitReport.isPending

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className={`absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-300 ${isVisible ? "opacity-100" : "opacity-0"}`}
        onClick={handleClose}
      />

      {/* Panel */}
      <div
        className={`absolute right-0 top-0 h-full w-full max-w-md overflow-hidden bg-league-bg border-l border-league-text/10 shadow-2xl shadow-black/20 transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] ${isVisible ? "translate-x-0" : "translate-x-full"}`}
      >
        <div className="flex h-full flex-col overflow-y-auto overflow-x-hidden">
          {/* Panel header */}
          <div className="sticky top-0 z-10 flex items-center justify-between border-b border-league-text/10 bg-league-bg/95 backdrop-blur-md px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-league-primary/10 text-league-primary">
                <Send className="h-4 w-4" />
              </div>
              <h2 className="font-bold text-league-text">{t.publicReport.title}</h2>
            </div>
            <button
              type="button"
              onClick={handleClose}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-league-text/40 transition-colors hover:bg-league-text/5 hover:text-league-text"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Content area with phase transitions */}
          <div className="flex-1 relative overflow-hidden">
            {/* ───── FORM PHASE ───── */}
            <div
              className={`absolute inset-0 overflow-y-auto overflow-x-hidden p-6 transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] ${
                phase === "form" ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-8 pointer-events-none"
              }`}
            >
              <form onSubmit={handleFormSubmit} className="space-y-6">
                {/* Honeypot — invisible to users, bots fill it */}
                <div className="absolute -left-[9999px] -top-[9999px]" aria-hidden="true">
                  <label htmlFor="website_url">Website</label>
                  <input
                    id="website_url"
                    name="website_url"
                    type="text"
                    tabIndex={-1}
                    autoComplete="off"
                    value={honeypot}
                    onChange={(e) => setHoneypot(e.target.value)}
                  />
                </div>

                {/* Matchup display */}
                <div className="rounded-xl bg-league-surface border border-league-text/8 p-5">
                  <div className="flex items-center justify-center gap-3 sm:gap-5">
                    <div className="text-center flex-1 min-w-0">
                      <TeamBadge name={homeTeamShortName} logoUrl={homeTeamLogoUrl} />
                      <div className="mt-3">
                        <ScoreInput value={homeScore} onChange={setHomeScore} />
                      </div>
                    </div>
                    <div className="flex flex-col items-center gap-1 pt-1 shrink-0">
                      <span className="text-xs font-bold tracking-widest text-league-text/25 uppercase">vs</span>
                      <span className="text-2xl font-black text-league-text/15">:</span>
                    </div>
                    <div className="text-center flex-1 min-w-0">
                      <TeamBadge name={awayTeamShortName} logoUrl={awayTeamLogoUrl} />
                      <div className="mt-3">
                        <ScoreInput value={awayScore} onChange={setAwayScore} />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Comment */}
                <div>
                  <label className="block text-xs font-semibold text-league-text/50 uppercase tracking-wide mb-2">
                    {t.publicReport.commentLabel}
                  </label>
                  <input
                    type="text"
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    maxLength={500}
                    placeholder={t.publicReport.commentPlaceholder}
                    className="w-full rounded-xl border border-league-text/10 bg-league-surface px-4 py-3 text-sm text-league-text placeholder:text-league-text/30 focus:outline-none focus:ring-2 focus:ring-league-primary/20 focus:border-league-primary/30 transition-all"
                  />
                </div>

                {/* Bot detection: Math challenge */}
                {botDetection && (
                  <div className="rounded-xl bg-league-surface border border-league-text/8 p-4">
                    <div className="flex items-center gap-2.5 mb-3">
                      <Shield className="h-4 w-4 text-league-text/30 shrink-0" />
                      <span className="text-xs font-semibold text-league-text/40 uppercase tracking-wide">
                        {t.publicReport.spamProtection}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-semibold text-league-text/70 whitespace-nowrap">
                        {mathChallenge.question} =
                      </span>
                      <input
                        type="number"
                        required
                        value={mathAnswer}
                        onChange={(e) => setMathAnswer(e.target.value)}
                        className="w-20 rounded-lg border border-league-text/10 bg-league-bg px-3 py-2 text-sm text-center font-bold text-league-text focus:outline-none focus:ring-2 focus:ring-league-primary/20 focus:border-league-primary/30 transition-all [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                        placeholder="?"
                      />
                    </div>
                  </div>
                )}

                {/* Divider */}
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-px bg-league-text/8" />
                  <span className="text-[10px] font-bold tracking-widest text-league-text/25 uppercase">
                    {requireEmail ? t.publicReport.verifyIdentity : t.publicReport.yourContact}
                  </span>
                  <div className="flex-1 h-px bg-league-text/8" />
                </div>

                {/* Email */}
                <div>
                  <label className="block text-xs font-semibold text-league-text/50 uppercase tracking-wide mb-2">
                    {t.publicReport.emailLabel}
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-league-text/30" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder={t.publicReport.emailPlaceholder}
                      className="w-full rounded-xl border border-league-text/10 bg-league-surface pl-11 pr-4 py-3 text-sm text-league-text placeholder:text-league-text/30 focus:outline-none focus:ring-2 focus:ring-league-primary/20 focus:border-league-primary/30 transition-all"
                    />
                  </div>
                  {!requireEmail && (
                    <p className="text-[11px] text-league-text/35 mt-1.5">{t.publicReport.emailNoVerification}</p>
                  )}
                </div>

                {/* Error */}
                {error && phase === "form" && (
                  <div className="rounded-xl bg-red-500/8 border border-red-500/15 px-4 py-3 text-sm text-red-600 animate-[shake_0.4s_ease-in-out]">
                    {error}
                  </div>
                )}

                {/* Submit */}
                <button
                  type="submit"
                  disabled={isPending || !email}
                  className="group relative w-full overflow-hidden rounded-xl bg-league-primary px-5 py-3.5 text-sm font-bold text-white shadow-lg shadow-league-primary/20 transition-all hover:shadow-xl hover:shadow-league-primary/30 hover:brightness-110 active:scale-[0.98] disabled:opacity-50 disabled:shadow-none"
                >
                  {isPending ? (
                    <span className="flex items-center justify-center gap-2.5">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {requireEmail ? t.publicReport.sendingCode : t.publicReport.submitting}
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      {requireEmail ? t.publicReport.submitAndVerify : t.publicReport.submit}
                      <Send className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                    </span>
                  )}
                </button>
              </form>
            </div>

            {/* ───── OTP PHASE ───── */}
            <div
              className={`absolute inset-0 overflow-y-auto overflow-x-hidden p-6 flex flex-col items-center justify-center transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] ${
                phase === "otp"
                  ? "opacity-100 translate-x-0"
                  : phase === "form"
                    ? "opacity-0 translate-x-8 pointer-events-none"
                    : "opacity-0 -translate-x-8 pointer-events-none"
              }`}
            >
              {/* Animated envelope */}
              <div className="mb-8 relative">
                <div className="relative flex h-20 w-20 items-center justify-center">
                  <div className="absolute inset-0 rounded-full bg-league-primary/10 animate-[otpPulse_2s_ease-in-out_infinite]" />
                  <div className="absolute inset-2 rounded-full bg-league-primary/8 animate-[otpPulse_2s_ease-in-out_infinite_0.3s]" />
                  <div className="relative z-10 flex h-14 w-14 items-center justify-center rounded-2xl bg-league-primary/10 text-league-primary">
                    <Mail className="h-7 w-7 animate-[otpBounce_2s_ease-in-out_infinite]" />
                  </div>
                </div>
              </div>

              <h3 className="text-lg font-bold text-league-text mb-2 text-center animate-[fadeSlideUp_0.5s_ease-out_0.15s_both]">
                {t.publicReport.checkInbox}
              </h3>
              <p className="text-sm text-league-text/50 text-center mb-1 animate-[fadeSlideUp_0.5s_ease-out_0.25s_both]">
                {t.publicReport.codeSentTo}
              </p>
              <p className="text-sm font-semibold text-league-primary mb-8 animate-[fadeSlideUp_0.5s_ease-out_0.3s_both]">
                {email}
              </p>

              {/* OTP Input boxes */}
              <div
                className="flex gap-2 sm:gap-2.5 mb-6 animate-[fadeSlideUp_0.5s_ease-out_0.4s_both]"
                onPaste={handleOtpPaste}
              >
                {otpDigits.map((digit, i) => (
                  <input
                    key={i}
                    ref={(el) => {
                      otpRefs.current[i] = el
                    }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(i, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(i, e)}
                    disabled={submitReport.isPending}
                    className={`h-13 w-10 sm:h-14 sm:w-11 rounded-xl border-2 bg-league-surface text-center text-lg sm:text-xl font-bold text-league-text transition-all focus:outline-none focus:border-league-primary focus:ring-4 focus:ring-league-primary/10 disabled:opacity-50 ${
                      digit ? "border-league-primary/40 scale-105" : "border-league-text/12"
                    } ${submitReport.isPending ? "animate-pulse" : ""}`}
                  />
                ))}
              </div>

              {submitReport.isPending && (
                <div className="flex items-center gap-2 text-sm text-league-primary animate-[fadeSlideUp_0.3s_ease-out]">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t.publicReport.verifying}
                </div>
              )}

              {error && phase === "otp" && (
                <div className="mt-4 w-full rounded-xl bg-red-500/8 border border-red-500/15 px-4 py-3 text-sm text-red-600 text-center animate-[shake_0.4s_ease-in-out]">
                  {error}
                </div>
              )}

              {/* Summary */}
              <div className="mt-8 w-full rounded-xl bg-league-surface border border-league-text/8 p-4 animate-[fadeSlideUp_0.5s_ease-out_0.5s_both]">
                <div className="flex items-center justify-center gap-4 text-sm">
                  <span className="font-semibold text-league-text truncate">{homeTeamShortName}</span>
                  <span className="text-xl font-black tabular-nums text-league-primary shrink-0">
                    {homeScore} : {awayScore}
                  </span>
                  <span className="font-semibold text-league-text truncate">{awayTeamShortName}</span>
                </div>
                {comment && (
                  <p className="text-xs text-league-text/40 text-center mt-2 truncate">&ldquo;{comment}&rdquo;</p>
                )}
              </div>
            </div>

            {/* ───── SUCCESS PHASE ───── */}
            <div
              className={`absolute inset-0 overflow-hidden p-6 flex flex-col items-center justify-center transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] ${
                phase === "success" ? "opacity-100 scale-100" : "opacity-0 scale-95 pointer-events-none"
              }`}
            >
              <div className="relative mb-6">
                <div className="absolute inset-0 rounded-full bg-emerald-500/20 animate-[successRing_0.6s_ease-out_both]" />
                <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/10 animate-[successPop_0.5s_cubic-bezier(0.34,1.56,0.64,1)_0.1s_both]">
                  <CheckCircle2 className="h-10 w-10 text-emerald-500" strokeWidth={1.5} />
                </div>
              </div>
              <h3 className="text-xl font-bold text-league-text mb-2 text-center animate-[fadeSlideUp_0.5s_ease-out_0.2s_both]">
                {t.publicReport.success}
              </h3>
              <p className="text-sm text-league-text/50 text-center mb-8 animate-[fadeSlideUp_0.5s_ease-out_0.3s_both]">
                {t.publicReport.successDesc}
              </p>

              <div className="w-full rounded-xl bg-league-surface border border-emerald-500/15 p-5 animate-[fadeSlideUp_0.5s_ease-out_0.4s_both]">
                <div className="flex items-center justify-center gap-5">
                  <div className="text-center flex-1">
                    <span className="text-sm font-semibold text-league-text">{homeTeamShortName}</span>
                  </div>
                  <div className="text-3xl font-black tabular-nums text-emerald-600">
                    {homeScore} : {awayScore}
                  </div>
                  <div className="text-center flex-1">
                    <span className="text-sm font-semibold text-league-text">{awayTeamShortName}</span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={handleClose}
                className="mt-8 rounded-xl bg-league-text/5 px-6 py-2.5 text-sm font-semibold text-league-text/70 transition-colors hover:bg-league-text/10 animate-[fadeSlideUp_0.5s_ease-out_0.5s_both]"
              >
                {t.common.back}
              </button>
            </div>
          </div>
        </div>
      </div>

      <style
        dangerouslySetInnerHTML={{
          __html: `
        @keyframes otpPulse {
          0%, 100% { transform: scale(1); opacity: 0.4; }
          50% { transform: scale(1.15); opacity: 0.15; }
        }
        @keyframes otpBounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-2px); }
        }
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes successPop {
          from { transform: scale(0.5); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        @keyframes successRing {
          0% { transform: scale(0.8); opacity: 0; }
          50% { transform: scale(1.3); opacity: 0.3; }
          100% { transform: scale(1.5); opacity: 0; }
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-6px); }
          40% { transform: translateX(6px); }
          60% { transform: translateX(-4px); }
          80% { transform: translateX(4px); }
        }
      `,
        }}
      />
    </div>
  )
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function TeamBadge({ name, logoUrl }: { name: string; logoUrl?: string | null }) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      {logoUrl ? (
        <img src={logoUrl} alt={name} className="h-10 w-10 object-contain" />
      ) : (
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-league-primary/10 text-league-primary font-bold text-sm">
          {name.charAt(0).toUpperCase()}
        </div>
      )}
      <span className="text-xs font-bold text-league-text/70 uppercase tracking-wide truncate max-w-full">{name}</span>
    </div>
  )
}

function ScoreInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center justify-center gap-0.5">
      <button
        type="button"
        onClick={() => onChange(Math.max(0, value - 1))}
        className="flex h-8 w-8 items-center justify-center rounded-lg text-league-text/30 transition-colors hover:bg-league-text/5 hover:text-league-text/60"
      >
        <ChevronDown className="h-4 w-4" />
      </button>
      <input
        type="number"
        min={0}
        value={value}
        onChange={(e) => onChange(Math.max(0, Number(e.target.value) || 0))}
        className="h-14 w-14 rounded-xl border-2 border-league-text/10 bg-league-bg text-center text-2xl font-black tabular-nums text-league-text focus:outline-none focus:border-league-primary/40 focus:ring-4 focus:ring-league-primary/10 transition-all [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
      />
      <button
        type="button"
        onClick={() => onChange(value + 1)}
        className="flex h-8 w-8 items-center justify-center rounded-lg text-league-text/30 transition-colors hover:bg-league-text/5 hover:text-league-text/60"
      >
        <ChevronUp className="h-4 w-4" />
      </button>
    </div>
  )
}

// ─── Legacy export ───────────────────────────────────────────────────────────
export function PublicReportForm(props: PublicReportFormProps) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <PublicReportButton onClick={() => setOpen(true)} />
      <PublicReportPanel {...props} open={open} onClose={() => setOpen(false)} />
    </>
  )
}
