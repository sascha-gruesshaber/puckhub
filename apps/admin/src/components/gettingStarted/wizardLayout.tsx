interface WizardLayoutProps {
  children: React.ReactNode
}

export function WizardLayout({ children }: WizardLayoutProps) {
  return (
    <div className="fixed inset-0 flex items-center justify-center overflow-y-auto" style={{ background: "#0A1220" }}>
      {/* Dot grid background */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: "radial-gradient(rgba(255,255,255,0.03) 1px, transparent 1px)",
          backgroundSize: "20px 20px",
        }}
      />

      {/* Ambient gold glow */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
        style={{
          width: 700,
          height: 700,
          background: "radial-gradient(circle, rgba(244,211,94,0.04) 0%, transparent 70%)",
        }}
      />

      <div className="relative z-10 w-full max-w-lg px-6 py-12">{children}</div>
    </div>
  )
}
