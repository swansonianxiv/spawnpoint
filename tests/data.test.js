import test from "node:test";
import assert from "node:assert/strict";
import {
  fresh,
  validate,
  safeURL,
  load,
  persist,
  searchURL,
  clockParts,
} from "../data.js";
test("migrated settings preserve personal links", () => {
  const data = validate(fresh());
  assert.equal(data.name, "Swan");
  assert.equal(data.favorites.length, 6);
  assert.equal(data.engine, "kagi");
  assert.equal(
    data.groups.some((g) => g.name === "Music"),
    false,
  );
  assert.equal(
    data.groups.flatMap((g) => g.links).some((l) => l.name === "Revolt"),
    false,
  );
  assert.equal(data.groups[0].links[0].url, "https://mk.absturztau.be/");
  assert.equal(JSON.stringify(data).includes("weatherKey"), false);
});
test("backup round trip discards unknown fields", () => {
  const store = new Map();
  const storage = {
    getItem: (k) => store.get(k) ?? null,
    setItem: (k, v) => store.set(k, v),
  };
  const data = fresh();
  data.name = "<script>alert(1)</script>";
  data.untrusted = "extra";
  persist(storage, data);
  assert.deepEqual(load(storage).state, validate(data));
  assert.equal(load(storage).state.untrusted, undefined);
});
test("corrupt data is preserved with recovery warning", () => {
  let writes = 0;
  const data = load({
    getItem: () => "{broken",
    setItem() {
      writes++;
    },
  });
  assert.ok(data.warning);
  assert.equal(data.state.name, "Swan");
  assert.equal(writes, 0);
});
test("unavailable storage still provides defaults", () => {
  const data = load({
    getItem() {
      throw Error("blocked");
    },
  });
  assert.equal(data.state.theme, "dark");
  assert.ok(data.warning);
});
test("import rejects malformed values", () => {
  for (const mutate of [
    (s) => (s.version = 2),
    (s) => (s.theme = "unknown"),
    (s) => (s.showClock = "true"),
    (s) => (s.engine = "evil"),
    (s) => (s.groups = [null]),
    (s) => s.favorites.push({ ...s.favorites[0] }),
    (s) => (s.favorites[0].icon = "<svg>"),
    (s) => (s.name = "x".repeat(61)),
  ]) {
    const data = fresh();
    mutate(data);
    assert.throws(() => validate(data));
  }
});
test("URLs reject executable schemes and credentials", () => {
  for (const value of [
    "javascript:alert(1)",
    "data:text/html,<script>",
    "file:///etc/passwd",
    "https://user:password@example.com",
    "example.com",
    "",
  ])
    assert.throws(() => safeURL(value));
  assert.equal(
    safeURL("https://example.com/?q=hello world"),
    "https://example.com/?q=hello%20world",
  );
});
test("search encodes input as a query", () => {
  assert.equal(
    searchURL("hello world", "kagi"),
    "https://kagi.com/search?q=hello%20world",
  );
  assert.equal(searchURL("  ", "google"), null);
  assert.equal(
    searchURL("a & b / c", "duckduckgo"),
    "https://duckduckgo.com/?q=a%20%26%20b%20%2F%20c",
  );
});
test("clock handles noon, midnight, seconds, and 24-hour time", () => {
  for (const [hour, time, period] of [
    [0, "12:05", "AM"],
    [12, "12:05", "PM"],
    [23, "11:05", "PM"],
  ])
    assert.deepEqual(clockParts(new Date(2026, 9, 20, hour, 5), true), {
      time,
      period,
    });
  assert.equal(
    clockParts(new Date(2026, 9, 20, 0, 5, 7), false, true).time,
    "00:05:07",
  );
  assert.equal(clockParts(new Date(2026, 9, 20, 23, 5), false).time, "23:05");
});
test("defaults are independent copies", () => {
  const a = fresh(),
    b = fresh();
  a.groups[0].links.pop();
  assert.equal(b.groups[0].links.length, 3);
});
