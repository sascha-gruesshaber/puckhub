/**
 * Round-robin schedule generator.
 * Given a list of team IDs, generates all home/away matchups.
 */
export function generateRoundRobin(teamIds: string[]): Array<{ homeTeamId: string; awayTeamId: string }> {
  const games: Array<{ homeTeamId: string; awayTeamId: string }> = []
  for (let i = 0; i < teamIds.length; i++) {
    for (let j = i + 1; j < teamIds.length; j++) {
      games.push({ homeTeamId: teamIds[i]!, awayTeamId: teamIds[j]! })
      games.push({ homeTeamId: teamIds[j]!, awayTeamId: teamIds[i]! })
    }
  }
  return games
}
