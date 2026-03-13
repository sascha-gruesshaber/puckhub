import { createFileRoute, Link } from "@tanstack/react-router"
import { Header } from "~/components/header"
import { Footer } from "~/components/footer"

export const Route = createFileRoute("/datenschutz")({
  component: Datenschutz,
  head: () => ({
    meta: [{ title: "Datenschutzerklärung – PuckHub" }],
  }),
})

function Datenschutz() {
  return (
    <>
      <Header />
      <main className="pt-32 pb-20">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <Link to="/" className="text-sm text-brand-slate hover:text-white transition-colors mb-6 inline-block">
            &larr; Zurück zur Startseite
          </Link>
          <h1 className="text-3xl font-bold mb-8">Datenschutzerklärung</h1>

          <div className="prose prose-invert max-w-none space-y-6 text-brand-slate [&_h2]:text-white [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:mt-8 [&_h2]:mb-3 [&_h3]:text-white [&_h3]:text-lg [&_h3]:font-medium [&_h3]:mt-6 [&_h3]:mb-2">
            <h2>1. Datenschutz auf einen Blick</h2>

            <h3>Allgemeine Hinweise</h3>
            <p>
              Die folgenden Hinweise geben einen einfachen Überblick darüber, was mit Ihren personenbezogenen
              Daten passiert, wenn Sie diese Website besuchen. Personenbezogene Daten sind alle Daten, mit denen
              Sie persönlich identifiziert werden können.
            </p>

            <h3>Datenerfassung auf dieser Website</h3>
            <p>
              Die Datenverarbeitung auf dieser Website erfolgt durch den Websitebetreiber.
              Dessen Kontaktdaten können Sie dem Impressum dieser Website entnehmen.
            </p>

            <h2>2. Hosting</h2>
            <p>
              Wir hosten die Inhalte unserer Website bei folgendem Anbieter:
              Die Server befinden sich in Deutschland. Details werden ergänzt, sobald die Produktivumgebung
              feststeht.
            </p>

            <h2>3. Allgemeine Hinweise und Pflichtinformationen</h2>

            <h3>Datenschutz</h3>
            <p>
              Die Betreiber dieser Seiten nehmen den Schutz Ihrer persönlichen Daten sehr ernst.
              Wir behandeln Ihre personenbezogenen Daten vertraulich und entsprechend den gesetzlichen
              Datenschutzvorschriften sowie dieser Datenschutzerklärung.
            </p>

            <h3>Verantwortliche Stelle</h3>
            <p>
              Die verantwortliche Stelle für die Datenverarbeitung auf dieser Website ist:<br />
              Sascha Grüßhaber<br />
              Wiesenweg 34b<br />
              86647 Buttenwiesen<br />
              Deutschland<br />
              E-Mail: info-puckhub@gruesshaber.eu
            </p>

            <h2>4. Datenerfassung auf dieser Website</h2>

            <h3>Server-Log-Dateien</h3>
            <p>
              Der Provider der Seiten erhebt und speichert automatisch Informationen in so genannten
              Server-Log-Dateien, die Ihr Browser automatisch an uns übermittelt. Dies sind: Browsertyp und
              Browserversion, verwendetes Betriebssystem, Referrer URL, Hostname des zugreifenden Rechners,
              Uhrzeit der Serveranfrage, IP-Adresse.
            </p>
            <p>
              Eine Zusammenführung dieser Daten mit anderen Datenquellen wird nicht vorgenommen.
              Die Erfassung dieser Daten erfolgt auf Grundlage von Art. 6 Abs. 1 lit. f DSGVO.
            </p>

            <h2>5. Analyse-Tools und Werbung</h2>
            <p>
              Diese Website verwendet derzeit keine Analyse-Tools oder Werbedienste.
            </p>

            <h2>6. Plugins und Tools</h2>

            <h3>Google Fonts (extern)</h3>
            <p>
              Diese Seite nutzt zur einheitlichen Darstellung von Schriftarten so genannte Google Fonts,
              die von Google bereitgestellt werden. Beim Aufruf einer Seite lädt Ihr Browser die benötigten
              Fonts direkt von Google, um sie Ihrem Browser korrekt anzuzeigen.
            </p>
            <p>
              Zu diesem Zweck muss der von Ihnen verwendete Browser Verbindung zu den Servern von Google
              aufnehmen. Weitere Informationen zu Google Fonts finden Sie unter
              https://developers.google.com/fonts/faq und in der Datenschutzerklärung von Google:
              https://policies.google.com/privacy.
            </p>
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}
