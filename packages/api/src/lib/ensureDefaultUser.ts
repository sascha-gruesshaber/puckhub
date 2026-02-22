import { hashPassword } from "better-auth/crypto"

/**
 * Creates the initial admin user on first startup when the database has no users.
 * Reads DEFAULT_USER_EMAIL and DEFAULT_USER_PASSWORD from environment variables.
 * Skips silently if users already exist or if env vars are not set.
 */
export async function ensureDefaultUser(): Promise<void> {
  const email = process.env.DEFAULT_USER_EMAIL
  const password = process.env.DEFAULT_USER_PASSWORD

  if (!email || !password) {
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

  const hashedPw = await hashPassword(password)
  await db.account.create({
    data: {
      id: crypto.randomUUID(),
      accountId: userId,
      providerId: "credential",
      password: hashedPw,
      userId,
    },
  })

  // Create a default organization
  const orgId = crypto.randomUUID()
  await db.organization.create({
    data: {
      id: orgId,
      name: "Default",
      slug: "default",
    },
  })

  // Add admin as org owner
  await db.member.create({
    data: {
      id: crypto.randomUUID(),
      userId,
      organizationId: orgId,
      role: "owner",
    },
  })

  // Create default system settings
  await db.systemSettings.create({
    data: {
      organizationId: orgId,
      leagueName: "Default",
      leagueShortName: "DEF",
    },
  })

  console.log("Default admin user created successfully.")
}
