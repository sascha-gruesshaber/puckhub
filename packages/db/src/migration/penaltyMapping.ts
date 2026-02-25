// ---------------------------------------------------------------------------
// Legacy penalty ID → new PenaltyType code mapping
// 25 German penalty types → 6 standardized codes
// ---------------------------------------------------------------------------

/**
 * Maps legacy alPenalty.id to new PenaltyType.code.
 *
 * Legacy IDs:
 *  1  Bankstrafe              → MINOR
 *  2  Bandencheck             → MINOR
 *  3  Behinderung             → MINOR
 *  4  Beinstellen             → MINOR
 *  5  Disziplinarstrafe       → MISCONDUCT
 *  6  Ellenbogencheck         → MINOR
 *  7  Faustschlag             → MAJOR
 *  8  Haken                   → MINOR
 *  9  Halten                  → MINOR
 * 10  Hoher Stock             → MINOR
 * 11  Kniecheck               → MINOR
 * 12  Matchstrafe             → MATCH_PENALTY
 * 13  Reklamieren             → MINOR
 * 14  Spieldauer Disziplin.   → GAME_MISCONDUCT
 * 15  Check von Hinten        → MINOR
 * 16  Spielverzögerung        → MINOR
 * 17  Stockcheck              → MINOR
 * 18  Stockendenstoß          → MINOR
 * 19  Stockschlag             → MINOR
 * 20  Stockstich              → MINOR
 * 21  Unkorr. Körperangriff   → MAJOR
 * 22  Unkorrekter Wechsel     → MINOR
 * 23  Unnötige Härte          → MAJOR
 * 24  Check g. Kopf/Nacken    → MAJOR
 * 25  Sonstiges               → MINOR
 */
export const PENALTY_ID_TO_CODE: Record<number, string> = {
  1: 'MINOR',
  2: 'MINOR',
  3: 'MINOR',
  4: 'MINOR',
  5: 'MISCONDUCT',
  6: 'MINOR',
  7: 'MAJOR',
  8: 'MINOR',
  9: 'MINOR',
  10: 'MINOR',
  11: 'MINOR',
  12: 'MATCH_PENALTY',
  13: 'MINOR',
  14: 'GAME_MISCONDUCT',
  15: 'MINOR',
  16: 'MINOR',
  17: 'MINOR',
  18: 'MINOR',
  19: 'MINOR',
  20: 'MINOR',
  21: 'MAJOR',
  22: 'MINOR',
  23: 'MAJOR',
  24: 'MAJOR',
  25: 'MINOR',
}

/** Legacy alPenalty.id → German name (for penaltyDescription) */
export const PENALTY_ID_TO_NAME: Record<number, string> = {
  1: 'Bankstrafe',
  2: 'Bandencheck',
  3: 'Behinderung',
  4: 'Beinstellen',
  5: 'Disziplinarstrafe',
  6: 'Ellenbogencheck',
  7: 'Faustschlag',
  8: 'Haken',
  9: 'Halten',
  10: 'Hoher Stock',
  11: 'Kniecheck',
  12: 'Matchstrafe',
  13: 'Reklamieren',
  14: 'Spieldauer-Disziplinarstrafe',
  15: 'Check von Hinten',
  16: 'Spielverzögerung',
  17: 'Stockcheck',
  18: 'Stockendenstoß',
  19: 'Stockschlag',
  20: 'Stockstich',
  21: 'Unkorrekt. Körperangriff',
  22: 'Unkorrekter Wechsel',
  23: 'Unnötige Härte',
  24: 'Check gegen Kopf/Nacken',
  25: 'Sonstiges',
}
