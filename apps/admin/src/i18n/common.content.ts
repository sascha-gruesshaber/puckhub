import type { Dictionary } from "intlayer"
import { makeLocalizedContent } from "./content-utils"
import deCommon from "./locales/de-DE/common.json"
import enCommon from "./locales/en-US/common.json"

const commonContent = {
  key: "common",
  content: makeLocalizedContent(deCommon, enCommon),
} satisfies Dictionary

export default commonContent
