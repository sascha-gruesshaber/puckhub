interface StepIndicatorProps {
  totalSteps: number
  currentStep: number
}

export function StepIndicator({ totalSteps, currentStep }: StepIndicatorProps) {
  return (
    <div className="flex items-center justify-center gap-2 mb-8">
      {Array.from({ length: totalSteps }, (_, i) => {
        const isCompleted = i < currentStep
        const isCurrent = i === currentStep

        return (
          <div
            key={i}
            className="transition-all duration-300"
            style={{
              width: isCurrent ? 24 : 8,
              height: 8,
              borderRadius: 4,
              background: isCompleted || isCurrent ? "#F4D35E" : "rgba(255,255,255,0.1)",
            }}
          />
        )
      })}
    </div>
  )
}
