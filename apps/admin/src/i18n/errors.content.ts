import type { Dictionary } from "intlayer"
import { makeLocalizedContent } from "./content-utils"
import deErrors from "./locales/de-DE/errors.json"
import enErrors from "./locales/en-US/errors.json"

const errorsContent = {
  key: "errors",
  content: makeLocalizedContent(deErrors, enErrors),
} satisfies Dictionary

export default errorsContent
