import { useScrollReveal, revealClasses } from "~/hooks/useScrollEffects"
import { Check, X, Loader2, MessageSquare } from "lucide-react"
import { useT } from "~/i18n"
import { trpc } from "../../lib/trpc"

function formatPrice(cents: number): string {
  return (cents / 100).toFixed(2).replace(".", ",")
}

export function Pricing() {
  const t = useT()
  const header = useScrollReveal()
  const cards = useScrollReveal()
  const { data: plans, isLoading } = trpc.publicSite.listPlans.useQuery(undefined, {
    staleTime: 300_000,
  })

  function formatLimit(value: number | null): string {
    return value === null ? t.pricing.unlimited : String(value)
  }

  return (
    <section id="pricing" className="py-20 sm:py-28 scroll-mt-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div ref={header.ref} className={`text-center mb-12 ${revealClasses(header)}`}>
          <h2 className="text-3xl sm:text-4xl font-bold">{t.pricing.heading}</h2>
          <p className="mt-4 text-lg text-brand-slate max-w-2xl mx-auto">{t.pricing.subheading}</p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-brand-gold" />
          </div>
        ) : !plans || plans.length === 0 ? (
          <p className="text-center text-brand-slate">{t.pricing.noPlans}</p>
        ) : (
          <div
            ref={cards.ref}
            className={`grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto ${revealClasses(cards, "stagger")}`}
          >
            {plans.map((plan, index) => {
              const price = plan.priceYearly
              const isPopular = index === 1

              return (
                <div
                  key={plan.id}
                  className={`relative rounded-2xl border p-8 flex flex-col ${
                    isPopular
                      ? "border-brand-gold/40 bg-brand-gold/[0.04] ring-1 ring-brand-gold/20"
                      : "border-white/10 bg-white/[0.02]"
                  }`}
                >
                  {isPopular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-brand-gold px-3 py-0.5 text-xs font-bold text-brand-navy">
                      {t.pricing.popular}
                    </div>
                  )}

                  <h3 className="text-xl font-bold">{plan.name}</h3>
                  {t.pricing.planDescriptions[plan.slug as keyof typeof t.pricing.planDescriptions] && (
                    <p className="mt-2 text-sm text-brand-slate">
                      {t.pricing.planDescriptions[plan.slug as keyof typeof t.pricing.planDescriptions]}
                    </p>
                  )}

                  <div className="mt-6 mb-8">
                    {price === 0 ? (
                      <span className="text-4xl font-extrabold">{t.pricing.free}</span>
                    ) : (
                      <>
                        <span className="text-4xl font-extrabold">{formatPrice(price)} €</span>
                        <span className="text-brand-slate ml-1">{t.pricing.perYear}</span>
                      </>
                    )}
                  </div>

                  {/* Limits */}
                  <div className="space-y-3 flex-1">
                    <PlanLimit label={t.pricing.limits.teams} value={formatLimit(plan.maxTeams)} />
                    <PlanLimit label={t.pricing.limits.players} value={formatLimit(plan.maxPlayers)} />
                    <PlanLimit label={t.pricing.limits.seasons} value={formatLimit(plan.maxSeasons)} />
                    <PlanLimit
                      label={t.pricing.limits.divisionsPerSeason}
                      value={formatLimit(plan.maxDivisionsPerSeason)}
                    />
                    <PlanLimit label={t.pricing.limits.news} value={formatLimit(plan.maxNewsArticles)} />
                    <PlanLimit label={t.pricing.limits.pages} value={formatLimit(plan.maxPages)} />
                    <PlanLimit label={t.pricing.limits.sponsors} value={formatLimit(plan.maxSponsors)} />

                    <div className="pt-3 border-t border-white/10 space-y-2">
                      <PlanFeature label={t.pricing.planFeatures.gameReports} enabled={plan.featureGameReports} />
                      <PlanFeature label={t.pricing.planFeatures.playerStats} enabled={plan.featurePlayerStats} />
                      <PlanFeature label={t.pricing.planFeatures.advancedStats} enabled={plan.featureAdvancedStats} />
                      <PlanFeature label={t.pricing.planFeatures.website} enabled={plan.featureWebsiteBuilder} />
                      <PlanFeature label={t.pricing.planFeatures.customDomain} enabled={plan.featureCustomDomain} />
                      <PlanFeature label={t.pricing.planFeatures.sponsorMgmt} enabled={plan.featureSponsorMgmt} />
                      <PlanFeature label={t.pricing.planFeatures.trikotDesigner} enabled={plan.featureTrikotDesigner} />
                      <PlanFeature label={t.pricing.planFeatures.scheduler} enabled={plan.featureScheduler} />
                      <PlanFeature label={t.pricing.planFeatures.scheduledNews} enabled={plan.featureScheduledNews} />
                      <PlanFeature label={t.pricing.planFeatures.advancedRoles} enabled={plan.featureAdvancedRoles} />
                      <PlanFeature
                        label={t.pricing.planFeatures.publicReports}
                        enabled={plan.featurePublicReports}
                      />
                    </div>
                  </div>

                  <a
                    href={`/contact?plan=${plan.slug}`}
                    className={`mt-8 group flex items-center justify-center gap-2 rounded-lg py-3 text-sm font-semibold transition-all ${
                      isPopular
                        ? "bg-brand-gold text-brand-navy hover:bg-brand-gold-dark"
                        : "border border-white/20 text-white hover:bg-white/5"
                    }`}
                  >
                    <MessageSquare className="h-4 w-4" />
                    {t.pricing.getInTouch}
                  </a>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </section>
  )
}

function PlanLimit({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-brand-slate">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  )
}

function PlanFeature({ label, enabled }: { label: string; enabled: boolean }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      {enabled ? (
        <Check className="h-4 w-4 shrink-0 text-emerald-400" />
      ) : (
        <X className="h-4 w-4 shrink-0 text-white/20" />
      )}
      <span className={enabled ? "text-white" : "text-white/30"}>{label}</span>
    </div>
  )
}
