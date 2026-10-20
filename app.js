import {
  fresh,
  load,
  persist,
  validate,
  safeURL,
  searchURL,
  clockParts,
  engines,
  clone,
  STORAGE_KEY,
} from "./data.js";
import { icon, linkIcons } from "./icons.js";
const $ = (id) => document.getElementById(id);
let storage;
try {
  storage = window.localStorage;
} catch {
  storage = {
    getItem() {
      throw Error();
    },
    setItem() {
      throw Error();
    },
  };
}
const loaded = load(storage);
let state = loaded.state;
let activeTab = "general",
  editing = null,
  pendingImport = null,
  toastTimer;
const media = matchMedia("(prefers-color-scheme: dark)");
const settingKeys = [
  "name",
  "theme",
  "engine",
  "accent",
  "hour12",
  "showSeconds",
  "openInNewTab",
  "showClock",
  "showGreeting",
  "showSearch",
  "showFavorites",
  "showCollections",
];
const el = (tag, cls, text) => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text !== undefined) n.textContent = text;
  return n;
};
function toast(message) {
  $("toast").textContent = message;
  $("toast").classList.add("visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => $("toast").classList.remove("visible"), 5000);
}
function applyIcons(root = document) {
  root
    .querySelectorAll("[data-icon]")
    .forEach((n) => n.replaceChildren(icon(n.dataset.icon)));
}
function commit(next, { editor = false } = {}) {
  try {
    state = validate(next);
  } catch (error) {
    toast(error.message);
    return false;
  }
  try {
    persist(storage, state);
    $("save-status").replaceChildren(
      el("i"),
      document.createTextNode(" Saved in this browser"),
    );
  } catch {
    $("save-status").textContent = "Not saved — browser storage unavailable";
    toast(
      "Changes work for this tab, but could not be saved. Export a backup to keep them.",
    );
  }
  render();
  if (editor) renderEditor();
  return true;
}
function target(a) {
  if (state.openInNewTab) {
    a.target = "_blank";
    a.rel = "noopener noreferrer";
  }
  return a;
}
function tick() {
  const d = new Date();
  const p = clockParts(d, state.hour12, state.showSeconds);
  $("clock").textContent = p.time;
  $("clock").dateTime = d.toISOString();
  $("period").textContent = p.period;
  $("date").textContent = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  })
    .format(d)
    .toUpperCase();
  const h = d.getHours();
  const greeting =
    h < 5
      ? "Good evening"
      : h < 12
        ? "Good morning"
        : h < 18
          ? "Good afternoon"
          : "Good evening";
  $("greeting").replaceChildren(
    document.createTextNode(greeting + (state.name ? ", " : ".")),
  );
  if (state.name) $("greeting").append(el("span", "", state.name + "."));
}
function render() {
  document.documentElement.dataset.theme =
    state.theme === "system" ? (media.matches ? "dark" : "light") : state.theme;
  document.documentElement.dataset.accent = state.accent;
  $("clock-area").hidden = !state.showClock;
  $("greeting").hidden = !state.showGreeting;
  $("search-form").hidden = !state.showSearch;
  $("favorites-section").hidden = !state.showFavorites;
  $("collections-section").hidden = !state.showCollections;
  $("empty-state").hidden =
    state.showClock ||
    state.showGreeting ||
    state.showSearch ||
    state.showFavorites ||
    state.showCollections;
  $("engine-label").textContent = engines[state.engine].name;
  tick();
  const favorites = document.createDocumentFragment();
  for (const link of state.favorites) {
    const a = target(el("a", "favorite"));
    a.href = link.url;
    a.title = link.url;
    const glyph = el("span", "favorite-icon");
    glyph.append(icon(link.icon));
    a.append(
      glyph,
      el("span", "favorite-name", link.name),
      el("span", "arrow", "↗"),
    );
    a.lastChild.setAttribute("aria-hidden", "true");
    favorites.append(a);
  }
  if (!state.favorites.length) {
    const add = el("button", "favorite", "+ Add a shortcut");
    add.type = "button";
    add.onclick = () => {
      openSettings("links");
      openLink(null, null);
    };
    favorites.append(add);
  }
  $("favorites").replaceChildren(favorites);
  const collections = document.createDocumentFragment();
  for (const group of state.groups.filter((g) => g.visible)) {
    const section = el("section", "collection");
    const heading = el("div", "collection-header");
    const glyph = el("span");
    glyph.append(
      icon(
        group.links[0]?.icon === "link"
          ? group.name === "Music"
            ? "music"
            : group.name === "Social"
              ? "coffee"
              : "link"
          : group.links[0]?.icon || "link",
      ),
    );
    heading.append(
      glyph,
      el("h3", "", group.name),
      el("small", "", String(group.links.length).padStart(2, "0") + " LINKS"),
    );
    section.append(heading);
    const nav = el("nav");
    nav.setAttribute("aria-label", group.name);
    for (const link of group.links) {
      const a = target(el("a", "collection-link"));
      a.href = link.url;
      a.title = link.url;
      const arrow = el("span", "arrow", "↗");
      arrow.setAttribute("aria-hidden", "true");
      a.append(el("span", "", link.name), arrow);
      nav.append(a);
    }
    if (!group.links.length)
      nav.append(
        el("p", "muted small", "No links yet. Add some in Customize."),
      );
    section.append(nav);
    collections.append(section);
  }
  if (!collections.childNodes.length) {
    const add = el("button", "text-button", "+ Add or show a collection");
    add.onclick = () => openSettings("links");
    collections.append(add);
  }
  $("collections").replaceChildren(collections);
}
function showTab(name) {
  activeTab = name;
  for (const key of ["general", "links", "backup"]) {
    const selected = key === name;
    const tab = $("tab-" + key);
    tab.setAttribute("aria-selected", String(selected));
    tab.tabIndex = selected ? 0 : -1;
    $("panel-" + key).hidden = !selected;
  }
}
function openSettings(tab = "general") {
  renderSettings();
  showTab(tab);
  $("settings-dialog").showModal();
}
function renderSettings() {
  for (const key of settingKeys) {
    const input = $("setting-" + key);
    if (input.type === "checkbox") input.checked = state[key];
    else input.value = state[key];
  }
  renderEditor();
}
function actionButton(label, glyph, action, disabled = false) {
  const b = el("button", "icon-button");
  b.type = "button";
  b.title = label;
  b.setAttribute("aria-label", label);
  b.append(icon(glyph));
  b.disabled = disabled;
  b.onclick = action;
  return b;
}
function linksFor(next, groupId) {
  return groupId === null
    ? next.favorites
    : next.groups.find((g) => g.id === groupId).links;
}
function moveLink(groupId, id, delta) {
  const next = clone(state);
  const links = linksFor(next, groupId);
  const i = links.findIndex((l) => l.id === id);
  if (i < 0 || i + delta < 0 || i + delta >= links.length) return;
  [links[i], links[i + delta]] = [links[i + delta], links[i]];
  commit(next, { editor: true });
}
function deleteLink(groupId, id) {
  const next = clone(state);
  const links = linksFor(next, groupId);
  const i = links.findIndex((l) => l.id === id);
  if (i < 0) return;
  const removed = links.splice(i, 1)[0];
  commit(next, { editor: true });
  toast(removed.name + " removed.");
}
function linkRows(links, groupId) {
  const fragment = document.createDocumentFragment();
  links.forEach((link, i) => {
    const row = el("div", "editor-row");
    const label = el("button", "editor-label", link.name);
    label.type = "button";
    label.title = "Edit " + link.name;
    label.append(el("small", "", new URL(link.url).hostname));
    label.onclick = () => openLink(groupId, link.id);
    row.append(
      label,
      actionButton(
        "Move " + link.name + " up",
        "arrow-up",
        () => moveLink(groupId, link.id, -1),
        i === 0,
      ),
      actionButton(
        "Move " + link.name + " down",
        "arrow-down",
        () => moveLink(groupId, link.id, 1),
        i === links.length - 1,
      ),
      actionButton("Edit " + link.name, "edit", () =>
        openLink(groupId, link.id),
      ),
      actionButton("Delete " + link.name, "trash", () =>
        deleteLink(groupId, link.id),
      ),
    );
    fragment.append(row);
  });
  return fragment;
}
function renderEditor() {
  $("favorite-editor").replaceChildren(linkRows(state.favorites, null));
  $("extra-favorites").replaceChildren();
  for (const link of state.extraFavorites) {
    const row = el("div", "extra-row");
    const b = el("button", "text-button", "+ Add");
    b.type = "button";
    b.onclick = () => {
      const next = clone(state);
      next.favorites.push({ ...link, id: crypto.randomUUID() });
      next.extraFavorites = next.extraFavorites.filter((l) => l.id !== link.id);
      commit(next, { editor: true });
    };
    row.append(el("span", "", link.name), b);
    $("extra-favorites").append(row);
  }
  if (!state.extraFavorites.length)
    $("extra-favorites").append(
      el("p", "muted small", "All original shortcuts have been added."),
    );
  const groups = document.createDocumentFragment();
  state.groups.forEach((group, index) => {
    const card = el("div", "group-editor-card");
    const head = el("div", "group-editor-heading");
    const visible = el(
      "button",
      "visibility-button",
      group.visible ? "Shown" : "Hidden",
    );
    visible.type = "button";
    visible.setAttribute("aria-label", "Show " + group.name);
    visible.setAttribute("aria-pressed", String(group.visible));
    visible.onclick = () => {
      const next = clone(state);
      next.groups.find((g) => g.id === group.id).visible = !group.visible;
      commit(next, { editor: true });
    };
    const move = (delta) => {
      const next = clone(state);
      [next.groups[index], next.groups[index + delta]] = [
        next.groups[index + delta],
        next.groups[index],
      ];
      commit(next, { editor: true });
    };
    head.append(
      el("strong", "", group.name),
      visible,
      actionButton(
        "Move collection " + group.name + " up",
        "arrow-up",
        () => move(-1),
        index === 0,
      ),
      actionButton(
        "Move collection " + group.name + " down",
        "arrow-down",
        () => move(1),
        index === state.groups.length - 1,
      ),
      actionButton("Rename " + group.name, "edit", () => openGroup(group.id)),
      actionButton("Delete collection " + group.name, "trash", () => {
        if (!confirm("Delete “" + group.name + "” and all its links?")) return;
        const next = clone(state);
        next.groups = next.groups.filter((g) => g.id !== group.id);
        commit(next, { editor: true });
      }),
    );
    const add = el("button", "text-button", "+ Add link");
    add.type = "button";
    add.onclick = () => openLink(group.id, null);
    card.append(head, linkRows(group.links, group.id), add);
    groups.append(card);
  });
  $("group-editor").replaceChildren(groups);
}
function openLink(groupId, id) {
  editing = { kind: "link", groupId, id };
  const link = id ? linksFor(state, groupId).find((l) => l.id === id) : null;
  $("edit-title").textContent = id ? "Edit link" : "Add a link";
  $("edit-name").value = link?.name || "";
  $("edit-url").value = link?.url || "";
  $("edit-url").closest("label").hidden = false;
  $("edit-url").required = true;
  $("edit-icon").closest("label").hidden = false;
  $("edit-icon").value = link?.icon || "link";
  $("edit-error").textContent = "";
  $("edit-dialog").showModal();
  $("edit-name").focus();
}
function openGroup(id = null) {
  editing = { kind: "group", id };
  $("edit-title").textContent = id ? "Rename collection" : "New collection";
  $("edit-name").value = state.groups.find((g) => g.id === id)?.name || "";
  $("edit-url").closest("label").hidden = true;
  $("edit-url").required = false;
  $("edit-icon").closest("label").hidden = true;
  $("edit-error").textContent = "";
  $("edit-dialog").showModal();
  $("edit-name").focus();
}
$("edit-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const next = clone(state);
  const name = $("edit-name").value.trim();
  if (!name) {
    $("edit-error").textContent = "Please enter a name.";
    return;
  }
  try {
    if (editing.kind === "group") {
      if (editing.id) next.groups.find((g) => g.id === editing.id).name = name;
      else
        next.groups.push({
          id: crypto.randomUUID(),
          name,
          visible: true,
          links: [],
        });
    } else {
      const links = linksFor(next, editing.groupId);
      const link = {
        id: editing.id || crypto.randomUUID(),
        name,
        url: safeURL($("edit-url").value),
        icon: $("edit-icon").value,
      };
      if (editing.id) links[links.findIndex((l) => l.id === editing.id)] = link;
      else links.push(link);
    }
    validate(next);
    if (commit(next, { editor: true })) $("edit-dialog").close();
  } catch (error) {
    $("edit-error").textContent = error.message;
  }
});
for (const name of linkIcons) {
  const option = el("option", "", name.replaceAll("-", " "));
  option.value = name;
  $("edit-icon").append(option);
}
for (const key of settingKeys) {
  $("setting-" + key).addEventListener(
    key === "name" ? "input" : "change",
    (event) => {
      const next = clone(state);
      next[key] =
        event.target.type === "checkbox"
          ? event.target.checked
          : event.target.value;
      commit(next);
    },
  );
}
$("customize").onclick = () => openSettings();
$("empty-customize").onclick = () => openSettings();
$("edit-favorites").onclick = () => openSettings("links");
$("add-collection").onclick = () => openSettings("links");
$("new-favorite").onclick = () => openLink(null, null);
$("new-group").onclick = () => openGroup();
for (const b of document.querySelectorAll(".close-dialog"))
  b.onclick = () => $("settings-dialog").close();
for (const b of document.querySelectorAll(".close-edit"))
  b.onclick = () => $("edit-dialog").close();
for (const b of document.querySelectorAll(".close-help"))
  b.onclick = () => $("help-dialog").close();
$("help").onclick = () => $("help-dialog").showModal();
for (const b of document.querySelectorAll("[data-tab]")) {
  b.onclick = () => showTab(b.dataset.tab);
  b.onkeydown = (event) => {
    const keys = ["general", "links", "backup"];
    let i = keys.indexOf(activeTab);
    if (event.key === "ArrowRight") i = (i + 1) % 3;
    else if (event.key === "ArrowLeft") i = (i + 2) % 3;
    else if (event.key === "Home") i = 0;
    else if (event.key === "End") i = 2;
    else return;
    event.preventDefault();
    showTab(keys[i]);
    $("tab-" + keys[i]).focus();
  };
}
$("search-form").onsubmit = (event) => {
  event.preventDefault();
  const url = searchURL($("search").value, state.engine);
  if (url) location.assign(url);
};
document.addEventListener("keydown", (event) => {
  if (
    event.key === "/" &&
    !event.metaKey &&
    !event.ctrlKey &&
    !event.altKey &&
    !document.querySelector("dialog[open]") &&
    !["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement.tagName) &&
    state.showSearch
  ) {
    event.preventDefault();
    $("search").focus();
  }
});
$("export").onclick = () => {
  const blob = new Blob([JSON.stringify(state, null, 2) + "\n"], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = el("a");
  a.href = url;
  a.download =
    "spawnpoint-backup-" + new Date().toISOString().slice(0, 10) + ".json";
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  toast("Backup exported.");
};
function clearImport() {
  pendingImport = null;
  $("import").value = "";
  $("import-review").hidden = true;
}
$("import").onchange = async (event) => {
  const file = event.target.files[0];
  clearImport();
  $("import-error").textContent = "";
  if (!file) return;
  try {
    if (file.size > 1024 * 1024)
      throw new Error(
        "Backup is too large. Choose a JSON file smaller than 1 MB.",
      );
    pendingImport = validate(JSON.parse(await file.text()));
    $("import-description").textContent =
      `Replace your settings with ${pendingImport.favorites.length} shortcuts and ${pendingImport.groups.length} collections for ${pendingImport.name || "you"}?`;
    $("import-review").hidden = false;
  } catch (error) {
    $("import-error").textContent =
      error instanceof SyntaxError
        ? "This file is not valid JSON."
        : error.message;
  }
};
$("confirm-import").onclick = () => {
  if (!pendingImport) return;
  const next = pendingImport;
  if (commit(next, { editor: true })) {
    clearImport();
    renderSettings();
    toast("Settings restored.");
  }
};
$("cancel-import").onclick = clearImport;
$("reset").onclick = () => {
  if (
    !confirm(
      "Reset all Spawnpoint settings? Export a backup first if you want to keep your changes.",
    )
  )
    return;
  commit(fresh(), { editor: true });
  renderSettings();
  toast("Original settings restored.");
};
media.addEventListener("change", () => {
  if (state.theme === "system") render();
});
window.addEventListener("storage", (event) => {
  if (event.key !== STORAGE_KEY) return;
  const next = load(storage);
  if (next.warning) {
    toast(next.warning);
    return;
  }
  state = next.state;
  $("edit-dialog").close();
  render();
  renderSettings();
  toast("Settings updated in another tab.");
});
document.addEventListener("visibilitychange", () => {
  if (!document.hidden) tick();
});
window.addEventListener("pageshow", tick);
applyIcons();
render();
setInterval(tick, 1000);
if (loaded.warning) toast(loaded.warning);
