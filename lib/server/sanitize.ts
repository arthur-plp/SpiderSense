import "server-only";
import sanitizeHtml from "sanitize-html";

// Mirrors what the rich text editor can produce; anything else is dropped.
const OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: ["p", "h2", "h3", "strong", "em", "u", "s", "a", "ul", "ol", "li", "blockquote", "br", "hr", "code", "pre"],
  allowedAttributes: { a: ["href", "target", "rel"] },
  allowedSchemes: ["http", "https", "mailto"],
  allowedSchemesByTag: {},
  allowProtocolRelative: false,
  disallowedTagsMode: "discard",
  transformTags: {
    b: "strong",
    i: "em",
    strike: "s",
    del: "s",
    h1: "h2",
    h4: "h3",
    h5: "h3",
    h6: "h3",
    a: (tagName, attribs) => ({
      tagName,
      attribs: {
        ...(attribs.href ? { href: attribs.href } : {}),
        ...(attribs.target === "_blank" ? { target: "_blank" } : {}),
        // Always set, so a crafted payload can't drop it and expose window.opener.
        rel: "noopener noreferrer",
      },
    }),
  },
  // A link whose href was rejected (javascript:, data:…) keeps its text only.
  exclusiveFilter: (frame) => (frame.tag === "a" && !frame.attribs.href ? "excludeTag" : false),
};

/** Cleans HTML coming from the blog / newsletter editor before it is stored. */
export function sanitizeRichText(html: string): string {
  return sanitizeHtml(html, OPTIONS).trim();
}

/** Visible text of some HTML, used to reject content that is empty once cleaned. */
export function richTextToPlainText(html: string): string {
  return sanitizeHtml(html, { allowedTags: [], allowedAttributes: {} }).replace(/\s+/g, " ").trim();
}
