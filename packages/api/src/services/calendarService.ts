import icalGenerator, { type ICalCalendar, ICalEventStatus } from "ical-generator"

/**
 * Game with all required relations for calendar export.
 */
export interface GameWithRelations {
  id: string
  scheduledAt: Date | null
  gameNumber: number | null
  updatedAt: Date
  notes: string | null
  homeTeam: {
    id: string
    name: string
    shortName: string | null
  }
  awayTeam: {
    id: string
    name: string
    shortName: string | null
  }
  venue: {
    id: string
    name: string
    city: string | null
    address: string | null
  } | null
  round: {
    id: string
    name: string
    division: {
      id: string
      name: string
    }
  }
}

export interface GenerateICSOptions {
  /**
   * Calendar title (default: "PuckHub Spielplan")
   */
  title?: string

  /**
   * Timezone for events (default: "Europe/Berlin")
   */
  timezone?: string

  /**
   * Calendar name/identifier
   */
  name?: string

  /**
   * Calendar description
   */
  description?: string

  /**
   * League name to prefix each event (optional)
   */
  leagueName?: string
}

/**
 * Generates an RFC 5545 compliant ICS calendar file from an array of games.
 *
 * @param games - Array of games with required relations (homeTeam, awayTeam, venue, round with division)
 * @param options - Optional calendar configuration
 * @returns ICS file content as string
 *
 * @example
 * ```ts
 * const games = await db.query.games.findMany({
 *   where: eq(schema.games.seasonId, seasonId),
 *   with: { homeTeam: true, awayTeam: true, venue: true, round: { with: { division: true } } }
 * });
 * const icsContent = generateICS(games, { title: "Saison 2024/25" });
 * ```
 */
export function generateICS(games: GameWithRelations[], options: GenerateICSOptions = {}): string {
  const {
    timezone = "Europe/Berlin",
    name = "PuckHub Calendar",
    description = "Eishockey Spielplan generiert von PuckHub CMS",
    leagueName,
  } = options

  // Create calendar instance
  const calendar: ICalCalendar = icalGenerator({
    name,
    description,
    timezone,
    prodId: {
      company: "PuckHub",
      product: "CMS",
    },
    // Suggest calendar apps to refresh every hour
    ttl: 3600,
  })

  // Filter games that have a scheduled date (ICS requires start time)
  const scheduledGames = games.filter((game) => game.scheduledAt !== null)

  // Convert each game to a calendar event
  for (const game of scheduledGames) {
    // Safety check (TypeScript knows scheduledAt is not null here, but be explicit)
    if (!game.scheduledAt) continue

    // Build event summary (title)
    const homeTeamName = game.homeTeam.shortName || game.homeTeam.name
    const awayTeamName = game.awayTeam.shortName || game.awayTeam.name
    const summary = leagueName
      ? `${leagueName}: ${homeTeamName} vs ${awayTeamName}`
      : `${homeTeamName} vs ${awayTeamName}`

    // Build event description
    const descriptionParts: string[] = []
    descriptionParts.push(`Runde: ${game.round.name}`)
    descriptionParts.push(`Staffel: ${game.round.division.name}`)
    if (game.gameNumber) {
      descriptionParts.push(`Spielnummer: ${game.gameNumber}`)
    }
    if (game.notes) {
      descriptionParts.push(`\nHinweise: ${game.notes}`)
    }
    const eventDescription = descriptionParts.join("\n")

    // Build location string
    let location = ""
    if (game.venue) {
      const locationParts: string[] = [game.venue.name]
      if (game.venue.city) {
        locationParts.push(game.venue.city)
      }
      if (game.venue.address) {
        locationParts.push(game.venue.address)
      }
      location = locationParts.join(", ")
    }

    // Calculate end time (estimated game duration: 3 hours)
    const startTime = new Date(game.scheduledAt)
    const endTime = new Date(startTime.getTime() + 3 * 60 * 60 * 1000) // +3 hours

    // Create event
    const event = calendar.createEvent({
      start: startTime,
      end: endTime,
      summary,
      description: eventDescription,
      location: location || undefined,
      timezone,
    })

    // Set UID (unique identifier for updates)
    event.id(game.id)

    // Set status to CONFIRMED (we only export scheduled/in_progress games)
    event.status(ICalEventStatus.CONFIRMED)

    // Set last modified timestamp for sync tracking
    event.lastModified(game.updatedAt)
  }

  // Generate ICS string
  return calendar.toString()
}
