import "./style.css";
import { readPreference, siteLinks, storePreference } from "../../../shared/appearance.js";
import { mountGameAppearance } from "../../../shared/game-appearance.js";
import { tr, type Locale } from "./i18n";
export function start() {
  let locale: Locale = readPreference("locale", "en") === "sk" ? "sk" : "en";
  const root = document.querySelector<HTMLElement>("#app")!;
  let removeAppearance = () => {};
  const render = () => {
    removeAppearance();
    document.documentElement.lang = locale;
    const links = siteLinks(locale);
    root.innerHTML = `<main class="ta-game"><header class="ta-header game-nav"><div class="game-nav__inner"><div class="game-nav__trail"><a class="game-nav__mark" href="${links.home}" aria-label="Alena Martinková">am<span class="game-nav__dot">.</span></a><span class="game-nav__separator">/</span><a class="game-nav__crumb" href="${links.games}">${tr(locale, "back")}</a></div><div data-game-appearance></div></div></header><section class="ta-desktop"><div><p class="ta-eyebrow">07 / TURNAROUND</p><h1>${tr(locale, "desktop")}</h1><p>${tr(locale, "desktopBody")}</p><a href="${links.games}">← ${tr(locale, "back")}</a></div></section></main>`;
    removeAppearance = mountGameAppearance(root.querySelector<HTMLElement>("[data-game-appearance]")!, {
      locale,
      onLocaleChange: (next: Locale) => {
        locale = next;
        storePreference("locale", locale);
        render();
      },
    });
  };
  render();
  return () => {
    removeAppearance();
    root.replaceChildren();
  };
}
