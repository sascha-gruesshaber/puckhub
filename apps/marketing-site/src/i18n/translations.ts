export const translations = {
  de: {
    meta: {
      title: "PuckHub – Die All-in-One Plattform für Eishockey-Ligen",
      description:
        "Verwalte deine Eishockey-Liga komplett digital: Saisonplanung, Spielberichte, Statistiken, Tabellen und eine eigene Liga-Website – alles in einer Plattform.",
    },
    header: {
      features: "Features",
      pricing: "Preise",
      cta: "Demo testen",
      featuresSections: [
        { label: "Administration", href: "#features-admin" },
        { label: "Betrieb & Statistiken", href: "#features-operations" },
        { label: "Community & Fans", href: "#features-community" },
      ],
    },
    hero: {
      titleLine1: "Die All-in-One Plattform",
      titleLine2: "für Eishockey-Ligen",
      subtitle:
        "Saisonplanung, Spielberichte, Statistiken, Tabellen und eine eigene Liga-Website – alles in einer Plattform.",
      cta: "Demo testen",
      pricing: "Preise ansehen",
    },
    features: {
      heading: "Alles, was deine Liga braucht",
      subheading: "Von der Saisonplanung bis zur öffentlichen Website – PuckHub deckt den gesamten Workflow ab.",
      prevLabel: "Vorheriges Feature",
      nextLabel: "Nächstes Feature",
      slides: [
        {
          title: "Dashboard",
          description:
            "Behalte den Überblick über deine gesamte Liga – anstehende Spiele, aktuelle Tabellen und die neuesten Ergebnisse auf einen Blick.",
        },
        {
          title: "Saison-Strukturen",
          description:
            "Erstelle komplexe Saisonpläne mit Divisionen, Runden und automatischen Spielplänen per Drag & Drop.",
        },
        {
          title: "Spielberichte",
          description: "Erfasse Tore, Strafen und Aufstellungen in Echtzeit direkt während des Spiels.",
        },
        {
          title: "Eigene Liga-Website",
          description:
            "Jede Liga bekommt eine eigene Website mit Ergebnissen, Tabellen, News und Spielplan – mit deutschen oder englischen URLs.",
        },
        {
          title: "Tabellen & Statistiken",
          description:
            "Automatische Tabellenberechnung, Spielerstatistiken und Torjägerlisten auf der öffentlichen Liga-Website in Echtzeit.",
        },
        {
          title: "KI-Spielberichte",
          description:
            "Nach jedem Spiel generiert die KI automatisch einen professionellen Spielbericht basierend auf den echten Spieldaten.",
        },
      ],
    },
    featureShowcase: {
      heading: "Leistungsstarke Tools für jeden Aspekt",
      subheading: "Vom Saisonaufbau über den Spielbetrieb bis zur Fan-Community – PuckHub liefert die richtigen Werkzeuge.",
      sections: [
        { id: "admin", title: "Administration", description: "Liga aufbauen und verwalten" },
        { id: "operations", title: "Betrieb & Statistiken", description: "Spielbetrieb, Daten und Analysen" },
        { id: "community", title: "Community & Fans", description: "Öffentliche Features für Fans und Zuschauer" },
      ],
      items: [
        // ── Section 0: Administration (items 0–3) ──
        {
          badge: "Highlight Feature",
          title: "Visueller Saison-Struktur-Builder",
          description:
            "Erstelle komplexe Saisonhierarchien per Drag & Drop auf einem interaktiven Canvas. Definiere Divisionen, Runden und Spielpläne – alles visuell und intuitiv.",
          highlights: [
            "Saison als übergreifender Zeitraum",
            "Divisionen für Spielklassen und Altersgruppen",
            "Runden für Vorrunde, Playoffs und Relegation",
            "Automatischer Spielplan pro Runde",
          ],
        },
        {
          badge: "Automatisierung",
          title: "Spielplan-Generator",
          description:
            "Erstelle automatisch Spielpläne für jede Runde deiner Liga. Ob Round-Robin, Hin- und Rückrunde oder K.O.-System – der Generator spart Stunden manueller Arbeit.",
          highlights: [
            "Automatische Spielplanerstellung",
            "Round-Robin und K.O.-System",
            "Flexible Terminvergabe",
            "Rückrunden mit einem Klick",
          ],
        },
        {
          badge: "Kommunikation",
          title: "Content Management",
          description:
            "Halte deine Liga-Community auf dem Laufenden. Mit dem integrierten CMS veröffentlichst du News, erstellst eigene Seiten und steuerst alle Inhalte zentral – ohne externe Tools.",
          highlights: [
            "News erstellen und veröffentlichen",
            "Eigene Seiten mit Rich-Text-Editor",
            "Geplante Veröffentlichungen",
            "Bilder und Medien einbetten",
          ],
        },
        {
          badge: "Sicherheit",
          title: "Rollenbasierte Zugriffskontrolle",
          description:
            "Definiere klar, wer was sehen und bearbeiten darf. Vom Owner über Admins bis zum Scorer – jede Rolle hat genau die Berechtigungen, die sie braucht. Kein Mehr, kein Weniger.",
          highlights: [
            "Owner mit vollem Zugriff",
            "Admins für Liga-Verwaltung",
            "Scorer nur für Spielberichte",
            "Erweiterte Rollen im Pro-Plan",
          ],
        },
        // ── Section 1: Betrieb & Statistiken (items 4–7) ──
        {
          badge: "KI-Power",
          title: "KI-Spielberichte",
          description:
            "Lass die KI nach jedem Spiel automatisch einen professionellen Spielbericht generieren. Basierend auf Toren, Strafen und Spielverlauf entsteht in Sekunden ein packender Bericht für deine Liga-Website – auf Deutsch oder Englisch.",
          highlights: [
            "Automatische Spielzusammenfassungen per KI",
            "Basierend auf echten Spieldaten",
            "Deutsch und Englisch verfügbar",
            "Monatliches Token-Budget pro Liga",
          ],
        },
        {
          badge: "Öffentliche Liga-Website",
          title: "Live-Statistiken & Tabellen",
          description:
            "Jede Liga erhält eine eigene öffentliche Website mit Echtzeit-Tabellen, Torjägerlisten, Torwart-Statistiken und interaktiven Diagrammen. Fans sehen alle Ergebnisse und Statistiken auf einen Blick – mit deutschen oder englischen URLs.",
          highlights: [
            "Automatische Tabellenberechnung in Echtzeit",
            "Torjäger-, Torwart- und Strafstatistiken",
            "Interaktive Charts und Teamvergleiche",
            "Lokalisierte URLs (deutsch/englisch)",
          ],
        },
        {
          badge: "Teamhistorie",
          title: "Saisonverlauf & Spielerstatistiken",
          description:
            "Verfolge die Entwicklung jedes Teams über alle Saisons hinweg. Punkte, Siege, Niederlagen und Top-Scorer werden automatisch aggregiert und in interaktiven Charts visualisiert – für Fans, Trainer und Vereinschronisten.",
          highlights: [
            "Saisonübergreifende Team-Statistiken",
            "Top-Scorer und Torwart-Rankings pro Saison",
            "Interaktive Verlaufsdiagramme",
            "Detaillierte Spielerprofile mit Karrieredaten",
          ],
        },
        {
          badge: "Kreativ-Tool",
          title: "Trikot-Designer",
          description:
            "Gestalte einzigartige Teamtrikots mit dem visuellen SVG-Designer direkt im Browser. Jedes Team erhält ein individuelles Erscheinungsbild, das auf der Liga-Website und in Spielberichten angezeigt wird.",
          highlights: [
            "Farben, Muster und Logos frei anpassen",
            "Echtzeit-Vorschau im Browser",
            "Trikots im Team-Profil sichtbar",
            "SVG-basiert für gestochen scharfe Darstellung",
          ],
        },
        // ── Section 2: Community & Fans (items 8–10) ──
        {
          badge: "Community",
          title: "Öffentliche Spielberichte",
          description:
            "Lass Fans und Zuschauer Spielergebnisse direkt auf der Liga-Website melden – ohne Login. Konfigurierbare E-Mail-OTP-Verifizierung und ein mathematischer Captcha schützen vor Missbrauch. Eingereichte Berichte werden im Admin-Panel zur Freigabe gelistet.",
          highlights: [
            "Spielergebnisse ohne Login melden",
            "E-Mail-OTP-Verifizierung optional aktivierbar",
            "Mathematischer Captcha als Bot-Schutz",
            "Admin-Review-Panel für eingereichte Berichte",
          ],
        },
        {
          badge: "Übersicht",
          title: "Saison-Strukturübersicht",
          description:
            "Eine visuelle Übersichtsseite zeigt, wie eine Saison organisiert ist – Divisionen, Runden und Teamzuordnungen in einem übersichtlichen Karten-Layout. Öffentlich auf der Liga-Website für alle Fans zugänglich.",
          highlights: [
            "Divisionen mit Runden-Timelines",
            "Team-Zuordnungen auf einen Blick",
            "Responsive Design für alle Geräte",
            "Öffentlich auf der Liga-Website",
          ],
        },
        {
          badge: "Internationalisierung",
          title: "Vollständig zweisprachig",
          description:
            "Alle Apps unterstützen Deutsch und Englisch – inklusive lokalisierter URL-Pfade. Öffentliche Spielberichte, Strukturseiten, Statistiken und alle Features sind komplett in beiden Sprachen verfügbar.",
          highlights: [
            "Deutsch und Englisch vollständig unterstützt",
            "Lokalisierte URL-Pfade (/tabelle, /standings)",
            "Automatische Spracherkennung",
            "Sprachumschalter in der Navigation",
          ],
        },
      ],
    },
    pricing: {
      heading: "Preise",
      subheading: "Wähle den passenden Plan für deine Liga. Jederzeit up- oder downgraden.",
      noPlans: "Keine Pläne verfügbar.",
      popular: "Beliebt",
      free: "Kostenlos",
      perYear: "/ Jahr",
      startFree: "Kostenlos starten",
      tryDemo: "Demo testen",
      unlimited: "Unbegrenzt",
      limits: {
        teams: "Teams",
        players: "Spieler",
        seasons: "Saisons",
        divisionsPerSeason: "Divisionen/Saison",
        news: "News",
        pages: "Seiten",
        sponsors: "Sponsoren",
      },
      planDescriptions: {
        free: "Für kleine Hobbyturniere und zum Ausprobieren",
        starter: "Für regionale Ligen mit Website und Sponsoren",
        pro: "Alle Features ohne Limits – ideal für große Ligen und Verbände",
      },
      planFeatures: {
        gameReports: "Spielberichte",
        playerStats: "Spielerstatistiken",
        advancedStats: "Erweiterte Statistiken",
        website: "Liga-Website",
        customDomain: "Eigene Domain",
        sponsorMgmt: "Sponsoren-Verwaltung",
        trikotDesigner: "Trikot-Designer",
        scheduler: "Spielplan-Generator",
        scheduledNews: "Geplante News",
        advancedRoles: "Erweiterte Rollen",
        publicReports: "Öffentliche Spielmeldungen",
      },
    },
    demoCta: {
      heading: "Jetzt kostenlos testen",
      subheading:
        "Teste alle Features in unserer Demo-Umgebung – kein Account nötig. Die Demo-Daten werden regelmäßig zurückgesetzt.",
      openPortal: "Demo-Portal öffnen",
    },
    demoDialog: {
      title: "Demo-Zugang wählen",
      subtitle: "Wähle eine Rolle – du wirst automatisch eingeloggt.",
      loginFailed: "Login fehlgeschlagen",
      viewLeagueSite: "Liga-Website ansehen",
      viewLeagueSiteDesc: "Die öffentliche Seite der Demo-Liga",
      users: [
        { label: "Admin (Owner)", description: "Voller Zugriff auf alle Funktionen" },
        { label: "Editor", description: "Inhalte bearbeiten, keine Verwaltung" },
        { label: "Reporter", description: "Nur Spielberichte erfassen" },
      ],
    },
    footer: {
      impressum: "Impressum",
      datenschutz: "Datenschutz",
      copyright: "Alle Rechte vorbehalten.",
    },
  },

  en: {
    meta: {
      title: "PuckHub – The All-in-One Platform for Ice Hockey Leagues",
      description:
        "Manage your ice hockey league digitally: season planning, game reports, statistics, standings, and a dedicated league website – all in one platform.",
    },
    header: {
      features: "Features",
      pricing: "Pricing",
      cta: "Try Demo",
      featuresSections: [
        { label: "Administration", href: "#features-admin" },
        { label: "Operations & Statistics", href: "#features-operations" },
        { label: "Community & Fans", href: "#features-community" },
      ],
    },
    hero: {
      titleLine1: "The All-in-One Platform",
      titleLine2: "for Ice Hockey Leagues",
      subtitle:
        "Season planning, game reports, statistics, standings, and a dedicated league website – all in one platform.",
      cta: "Try Demo",
      pricing: "View Pricing",
    },
    features: {
      heading: "Everything Your League Needs",
      subheading: "From season planning to a public website – PuckHub covers the entire workflow.",
      prevLabel: "Previous feature",
      nextLabel: "Next feature",
      slides: [
        {
          title: "Dashboard",
          description:
            "Keep track of your entire league – upcoming games, current standings, and the latest results at a glance.",
        },
        {
          title: "Season Structures",
          description: "Create complex season plans with divisions, rounds, and automatic schedules via drag & drop.",
        },
        {
          title: "Game Reports",
          description: "Record goals, penalties, and lineups in real-time directly during the game.",
        },
        {
          title: "League Website",
          description:
            "Every league gets its own website with results, standings, news, and schedules – with localized URLs in German or English.",
        },
        {
          title: "Standings & Statistics",
          description:
            "Automatic standings calculation, player statistics, and scoring leaders on the public league website in real-time.",
        },
        {
          title: "AI Game Recaps",
          description:
            "After every game, AI automatically generates a professional game recap based on real game data.",
        },
      ],
    },
    featureShowcase: {
      heading: "Powerful Tools for Every Aspect",
      subheading: "From season setup to game operations to fan engagement – PuckHub delivers the right tools.",
      sections: [
        { id: "admin", title: "Administration", description: "Set up and manage your league" },
        { id: "operations", title: "Operations & Statistics", description: "Game day, data, and analytics" },
        { id: "community", title: "Community & Fans", description: "Public features for fans and spectators" },
      ],
      items: [
        // ── Section 0: Administration (items 0–3) ──
        {
          badge: "Highlight Feature",
          title: "Visual Season Structure Builder",
          description:
            "Create complex season hierarchies via drag & drop on an interactive canvas. Define divisions, rounds, and schedules – all visual and intuitive.",
          highlights: [
            "Season as the overarching time frame",
            "Divisions for skill levels and age groups",
            "Rounds for regular season, playoffs, and relegation",
            "Automatic schedule per round",
          ],
        },
        {
          badge: "Automation",
          title: "Schedule Generator",
          description:
            "Automatically create game schedules for every round of your league. Whether round-robin, home-and-away, or knockout – the generator saves hours of manual work.",
          highlights: [
            "Automatic schedule generation",
            "Round-robin and knockout formats",
            "Flexible date assignment",
            "Return legs with one click",
          ],
        },
        {
          badge: "Communication",
          title: "Content Management",
          description:
            "Keep your league community up to date. With the integrated CMS, publish news, create custom pages, and manage all content centrally – no external tools needed.",
          highlights: [
            "Create and publish news articles",
            "Custom pages with rich-text editor",
            "Scheduled publications",
            "Embed images and media",
          ],
        },
        {
          badge: "Security",
          title: "Role-Based Access Control",
          description:
            "Define clearly who can see and edit what. From owner to admin to scorer – each role has exactly the permissions it needs. No more, no less.",
          highlights: [
            "Owner with full access",
            "Admins for league management",
            "Scorers for game reports only",
            "Advanced roles in Pro plan",
          ],
        },
        // ── Section 1: Operations & Statistics (items 4–7) ──
        {
          badge: "AI-Powered",
          title: "AI Game Recaps",
          description:
            "Let AI automatically generate a professional game recap after every match. Based on goals, penalties, and game flow, a compelling report is created in seconds for your league website – in German or English.",
          highlights: [
            "Automatic game summaries powered by AI",
            "Based on real game data",
            "Available in German and English",
            "Monthly token budget per league",
          ],
        },
        {
          badge: "Public League Website",
          title: "Live Statistics & Standings",
          description:
            "Every league gets its own public website with real-time standings, scoring leaders, goalie statistics, and interactive charts. Fans can see all results and stats at a glance – with localized URLs.",
          highlights: [
            "Automatic real-time standings calculation",
            "Scorer, goalie, and penalty statistics",
            "Interactive charts and team comparisons",
            "Localized URLs (German/English)",
          ],
        },
        {
          badge: "Team History",
          title: "Season Progression & Player Stats",
          description:
            "Track the evolution of every team across all seasons. Points, wins, losses, and top scorers are automatically aggregated and visualized in interactive charts – for fans, coaches, and club historians.",
          highlights: [
            "Cross-season team statistics",
            "Top scorer and goalie rankings per season",
            "Interactive progression charts",
            "Detailed player profiles with career data",
          ],
        },
        {
          badge: "Creative Tool",
          title: "Jersey Designer",
          description:
            "Design unique team jerseys with the visual SVG designer right in your browser. Each team gets a distinctive look displayed on the league website and in game reports.",
          highlights: [
            "Customize colors, patterns, and logos",
            "Real-time preview in browser",
            "Jerseys visible in team profiles",
            "SVG-based for crisp rendering",
          ],
        },
        // ── Section 2: Community & Fans (items 8–10) ──
        {
          badge: "Community",
          title: "Public Game Reporting",
          description:
            "Let fans and spectators submit game scores directly on the league website – no login required. Configurable email OTP verification and a math captcha protect against abuse. Submitted reports are listed in the admin panel for review.",
          highlights: [
            "Submit game scores without login",
            "Optional email OTP verification",
            "Math captcha bot protection",
            "Admin review panel for submissions",
          ],
        },
        {
          badge: "Overview",
          title: "Season Structure Overview",
          description:
            "A visual overview page shows how a season is organized – divisions, rounds, and team assignments in a clean card layout. Publicly accessible on the league website for all fans.",
          highlights: [
            "Divisions with round timelines",
            "Team assignments at a glance",
            "Responsive design for all devices",
            "Public on the league website",
          ],
        },
        {
          badge: "Internationalization",
          title: "Fully Bilingual",
          description:
            "All apps support German and English – including localized URL paths. Public game reports, structure pages, statistics, and all features are fully available in both languages.",
          highlights: [
            "Full German and English support",
            "Localized URL paths (/tabelle, /standings)",
            "Automatic language detection",
            "Language switcher in navigation",
          ],
        },
      ],
    },
    pricing: {
      heading: "Pricing",
      subheading: "Choose the right plan for your league. Upgrade or downgrade anytime.",
      noPlans: "No plans available.",
      popular: "Popular",
      free: "Free",
      perYear: "/ year",
      startFree: "Start for free",
      tryDemo: "Try Demo",
      unlimited: "Unlimited",
      limits: {
        teams: "Teams",
        players: "Players",
        seasons: "Seasons",
        divisionsPerSeason: "Divisions/Season",
        news: "News",
        pages: "Pages",
        sponsors: "Sponsors",
      },
      planDescriptions: {
        free: "For small hobby tournaments and trying things out",
        starter: "For regional leagues with websites and sponsors",
        pro: "All features with no limits – ideal for large leagues and associations",
      },
      planFeatures: {
        gameReports: "Game Reports",
        playerStats: "Player Statistics",
        advancedStats: "Advanced Statistics",
        website: "League Website",
        customDomain: "Custom Domain",
        sponsorMgmt: "Sponsor Management",
        trikotDesigner: "Jersey Designer",
        scheduler: "Schedule Generator",
        scheduledNews: "Scheduled News",
        advancedRoles: "Advanced Roles",
        publicReports: "Public Game Reports",
      },
    },
    demoCta: {
      heading: "Try It for Free",
      subheading: "Test all features in our demo environment – no account required. Demo data is reset regularly.",
      openPortal: "Open Demo Portal",
    },
    demoDialog: {
      title: "Choose Demo Access",
      subtitle: "Pick a role – you'll be logged in automatically.",
      loginFailed: "Login failed",
      viewLeagueSite: "View League Website",
      viewLeagueSiteDesc: "The public site of the demo league",
      users: [
        { label: "Admin (Owner)", description: "Full access to all features" },
        { label: "Editor", description: "Edit content, no administration" },
        { label: "Reporter", description: "Game reports only" },
      ],
    },
    footer: {
      impressum: "Legal Notice",
      datenschutz: "Privacy Policy",
      copyright: "All rights reserved.",
    },
  },
} as const

export type Locale = keyof typeof translations
export type Translations = (typeof translations)[Locale]
