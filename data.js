import { defaults } from "./defaults.js";
import { linkIcons } from "./icons.js";
export const STORAGE_KEY = "spawnpoint.settings.v1";
export const engines = {
  kagi: { name: "Kagi", url: "https://kagi.com/search?q=" },
  duckduckgo: { name: "DuckDuckGo", url: "https://duckduckgo.com/?q=" },
  google: { name: "Google", url: "https://www.google.com/search?q=" },
  bing: { name: "Bing", url: "https://www.bing.com/search?q=" },
  brave: { name: "Brave", url: "https://search.brave.com/search?q=" },
};
export const clone = (value) => structuredClone(value);
export const fresh = () => clone(defaults);
export function safeURL(input) {
  if (typeof input !== "string" || input.length > 2000)
    throw new Error("Enter a valid web URL.");
  let url;
  try {
    url = new URL(input.trim());
  } catch {
    throw new Error("Enter a full URL, starting with https:// or http://.");
  }
  if (
    !["https:", "http:"].includes(url.protocol) ||
    url.username ||
    url.password
  )
    throw new Error(
      "Use an http:// or https:// URL without a username or password.",
    );
  return url.href;
}
function str(value, max, label) {
  if (typeof value !== "string" || value.length > max)
    throw new Error(`Invalid ${label}.`);
  return value.trim();
}
function text(value, max, label) {
  const result = str(value, max, label);
  if (!result) throw new Error(`${label} cannot be empty.`);
  return result;
}
function choice(value, list, label) {
  if (!list.includes(value)) throw new Error(`Invalid ${label}.`);
  return value;
}
function boolean(value, label) {
  if (typeof value !== "boolean") throw new Error(`Invalid ${label}.`);
  return value;
}
function list(value, max, label) {
  if (!Array.isArray(value) || value.length > max)
    throw new Error(`Invalid ${label}.`);
  return value;
}
function link(value) {
  if (!value || typeof value !== "object") throw new Error("Invalid link.");
  return {
    id: text(value.id, 80, "link ID"),
    name: text(value.name, 80, "link name"),
    url: safeURL(value.url),
    icon: choice(value.icon, linkIcons, "icon"),
  };
}
function unique(items, label) {
  if (new Set(items.map((x) => x.id)).size !== items.length)
    throw new Error(`Duplicate ${label} IDs.`);
  return items;
}
export function validateWallpaper(value) {
  // Older version-1 backups did not contain wallpaper controls.
  if (value === undefined) return clone(defaults.wallpaper);
  if (!value || typeof value !== "object")
    throw new Error("Invalid wallpaper settings.");
  const range = (number, max, label) => {
    if (!Number.isFinite(number) || number < 0 || number > max)
      throw new Error(`Invalid wallpaper ${label}.`);
    return number;
  };
  return {
    enabled: boolean(value.enabled, "wallpaper visibility"),
    dim: range(value.dim, 90, "dimming"),
    blur: range(value.blur, 20, "blur"),
    position: choice(
      value.position,
      ["center", "top", "bottom", "left", "right"],
      "wallpaper position",
    ),
  };
}
// Strict, versioned validation also runs when loading local browser data.
export function validate(value) {
  if (!value || value.version !== 1)
    throw new Error("This is not a supported Spawnpoint backup (version 1).");
  const result = {
    version: 1,
    name: str(value.name, 60, "name"),
    theme: choice(value.theme, ["dark", "light", "system"], "theme"),
    accent: choice(value.accent, ["sage", "lavender", "sand", "ice"], "accent"),
    engine: choice(value.engine, Object.keys(engines), "search engine"),
    wallpaper: validateWallpaper(value.wallpaper),
  };
  for (const key of [
    "hour12",
    "openInNewTab",
    "showClock",
    "showGreeting",
    "showSearch",
    "showFavorites",
    "showCollections",
    "showSeconds",
  ])
    result[key] = boolean(value[key], key);
  for (const key of ["favorites", "extraFavorites"])
    result[key] = unique(
      list(value[key], 200, "shortcuts").map(link),
      "shortcut",
    );
  result.groups = unique(
    list(value.groups, 30, "collections").map((g) => ({
      id: text(g.id, 80, "collection ID"),
      name: text(g.name, 80, "collection name"),
      visible: boolean(g.visible, "visibility"),
      links: unique(list(g.links, 200, "collection links").map(link), "link"),
    })),
    "collection",
  );
  return result;
}
export function load(storage) {
  try {
    const raw = storage.getItem(STORAGE_KEY);
    return { state: raw ? validate(JSON.parse(raw)) : fresh(), warning: null };
  } catch {
    return {
      state: fresh(),
      warning:
        "Saved settings could not be loaded. Defaults are shown; your stored data is untouched until you make a change.",
    };
  }
}
export function persist(storage, state) {
  storage.setItem(STORAGE_KEY, JSON.stringify(validate(state)));
}
export function searchURL(query, engine) {
  const q = query.trim();
  if (!q) return null;
  return engines[engine].url + encodeURIComponent(q);
}
export function clockParts(date, hour12, showSeconds = false) {
  const options = { hour: "numeric", minute: "2-digit", hour12 };
  if (showSeconds) options.second = "2-digit";
  const parts = new Intl.DateTimeFormat("en-US", options).formatToParts(date);
  return {
    time: parts
      .filter((p) => ["hour", "minute", "second", "literal"].includes(p.type))
      .map((p) => p.value)
      .join("")
      .trim(),
    period: parts.find((p) => p.type === "dayPeriod")?.value || "",
  };
}
