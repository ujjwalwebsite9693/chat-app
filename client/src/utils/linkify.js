const URL_REGEX = /(https?:\/\/[^\s]+|www\.[^\s]+)/g;

// Splits text into an array of { type: "text" | "link", text, href? } segments
// so callers can render real <a> tags without dangerouslySetInnerHTML.
export function linkifyText(text) {
  if (!text) return [];
  return text.split(URL_REGEX).map((part, i) => {
    const isUrl = /^(https?:\/\/|www\.)/.test(part);
    if (isUrl) {
      const href = part.startsWith("www.") ? `https://${part}` : part;
      return { type: "link", key: `l${i}`, text: part, href };
    }
    return { type: "text", key: `t${i}`, text: part };
  });
}
