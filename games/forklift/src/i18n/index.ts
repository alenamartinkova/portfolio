export const en = {
  navigation: "Game navigation",
  portfolio: "portfolio",
  games: "Games",
  language: "Language",
  shift: "SHIFT 01",
  mute: "Mute audio",
  unmute: "Unmute audio",
  audio: "Toggle audio",
  theme: "Switch theme",
  darkTheme: "Switch to dark theme",
  lightTheme: "Switch to light theme",
  pauseGame: "Pause game",
  pauseTitle: "Pause (Esc)",
  pause: "Pause",
  handling: "SPECIAL HANDLING",
  heading: "A delicate operation.",
  deliverTo: "Deliver the piano to",
  bayDestination: "Loading Bay B.",
  pickup: "PICK UP",
  transport: "TRANSPORT",
  deliver: "DELIVER",
  shiftTime: "SHIFT TIME",
  integrity: "Cargo integrity",
  property: "Property damage",
  depot: "DEPOT 07",
  pianoRun: "THE PIANO RUN",
  map: "WAREHOUSE MAP",
  north: "N ↑",
  mapLabel: "Warehouse map: pickup south, delivery northeast",
  you: "YOU",
  cargo: "CARGO",
  bay: "BAY B",
  speed: "SPEED",
  forkHeight: "FORK HEIGHT",
  mastTilt: "MAST TILT",
  drive: "Drive",
  lift: "Lower / raise",
  tilt: "Tilt back / forward",
  brake: "Brake",
  look: "/ drag Look",
  retry: "Retry",
  loading: "Clocking in",
  loadingNote: "Getting your forklift ready.",
  desktop: "A keyboard is required to drive. Open on a desktop browser.",
  breather: "TAKE A BREATHER",
  pausedHeading: "Off the clock.",
  pausedNote: "Your shift is paused.",
  resume: "Resume shift",
  fresh: "Start a fresh shift",
  received: "DELIVERY RECEIVED / BAY B",
  certified: "You're certified.",
  resultSubtitle: "One piano. Mostly in one piece.",
  time: "TIME",
  cargoDamage: "CARGO DAMAGE",
  intact: "intact",
  propertyDamage: "PROPERTY DAMAGE",
  bonus: "CLEAN RUN BONUS",
  total: "TOTAL SCORE",
  collisions: "Major collisions",
  resultTip: "Try a faster, cleaner shift.",
  another: "Another shift",
  errorHeading: "Unable to clock in.",
  tryAgain: "Try again",
  loadError:
    "The warehouse could not load. Check that hardware acceleration is enabled, then try again.",
  restartError: "Unable to restart this shift. Reload to try again.",
  hintApproach: "Drive forward. Slide the forks under the pallet.",
  hintTipped: "The load tipped over. R starts a fresh shift.",
  hintLower: "Q  Lower gently inside the mint delivery zone.",
  hintSettle: "Perfect. Let the load settle…",
  hintWithdraw: "S  Back away to withdraw the forks.",
  hintLow: "Keep the load low. Q lowers your forks.",
  hintAisle: "Take the right aisle to Bay B. Easy on the corners.",
  hintFit: "Q  Lower the forks to fit under the pallet.",
  hintLift: "E  Lift the load, then T to tilt back slightly.",
  hintRecover: "Line up with the pallet and pick up the load again.",
  hintDrive: "W  Drive forward. Slide both forks under the pallet.",
  loadingBay: "LOADING BAY",
  pickupSign: "PICKUP  01",
  deliverySign: "B  /  DELIVERY",
  fragile: "↑  FRAGILE  ↑",
  description:
    "Three warehouse missions. Piano, ceramics, and heavy machinery. A physics-based forklift game.",
  canvasLabel:
    "Forklift Certified warehouse. WASD drive, E raise forks, Q lower, T and G tilt, Escape pause.",
  levels: "Level",
  nextLevel: "Next level",
  firstLevel: "Back to first level",
  missionPiano: "Deliver the piano to Loading Bay B.",
  briefPiano: "240 kg \u00b7 Wide load \u00b7 Right aisle",
  headingCeramics: "Handle with care.",
  missionCeramics: "Deliver the ceramics to Loading Bay A.",
  briefCeramics: "180 kg \u00b7 Very fragile \u00b7 Narrow bay",
  headingGenerator: "Heavy metal.",
  missionGenerator: "Deliver the generator to Loading Bay B.",
  briefGenerator: "540 kg \u00b7 Heavy load \u00b7 Cross the warehouse",
  hintLeftAisle: "Take the left aisle to Bay A. Protect the ceramics.",
  hintCrossAisle:
    "Cross to the right aisle below the center racks. Bay B awaits.",
  hintCenter: "Place the entire pallet in the center of the delivery zone.",
  deliveryZone: "DELIVERY",
  receivedPrefix: "DELIVERY RECEIVED",
  levelPiano: "Piano",
  levelCeramics: "Ceramics",
  levelGenerator: "Generator",
  mapDescription: "Warehouse map: blue cargo, green destination",
  runFinished: "Cargo delivered. Your next shift is waiting.",
  finalFinished: "All three routes explored? Try a faster, cleaner run.",
} as const;
export type TextKey = keyof typeof en;
export type Locale = "en" | "sk";
export const sk: Record<TextKey, string> = {
  navigation: "Navigácia hry",
  portfolio: "portfólio",
  games: "Hry",
  language: "Jazyk",
  shift: "SMENA 01",
  mute: "Vypnúť zvuk",
  unmute: "Zapnúť zvuk",
  audio: "Prepnúť zvuk",
  theme: "Prepnúť vzhľad",
  darkTheme: "Prepnúť na tmavý vzhľad",
  lightTheme: "Prepnúť na svetlý vzhľad",
  pauseGame: "Pozastaviť hru",
  pauseTitle: "Pauza (Esc)",
  pause: "Pauza",
  handling: "KREHKÝ NÁKLAD",
  heading: "Opatrne s klavírom.",
  deliverTo: "Doruč klavír do",
  bayDestination: "nakladacej zóny B.",
  pickup: "NALOŽIŤ",
  transport: "PREVIEZŤ",
  deliver: "DORUČIŤ",
  shiftTime: "ČAS SMENY",
  integrity: "Stav nákladu",
  property: "Škody v sklade",
  depot: "SKLAD 07",
  pianoRun: "PREVOZ KLAVÍRA",
  map: "MAPA SKLADU",
  north: "S ↑",
  mapLabel: "Mapa skladu: náklad na juhu, cieľ na severovýchode",
  you: "TY",
  cargo: "NÁKLAD",
  bay: "ZÓNA B",
  speed: "RÝCHLOSŤ",
  forkHeight: "VÝŠKA VIDLÍC",
  mastTilt: "NÁKLON",
  drive: "Jazda",
  lift: "Spustiť / zdvihnúť",
  tilt: "Nakloniť vzad / vpred",
  brake: "Brzda",
  look: "/ myš Pohľad",
  retry: "Odznova",
  loading: "Začíname smenu",
  loadingNote: "Pripravujeme vysokozdvižný vozík.",
  desktop: "Na ovládanie potrebuješ klávesnicu. Otvor hru na počítači.",
  breather: "ČAS NA PRESTÁVKU",
  pausedHeading: "Malá prestávka.",
  pausedNote: "Tvoja smena je pozastavená.",
  resume: "Pokračovať v smene",
  fresh: "Začať novú smenu",
  received: "NÁKLAD DORUČENÝ / ZÓNA B",
  certified: "Certifikát je tvoj.",
  resultSubtitle: "Jeden klavír. Viac-menej vcelku.",
  time: "ČAS",
  cargoDamage: "POŠKODENIE NÁKLADU",
  intact: "stav",
  propertyDamage: "ŠKODY V SKLADE",
  bonus: "BONUS ZA ČISTÚ JAZDU",
  total: "CELKOVÉ SKÓRE",
  collisions: "Silné nárazy",
  resultTip: "Skús to rýchlejšie a bez škôd.",
  another: "Ďalšia smena",
  errorHeading: "Smena sa nedá spustiť.",
  tryAgain: "Skúsiť znova",
  loadError:
    "Sklad sa nepodarilo načítať. Skontroluj, či je zapnutá hardvérová akcelerácia, a skús to znova.",
  restartError:
    "Smenu sa nepodarilo reštartovať. Obnov stránku a skús to znova.",
  hintApproach: "Choď dopredu. Zasuň vidlice pod paletu.",
  hintTipped: "Náklad sa prevrátil. Stlač R a začni novú smenu.",
  hintLower: "Q  Opatrne spusti náklad v zelenej cieľovej zóne.",
  hintSettle: "Výborne. Počkaj, kým sa náklad ustáli…",
  hintWithdraw: "S  Zacúvaj a vytiahni vidlice spod palety.",
  hintLow: "Drž náklad nízko. Klávesom Q spustíš vidlice.",
  hintAisle: "Pravou uličkou do zóny B. V zákrutách opatrne.",
  hintFit: "Q  Spusti vidlice, aby vošli pod paletu.",
  hintLift: "E  Zdvihni náklad, potom ho klávesom T nakloň dozadu.",
  hintRecover: "Zarovnaj vozík s paletou a znova nalož náklad.",
  hintDrive: "W  Choď dopredu. Zasuň obe vidlice pod paletu.",
  loadingBay: "NAKLADACIA ZÓNA",
  pickupSign: "NÁKLAD  01",
  deliverySign: "B  /  VYKLÁDKA",
  fragile: "↑  KREHKÉ  ↑",
  description:
    "Tri skladové misie. Klavír, keramika a ťažký generátor. Fyzikálna hra s vysokozdvižným vozíkom.",
  canvasLabel:
    "Sklad Forklift Certified. WASD jazda, E zdvihnúť vidlice, Q spustiť, T a G náklon, Escape pauza.",
  levels: "Level",
  nextLevel: "Ďalší level",
  firstLevel: "Späť na prvý level",
  missionPiano: "Doruč klavír do nakladacej zóny B.",
  briefPiano: "240 kg · Široký náklad · Pravá ulička",
  headingCeramics: "Pozor, krehké!",
  missionCeramics: "Doruč keramiku do nakladacej zóny A.",
  briefCeramics: "180 kg · Veľmi krehké · Úzka zóna",
  headingGenerator: "Ťažká váha.",
  missionGenerator: "Doruč generátor do nakladacej zóny B.",
  briefGenerator: "540 kg · Ťažký náklad · Naprieč skladom",
  hintLeftAisle: "Ľavou uličkou do zóny A. Pozor na keramiku.",
  hintCrossAisle: "Prejdi pod strednými regálmi do pravej uličky a zóny B.",
  hintCenter: "Ulož celú paletu do stredu cieľovej zóny.",
  deliveryZone: "VYKLÁDKA",
  receivedPrefix: "NÁKLAD DORUČENÝ",
  levelPiano: "Klavír",
  levelCeramics: "Keramika",
  levelGenerator: "Generátor",
  mapDescription: "Mapa skladu: modrý náklad, zelený cieľ",
  runFinished: "Náklad doručený. Čaká ťa ďalšia smena.",
  finalFinished: "Poznáš všetky tri trasy? Skús to rýchlejšie a bez škôd.",
};

let locale: Locale = "en";
const listeners = new Set<() => void>();
export function getLocale(): Locale {
  return locale;
}
export function t(key: TextKey): string {
  return (locale === "sk" ? sk : en)[key];
}
const formatters = new Map<string, Intl.NumberFormat>();
export function number(value: number, digits = 0): string {
  const key = `${locale}:${digits}`;
  let formatter = formatters.get(key);
  if (!formatter) {
    formatter = new Intl.NumberFormat(locale === "sk" ? "sk-SK" : "en-US", {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    });
    formatters.set(key, formatter);
  }
  return formatter.format(value);
}
export function onLocaleChange(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
export function setLocale(next: Locale): void {
  locale = next;
  if (typeof document !== "undefined") {
    document.documentElement.lang = locale;
    document
      .querySelector('meta[name="description"]')
      ?.setAttribute("content", t("description"));
    document
      .querySelector("#game")
      ?.setAttribute("aria-label", t("canvasLabel"));
    try {
      localStorage.setItem("locale", locale);
    } catch {
      /* Session-only language. */
    }
    const url = new URL(location.href);
    url.searchParams.set("lang", locale);
    history.replaceState(null, "", url);
  }
  listeners.forEach((listener) => listener());
}

export function cargoCondition(value: number): string {
  return locale === "sk"
    ? `${t("intact")}: ${number(value)} %`
    : `${number(value)}% ${t("intact")}`;
}
