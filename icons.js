// A small local icon set. No font files, CDN, or requests for site favicons.
export const paths = {
  link: '<path d="m10 13 4-4m-6 7-1 1a4 4 0 0 1-6-6l4-4a4 4 0 0 1 6 0m2 1 1-1a4 4 0 0 1 6 6l-4 4a4 4 0 0 1-6 0"/>',
  github:
    '<path d="M9 19c-5 1-5-2-7-2m14 5v-4a3.5 3.5 0 0 0-1-2.7c3.3-.4 6.7-1.6 6.7-7.3a5.8 5.8 0 0 0-1.5-4 5.4 5.4 0 0 0-.1-4S18.9-.4 16 1.5a14 14 0 0 0-8 0C5.1-.4 3.9 0 3.9 0a5.4 5.4 0 0 0-.1 4 5.8 5.8 0 0 0-1.5 4c0 5.7 3.4 6.9 6.7 7.3A3.5 3.5 0 0 0 8 18v4" transform="translate(1 1) scale(.92)"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 6 9 7 9-7"/>',
  trello:
    '<rect x="4" y="4" width="16" height="16" rx="2"/><path d="M9 8v8m6-8v4"/>',
  calendar:
    '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 11h18m-13 4h2m4 0h2m-8 3h2"/>',
  glasses:
    '<circle cx="6" cy="14" r="4"/><circle cx="18" cy="14" r="4"/><path d="M10 14h4M2 14l2-9h3m15 9-2-9h-3"/>',
  youtube:
    '<rect x="2" y="5" width="20" height="14" rx="4"/><path d="m10 9 5 3-5 3Z"/>',
  headphones:
    '<path d="M3 14v-3a9 9 0 0 1 18 0v3"/><rect x="3" y="12" width="4" height="9" rx="2"/><rect x="17" y="12" width="4" height="9" rx="2"/>',
  twitter:
    '<path d="M22 4c-1 .5-2 .7-3 .8a5 5 0 0 0-8 4.5A13 13 0 0 1 2 4s-4 9 5 13a14 14 0 0 1-7 2c9 5 20 0 20-12v-.7A8 8 0 0 0 22 4Z"/>',
  bot: '<rect x="4" y="6" width="16" height="14" rx="3"/><path d="M12 3v3M2 12h2m16 0h2M8 11h.01M16 11h.01M8 16h8"/>',
  "shopping-bag": '<path d="M5 7h14l2 14H3L5 7Zm3 0V5a4 4 0 0 1 8 0v2"/>',
  "pen-tool":
    '<path d="m12 3 8 8-8 10-8-10 8-8Zm0 0v9m-3 9h6"/><circle cx="12" cy="13" r="1"/>',
  figma:
    '<path d="M12 2H8a4 4 0 0 0 0 8h4V2Zm0 0h4a4 4 0 0 1 0 8h-4M12 10H8a4 4 0 0 0 0 8h4m0-8v12a4 4 0 0 1-8 0v-4"/><circle cx="16" cy="14" r="4"/>',
  music:
    '<path d="M9 18V5l12-3v13M9 9l12-3"/><ellipse cx="6" cy="18" rx="3" ry="3"/><ellipse cx="18" cy="15" rx="3" ry="3"/>',
  coffee:
    '<path d="M3 8h14v7a5 5 0 0 1-5 5H8a5 5 0 0 1-5-5V8Zm14 0h1a3 3 0 0 1 0 6h-1M7 2v2m5-2v2M2 23h18"/>',
  binary:
    '<path d="M4 3h4v7H4V3Zm12 11h4v7h-4v-7ZM16 3h2v7m-2 0h4M4 14h2v7m-2 0h4"/>',
  globe:
    '<circle cx="12" cy="12" r="9"/><ellipse cx="12" cy="12" rx="4" ry="9"/><path d="M3 12h18"/>',
  book: '<path d="M12 5C8 2 3 3 2 4v16c3-2 7-2 10 0m0-15c4-3 9-2 10-1v16c-3-2-7-2-10 0V5Z"/>',
  search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',
  "arrow-right": '<path d="M4 12h16m-6-6 6 6-6 6"/>',
  "arrow-up": '<path d="M12 20V4m-6 6 6-6 6 6"/>',
  "arrow-down": '<path d="M12 4v16m-6-6 6 6 6-6"/>',
  sliders: '<path d="M4 6h16M4 18h16M8 3v6m8 6v6"/>',
  x: '<path d="m6 6 12 12M6 18 18 6"/>',
  edit: '<path d="m16 3 5 5-12 12-6 1 1-6L16 3Zm-2 2 5 5"/>',
  trash: '<path d="M3 6h18M8 6V3h8v3M5 6l1 15h12l1-15M10 10v7m4-7v7"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
};
export function icon(name) {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("aria-hidden", "true");
  // Only the locally defined constant paths enter this markup.
  svg.innerHTML = paths[name] || paths.link;
  return svg;
}
export const linkIcons = Object.keys(paths).slice(0, 18);
