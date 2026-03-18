import { createFileRoute } from "@tanstack/react-router"
import { useState } from "react"
import { AmbientBackground } from "~/components/ambientBackground"
import { BottomCtas, DemoDialog } from "~/components/demoCta"
import { FeatureShowcase } from "~/components/featureShowcase"
import { Features } from "~/components/features"
import { Footer } from "~/components/footer"
import { Header } from "~/components/header"
import { Hero } from "~/components/hero"
import { Pricing } from "~/components/pricing"

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
        <BottomCtas onOpenDemo={openDemo} />
      </main>
      <Footer />
      {demoOpen && <DemoDialog onClose={() => setDemoOpen(false)} />}
    </>
  )
}
