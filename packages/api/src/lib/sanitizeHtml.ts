import sanitizeHtml from "sanitize-html"

/**
 * Server-side HTML sanitization for CMS rich-text content (pages, news, AI recaps).
 *
 * The league site and admin render this content with `dangerouslySetInnerHTML`, so
 * everything that is persisted must already be safe. This is the single control —
 * there is intentionally no browser-side sanitizer.
 */

const RICH_TEXT_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [
    // block
    "p",
    "h1",
    "h2",
    "h3",
    "h4",
    "ul",
    "ol",
    "li",
    "blockquote",
    "pre",
    "code",
    "hr",
    "br",
    "table",
    "thead",
    "tbody",
    "tr",
    "th",
    "td",
    "figure",
    "figcaption",
    "div",
    "span",
    // inline
    "strong",
    "b",
    "em",
    "i",
    "u",
    "s",
    "sub",
    "sup",
    "a",
    "img",
  ],
  allowedAttributes: {
    "*": ["class"],
    a: ["href", "title", "target", "rel"],
    img: ["src", "alt", "title", "width", "height"],
    td: ["colspan", "rowspan"],
    th: ["colspan", "rowspan"],
  },
  // Relative URLs (e.g. /api/uploads/...) are always allowed; these restrict absolute ones.
  allowedSchemes: ["http", "https", "mailto"],
  allowedSchemesByTag: {
    img: ["http", "https"],
  },
  allowedSchemesAppliedToAttributes: ["href", "src"],
  allowProtocolRelative: false,
  // Drop disallowed tags together with their content for script-like elements.
  nonTextTags: ["script", "style", "textarea", "option", "noscript", "template", "iframe", "object", "embed"],
  transformTags: {
    a: (tagName, attribs) => {
      if (attribs.target === "_blank") {
        attribs.rel = "noopener noreferrer"
      }
      return { tagName, attribs }
    },
  },
}

const TEXT_ONLY_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [],
  allowedAttributes: {},
  nonTextTags: RICH_TEXT_OPTIONS.nonTextTags,
}

/**
 * Sanitizes editor-produced HTML: keeps common formatting, strips scripts, event
 * handlers, inline styles, iframes and dangerous URL schemes.
 */
export function sanitizeRichText(html: string): string {
  return sanitizeHtml(html, RICH_TEXT_OPTIONS)
}

/**
 * Strips all markup and returns plain text (for teasers such as `news.shortText`).
 * sanitize-html escapes text output; the result is rendered as React text, so the
 * basic entities are decoded back to characters.
 */
export function sanitizeText(text: string): string {
  return sanitizeHtml(text, TEXT_ONLY_OPTIONS)
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
}
