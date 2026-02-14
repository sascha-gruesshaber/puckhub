import { describe, expect, it } from "vitest"
import { createTestCaller } from "../testUtils"

describe("venue router", () => {
  it("lists venues", async () => {
    const admin = createTestCaller({ asAdmin: true })
    await admin.venue.create({ name: "Eisstadion Nord", city: "Kempten" })

    const caller = createTestCaller()
    const venues = await caller.venue.list()
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

    await expect(admin.venue.delete({ id: venue.id })).rejects.toThrow("cannot be deleted")
  })

  it("rejects unauthenticated mutations", async () => {
    const caller = createTestCaller()
    await expect(caller.venue.create({ name: "Arena Sued" })).rejects.toThrow("Not authenticated")
  })
})
