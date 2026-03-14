import { Toaster as SonnerToaster } from "sonner"

function Toaster() {
  return (
    <SonnerToaster
      position="bottom-right"
      toastOptions={{
        className: "font-sans",
        style: {
          fontFamily: "'Outfit Variable', system-ui, sans-serif",
        },
      }}
      richColors
    />
  )
}

export { Toaster }
