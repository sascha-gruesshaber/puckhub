import { createFileRoute, Link } from "@tanstack/react-router"
import { Header } from "~/components/header"
import { Footer } from "~/components/footer"

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
          <h1 className="text-3xl font-bold mb-8">Impressum</h1>

          <div className="prose prose-invert max-w-none space-y-6 text-brand-slate [&_h2]:text-white [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:mt-8 [&_h2]:mb-3">
            <h2>Angaben gemäß § 5 TMG</h2>
            <p>
              Sascha Grüßhaber<br />
              Wiesenweg 34b<br />
              86647 Buttenwiesen<br />
              Deutschland
            </p>

            <h2>Kontakt</h2>
            <p>
              E-Mail: info-puckhub@gruesshaber.eu
            </p>

            <h2>Verantwortlich für den Inhalt nach § 55 Abs. 2 RStV</h2>
            <p>
              Sascha Grüßhaber<br />
              Wiesenweg 34b<br />
              86647 Buttenwiesen<br />
              Deutschland
            </p>

            <h2>Haftungsausschluss</h2>
            <p>
              Die Inhalte dieser Website werden mit größtmöglicher Sorgfalt erstellt. Der Anbieter übernimmt
              jedoch keine Gewähr für die Richtigkeit, Vollständigkeit und Aktualität der bereitgestellten Inhalte.
            </p>

            <h2>Urheberrecht</h2>
            <p>
              Die durch die Seitenbetreiber erstellten Inhalte und Werke auf diesen Seiten unterliegen dem
              deutschen Urheberrecht. Die Vervielfältigung, Bearbeitung, Verbreitung und jede Art der Verwertung
              außerhalb der Grenzen des Urheberrechtes bedürfen der schriftlichen Zustimmung des jeweiligen
              Autors bzw. Erstellers.
            </p>
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}
