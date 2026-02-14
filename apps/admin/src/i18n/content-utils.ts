import { t } from "intlayer"

type Dict = Record<string, unknown>

export function makeLocalizedContent(deNode: unknown, enNode: unknown): unknown {
  if (typeof deNode === "string" && typeof enNode === "string") {
    return t({
      de: deNode,
      en: enNode,
    })
  }

  if (Array.isArray(deNode) || Array.isArray(enNode)) {
    return deNode
  }

  if (deNode && typeof deNode === "object" && enNode && typeof enNode === "object") {
    const output: Dict = {}
    for (const key of Object.keys(deNode as Dict)) {
      output[key] = makeLocalizedContent((deNode as Dict)[key], (enNode as Dict)[key])
    }
    return output
  }

  return deNode
}
