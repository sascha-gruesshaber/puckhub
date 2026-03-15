import { createFileRoute, Link } from "@tanstack/react-router"
import { Footer } from "~/components/footer"
import { Header } from "~/components/header"

export const Route = createFileRoute("/impressum")({
  component: Impressum,
  head: () => ({
    meta: [{ title: "Impressum – PuckHub" }],
  }),
})

function Impressum() {
  return (
    <>
      <Header />
      <main className="pt-32 pb-20">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <Link to="/" className="text-sm text-brand-slate hover:text-white transition-colors mb-6 inline-block">
            &larr; Zurück zur Startseite
          </Link>
          <h1 className="text-3xl font-bold mb-8 text-white">Impressum</h1>

          <div className="prose prose-invert max-w-none text-brand-slate [&_h2]:text-white [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:mt-10 [&_h2]:mb-4 [&_p]:mb-3 [&_p]:leading-relaxed [&_a]:text-brand-gold [&_a]:underline [&_a]:underline-offset-2 hover:[&_a]:text-brand-gold-dark">
            <p>
              Sascha Gr&uuml;&szlig;haber
              <br />
              Wiesenweg 34B
              <br />
              86647 Buttenwiesen
            </p>

            <h2>Kontakt</h2>
            <p>E-Mail: info-puckhub@gruesshaber.eu</p>

            <p>
              Quelle:{" "}
              <a href="https://www.e-recht24.de/impressum-generator.html">
                https://www.e-recht24.de/impressum-generator.html
              </a>
            </p>
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}
