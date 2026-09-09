import { getLocale, setLocale } from "../i18n";
// Use the same preference contract and CSS tokens as the portfolio and other games.
function preference(key: string, fallback: string): string {
  const parameter = new URLSearchParams(location.search).get(
    key === "locale" ? "lang" : key,
  );
  if (parameter !== null) return parameter;
  try {
    return localStorage.getItem(key) ?? fallback;
  } catch {
    return fallback;
  }
}

export function initializeSiteAppearance(): void {
  setLocale(preference("locale", "en") === "sk" ? "sk" : "en");
  document.documentElement.dataset.theme =
    preference("theme", "dark") === "light" ? "light" : "dark";
  const accent = preference("accent", "violet");
  document.documentElement.dataset.accent = [
    "cyan",
    "lime",
    "amber",
    "rose",
    "blue",
  ].includes(accent)
    ? accent
    : "violet";
  updateThemeColor();
}

export function isLightTheme(): boolean {
  return document.documentElement.dataset.theme === "light";
}

function updateThemeColor(): void {
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute(
      "content",
      getComputedStyle(document.documentElement)
        .getPropertyValue("--bg")
        .trim(),
    );
}

export function toggleSiteTheme(): void {
  const theme = isLightTheme() ? "dark" : "light";
  document.documentElement.dataset.theme = theme;
  try {
    localStorage.setItem("theme", theme);
  } catch {
    /* Session-only appearance. */
  }
  const url = new URL(location.href);
  if (url.searchParams.has("theme")) {
    url.searchParams.set("theme", theme);
    history.replaceState(null, "", url);
  }
  updateThemeColor();
}

export function siteLinks(): { home: string; games: string } {
  const locale = getLocale();
  return {
    home: locale === "sk" ? "/sk/" : "/",
    games: `/games/?lang=${locale}`,
  };
}
