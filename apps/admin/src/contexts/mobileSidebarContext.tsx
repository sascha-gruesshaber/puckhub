import { createContext, useCallback, useContext, useState } from "react"

interface MobileSidebarState {
  open: boolean
  setOpen: (open: boolean) => void
  toggle: () => void
}

const MobileSidebarContext = createContext<MobileSidebarState | null>(null)

function MobileSidebarProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  const toggle = useCallback(() => setOpen((v) => !v), [])
  return <MobileSidebarContext.Provider value={{ open, setOpen, toggle }}>{children}</MobileSidebarContext.Provider>
}

function useMobileSidebar() {
  const ctx = useContext(MobileSidebarContext)
  if (!ctx) throw new Error("useMobileSidebar must be used within MobileSidebarProvider")
  return ctx
}

export { MobileSidebarProvider, useMobileSidebar }
