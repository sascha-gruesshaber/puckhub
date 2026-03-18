import { createFileRoute } from "@tanstack/react-router"
import { ContactForm } from "~/components/contactForm"
import { Footer } from "~/components/footer"
import { Header } from "~/components/header"

export const Route = createFileRoute("/contact")({
  validateSearch: (search: Record<string, unknown>) => ({
    plan: typeof search.plan === "string" ? search.plan : undefined,
  }),
  component: ContactPage,
})

function ContactPage() {
  const { plan } = Route.useSearch()

  return (
    <>
      <Header />
      <main>
        <ContactForm plan={plan} />
      </main>
      <Footer />
    </>
  )
}
