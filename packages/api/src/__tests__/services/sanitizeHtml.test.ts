import { describe, expect, it } from "vitest"
import { sanitizeRichText, sanitizeText } from "../../lib/sanitizeHtml"

describe("sanitizeRichText", () => {
  it("removes script tags including their content", () => {
    const out = sanitizeRichText('<p>Hallo</p><script>alert("x")</script>')
    expect(out).toBe("<p>Hallo</p>")
    expect(out).not.toContain("alert")
  })

  it("strips inline event handlers", () => {
    const out = sanitizeRichText('<img src="/api/uploads/org/photos/a.png" onerror="alert(1)">')
    expect(out).toContain('src="/api/uploads/org/photos/a.png"')
    expect(out).not.toContain("onerror")
  })

  it("removes javascript: hrefs", () => {
    const out = sanitizeRichText('<a href="javascript:alert(1)">klick</a>')
    expect(out).not.toContain("javascript:")
    expect(out).toContain("klick")
  })

  it("removes data: image sources", () => {
    const out = sanitizeRichText('<img src="data:text/html;base64,PHNjcmlwdD4=">')
    expect(out).not.toContain("data:")
  })

  it("forces rel=noopener noreferrer on target=_blank links", () => {
    const out = sanitizeRichText('<a href="https://example.com" target="_blank">Link</a>')
    expect(out).toContain('target="_blank"')
    expect(out).toContain('rel="noopener noreferrer"')
  })

  it("preserves allowed markup", () => {
    const input =
      '<h2>Titel</h2><p class="lead">Ein <strong>starker</strong> <em>Text</em> mit <a href="https://example.com" title="t">Link</a>.</p>' +
      '<ul><li>eins</li><li>zwei</li></ul><table><tbody><tr><td colspan="2">Zelle</td></tr></tbody></table><hr><br>'
    expect(sanitizeRichText(input)).toBe(input.replace("<hr>", "<hr />").replace("<br>", "<br />"))
  })

  it("allows relative upload image paths and mailto links", () => {
    expect(sanitizeRichText('<img src="/api/uploads/org/logos/x.png" alt="Logo">')).toContain(
      'src="/api/uploads/org/logos/x.png"',
    )
    expect(sanitizeRichText('<a href="mailto:info@example.com">Mail</a>')).toContain('href="mailto:info@example.com"')
  })

  it("strips style attributes, iframes and unknown tags", () => {
    const out = sanitizeRichText(
      '<p style="color:red">Text</p><iframe src="https://evil.example"></iframe><custom-el>x</custom-el>',
    )
    expect(out).toBe("<p>Text</p>x")
  })

  it("rejects protocol-relative URLs", () => {
    expect(sanitizeRichText('<img src="//evil.example/x.png">')).not.toContain("evil.example")
  })
})

describe("sanitizeText", () => {
  it("strips all tags and keeps text", () => {
    expect(sanitizeText("<p>Hallo <strong>Welt</strong></p>")).toBe("Hallo Welt")
  })

  it("drops script content entirely", () => {
    expect(sanitizeText("Vorschau<script>alert(1)</script>")).toBe("Vorschau")
  })

  it("keeps plain characters such as ampersands and quotes", () => {
    expect(sanitizeText('Tom & Jerry "live"')).toBe('Tom & Jerry "live"')
  })
})
