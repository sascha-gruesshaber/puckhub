import { describe, expect, it } from "vitest"
import { createTestCaller } from "../testUtils"

describe("venue router", () => {
  it("lists venues", async () => {
    const admin = createTestCaller({ asAdmin: true })
    await admin.venue.create({ name: "Eisstadion Nord", city: "Kempten" })

    const venues = await admin.venue.list()
    expect(venues.length).toBeGreaterThan(0)
    expect(venues.some((v) => v.name === "Eisstadion Nord")).toBe(true)
  })

  it("creates, updates and deletes a venue", async () => {
    const admin = createTestCaller({ asAdmin: true })

    const venue = await admin.venue.create({
      name: "Arena West",
      city: "Fuessen",
      address: "Hauptstrasse 1",
    })
    expect(venue?.name).toBe("Arena West")

    const updated = await admin.venue.update({
      id: venue?.id,
      name: "Arena West Neu",
      city: "Fuessen",
      address: "Nebenstrasse 2",
    })
    expect(updated?.name).toBe("Arena West Neu")

    await admin.venue.delete({ id: venue?.id })
    const venues = await admin.venue.list()
    expect(venues.find((v) => v.id === venue?.id)).toBeUndefined()
  })

  it("blocks deletion when venue is used by games", async () => {
    const admin = createTestCaller({ asAdmin: true })
    const season = (await admin.season.create({ name: "2025/26", seasonStart: "2025-09-01", seasonEnd: "2026-04-30" }))!
    const division = (await admin.division.create({ seasonId: season.id, name: "Liga" }))!
    const round = (await admin.round.create({ divisionId: division.id, name: "Hauptrunde" }))!
    const homeTeam = (await admin.team.create({ name: "Eagles", shortName: "EAG" }))!
    const awayTeam = (await admin.team.create({ name: "Wolves", shortName: "WOL" }))!
    await admin.teamDivision.assign({ teamId: homeTeam.id, divisionId: division.id })
    await admin.teamDivision.assign({ teamId: awayTeam.id, divisionId: division.id })
    const venue = (await admin.venue.create({ name: "Arena Ost" }))!

    await admin.game.create({
      roundId: round.id,
      homeTeamId: homeTeam.id,
      awayTeamId: awayTeam.id,
      venueId: venue.id,
    })

    await expect(admin.venue.delete({ id: venue.id })).rejects.toThrow("VENUE_IN_USE")
  })

  it("manages defaultTeamId on create and update", async () => {
    const admin = createTestCaller({ asAdmin: true })
    const team = (await admin.team.create({ name: "Eagles", shortName: "EAG" }))!

    // Create venue with defaultTeamId
    const venue = (await admin.venue.create({ name: "Home Arena", defaultTeamId: team.id }))!

    let venues = await admin.venue.list()
    let found = venues.find((v) => v.id === venue.id)
    expect(found?.defaultTeam?.id).toBe(team.id)

    // Remove default team via update
    await admin.venue.update({ id: venue.id, defaultTeamId: null })

    venues = await admin.venue.list()
    found = venues.find((v) => v.id === venue.id)
    expect(found?.defaultTeam).toBeNull()
  })

  it("rejects unauthenticated mutations", async () => {
    const caller = createTestCaller()
    await expect(caller.venue.create({ name: "Arena Sued" })).rejects.toThrow("Not authenticated")
  })
})
