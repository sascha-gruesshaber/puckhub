import { Button, FormField, Input, toast } from "@puckhub/ui"
import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { useState } from "react"
import { signIn, useSession } from "@/auth-client"

export const Route = createFileRoute("/login")({
  component: LoginPage,
})

function LoginPage() {
  const navigate = useNavigate()
  const { data: session } = useSession()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState("")

  if (session?.user) {
    navigate({ to: "/" })
    return null
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setIsSubmitting(true)

    try {
      const result = await signIn.email({ email, password })

      if (result.error) {
        setError(result.error.message ?? "Login failed")
        setIsSubmitting(false)
        return
      }

      // Check if user is platform admin
      const userRole = (result.data?.user as any)?.role
      if (userRole !== "admin") {
        setError("Access denied. Platform admin role required.")
        setIsSubmitting(false)
        return
      }

      navigate({ to: "/" })
    } catch {
      setError("Login failed")
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center" style={{ background: "#f8fafc" }}>
      <div className="w-full max-w-sm px-6">
        <div className="mb-8 text-center">
          <div
            className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl"
            style={{
              background: "linear-gradient(135deg, #F4D35E 0%, #D4A843 100%)",
              color: "#0C1929",
              fontWeight: 800,
              fontSize: 24,
            }}
          >
            P
          </div>
          <h1 className="text-xl font-bold text-foreground">PuckHub Platform</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">Platform administration login</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <FormField label="Email">
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@puckhub.de"
              required
            />
          </FormField>

          <FormField label="Password">
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              required
            />
          </FormField>

          <Button type="submit" variant="accent" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? "Signing in..." : "Sign in"}
          </Button>
        </form>
      </div>
    </div>
  )
}
