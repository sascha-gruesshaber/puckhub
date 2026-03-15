import { useState } from "react"
import { createFileRoute } from "@tanstack/react-router"
import { Header } from "~/components/header"
import { Hero } from "~/components/hero"
import { AmbientBackground } from "~/components/ambientBackground"
import { Features } from "~/components/features"
import { FeatureShowcase } from "~/components/featureShowcase"
import { Pricing } from "~/components/pricing"
import { DemoCta, DemoDialog } from "~/components/demoCta"
import { Footer } from "~/components/footer"

export const Route = createFileRoute("/")({
  component: LandingPage,
})

function LandingPage() {
  const [demoOpen, setDemoOpen] = useState(false)
  const openDemo = () => setDemoOpen(true)

  return (
    <>
      <Header onOpenDemo={openDemo} />
      <main>
        <AmbientBackground>
          <Hero onOpenDemo={openDemo} />
          <Features />
        </AmbientBackground>
        <FeatureShowcase />
        <Pricing />
        <DemoCta onOpenDemo={openDemo} />
      </main>
      <Footer />
      {demoOpen && <DemoDialog onClose={() => setDemoOpen(false)} />}
    </>
  )
}
