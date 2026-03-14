/**
 * Creates the initial admin user on first startup when the database has no users.
 * Reads DEFAULT_USER_EMAIL from environment variables.
 * The user will sign in via magic link — no password needed.
 * Skips silently if users already exist or if env var is not set.
 */
export async function ensureDefaultUser(): Promise<void> {
  const email = process.env.DEFAULT_USER_EMAIL

  if (!email) {
    return
  }

  const { db } = await import("@puckhub/db")

  const userCount = await db.user.count()

  if (userCount > 0) {
    return
  }

  console.log(`Creating default admin user (${email})...`)

  const userId = crypto.randomUUID()
  await db.user.create({
    data: {
      id: userId,
      email,
      name: "Admin",
      emailVerified: true,
      role: "admin",
    },
  })

  console.log("Default admin user created successfully. Use magic link to sign in.")
}
