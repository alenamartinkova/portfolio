export const en = {
  levelFirst: "First evening",
  levelReception: "Visitor badge",
  levelRolling: "Rolling stock",
  levelSecurity: "Security training",
  levelAccounts: "Balancing the books",
  levelArchive: "Archive expedition",
  levelNight: "Night shift",
  levelExecutive: "Executive floor",
  levelLockdown: "Lockdown",
  levelLast: "Last one out",
  briefFirst: "Learn the route on wide, stable furniture. Follow the mint markers and land on checkpoints.",
  briefCards: "Collect the gold access card on a checkpoint to unlock the exit. Cards stay collected after a fall.",
  briefRolling: "Orange furniture rolls and tips. Use E to position it, then collect both access cards.",
  briefSecurity: "Wait on furniture while beams are red. Cross on green; amber warns that the beams will reactivate. Collect every card.",
  briefPrecision: "Narrow landings demand careful sprint jumps. Plan your approach to the security gates and collect every card.",
  briefArchive: "Three access cards, rolling carts and a climb through the archives. Secure each checkpoint before moving on.",
  briefLockdown: "Three independently timed gates protect this floor. Find a safe rhythm and collect all three cards.",
  briefLast: "The final exam: narrow furniture, rolling landings, three cards and three security gates. Every jump counts.",
  levels: "Level",
  nextLevel: "NEXT LEVEL",
  firstLevel: "BACK TO FIRST LEVEL",
  cards: "ACCESS CARDS",
  cardCollected: "ACCESS CARD COLLECTED",
  exitLocked: "EXIT LOCKED · COLLECT ALL GOLD CARDS",
  securityHit: "SECURITY BEAM · BACK TO CHECKPOINT",
  cardSign: "ACCESS CARD",
  securitySign: "WAIT FOR GREEN",
  starGoal: "Stars: escape · no falls · also finish under {time}.",
  levelLabel: "LEVEL {number} / 10",
  campaignFinished: "Final floor cleared. Earn three stars on all ten levels.",

  navigation: 'Game navigation', portfolio: 'portfolio', games: 'Games', language: 'Language',
  mute: 'Mute sound', unmute: 'Unmute sound', darkTheme: 'Switch to dark theme', lightTheme: 'Switch to light theme', pauseGame: 'Pause game', pause: 'Pause',
  rule: 'ONE VERY SIMPLE RULE', objective: 'Don’t touch the floor.', objectiveNote: 'Get to the exit. Keep your dignity.',
  clock: 'ON THE CLOCK', best: 'PERSONAL BEST', route: 'YOUR WAY OUT', you: '← YOU', incidents: 'FLOOR INCIDENTS',
  move: 'move', jump: 'jump / mantle', sprint: 'sprint', drag: 'drag', checkpoint: 'checkpoint', look: 'drag mouse to look', overtime: 'OVERTIME IS NOT AN OPTION',
  rebellion: 'A SMALL ACT OF CORPORATE REBELLION', introHeading: 'Out of office.', introEmphasis: 'Literally.',
  introNote: 'The day is done. The floor is off limits. Desk-hop, chair-roll, and jump your way to a well-deserved evening.',
  loading: 'SETTING UP THE OFFICE', play: 'LET’S CLOCK OUT', oneOffice: '10 LEVELS', fourCheckpoints: '04 CHECKPOINTS', zeroOvertime: 'ZERO OVERTIME',
  desktop: 'Keyboard + mouse recommended · Sound on for office ambience', furniturePath: 'Yes, the furniture is the path.', hr: 'HR would like a word.',
  breakLabel: 'TAKE FIVE', breakHeading: 'On a break.', breakNote: 'The clock and the office are paused.', resume: 'BACK TO WORK', fresh: 'Start a fresh run',
  success: 'SUCCESSFULLY UNAVAILABLE', escaped: 'Escaped', resultNote: 'Your next meeting is with the outside world.', yourTime: 'YOUR TIME', falls: 'FALLS', beat: 'BEAT YOUR TIME', back: 'Back to games',
  errorHeading: 'Office closed.', errorNote: 'The 3D engine could not start. Enable WebGL in your browser and reload.', retry: 'TRY AGAIN',
  floorTouched: 'FLOOR TOUCHED', checkpointSaved: 'CHECKPOINT SAVED · KEEP GOING',
  dragging: 'Dragging {object} · E to release · stay close to the edge', nearby: 'E · Drag {object} — orange furniture can move',
  openOffice: 'Open office', meetings: 'Meeting rooms', coffee: 'Coffee break', final: 'The last stretch',
  hintOffice: 'Follow the mint markers. Space to jump; hold it near a ledge to mantle.',
  hintMeetings: 'Sprint for the gaps. The orange furniture rolls. E to drag it closer.',
  hintCoffee: 'Keep your balance. Carts slide, boxes tip. R returns to this checkpoint.',
  hintFinal: 'Climb the archive shelves. The green exit is your way out.',
  startSign: 'START HERE', checkpointSign: 'CHECKPOINT', emailSign: 'THIS COULD HAVE BEEN AN EMAIL',
  climbSign: 'DO NOT CLIMB ON FURNITURE', synergySign: 'SYNERGY. BUT MAKE IT URGENT.', meetingSign: 'QUARTERLY SYNERGY MEETING', coffeeSign: 'PER MY LAST COFFEE', exitSign: 'EXIT  →', outSign: 'OUT OF OFFICE',
  chair: 'office chair', cart: 'rolling cart', box: 'archive box', plant: 'potted plant', whiteboard: 'whiteboard bridge', furniture: 'furniture',
  title: 'Office Escape — Out of office. Literally.', description: 'Escape across desks and rolling chairs without touching the floor. A playful 3D office game.',
  canvasLabel: 'Office Escape 3D game. WASD to move, Space to jump, Shift to sprint, E to drag furniture, Escape to pause.',
} as const;
export type TextKey = keyof typeof en;
export type Locale = 'en' | 'sk';
export const sk: Record<TextKey, string> = {
  levelFirst: "Prvý večer",
  levelReception: "Návštevná karta",
  levelRolling: "Pojazdná kancelária",
  levelSecurity: "Bezpečnostný tréning",
  levelAccounts: "Účtovnícka rovnováha",
  levelArchive: "Výprava do archívu",
  levelNight: "Nočná smena",
  levelExecutive: "Poschodie vedenia",
  levelLockdown: "Uzavreté oddelenie",
  levelLast: "Posledný zhasína",
  briefFirst: "Nauč sa trasu na širokom, stabilnom nábytku. Sleduj zelené značky a pristávaj na záchytných bodoch.",
  briefCards: "Zober zlatú prístupovú kartu na záchytnom bode a odomkni východ. Po páde ti karta zostane.",
  briefRolling: "Oranžový nábytok sa posúva a prevracia. Klávesom E ho nastav a pozbieraj obe prístupové karty.",
  briefSecurity: "Pri červených lúčoch počkaj na nábytku. Prechádzaj na zelenú; žltá upozorňuje na zapnutie lúčov. Pozbieraj všetky karty.",
  briefPrecision: "Úzke plochy vyžadujú presné skoky so šprintom. Naplánuj si prechod bezpečnostnými bránami a pozbieraj všetky karty.",
  briefArchive: "Tri prístupové karty, pojazdné vozíky a výstup archívom. Pred ďalším úsekom si ulož záchytný bod.",
  briefLockdown: "Poschodie strážia tri samostatne časované brány. Nájdi bezpečný rytmus a pozbieraj všetky tri karty.",
  briefLast: "Záverečná skúška: úzky nábytok, pohyblivé plochy, tri karty a tri bezpečnostné brány. Každý skok sa počíta.",
  levels: "Level",
  nextLevel: "ĎALŠÍ LEVEL",
  firstLevel: "SPÄŤ NA PRVÝ LEVEL",
  cards: "PRÍSTUPOVÉ KARTY",
  cardCollected: "PRÍSTUPOVÁ KARTA ZÍSKANÁ",
  exitLocked: "VÝCHOD ZAMKNUTÝ · POZBIERAJ VŠETKY ZLATÉ KARTY",
  securityHit: "BEZPEČNOSTNÝ LÚČ · NÁVRAT NA ZÁCHYTNÝ BOD",
  cardSign: "PRÍSTUPOVÁ KARTA",
  securitySign: "POČKAJ NA ZELENÚ",
  starGoal: "Hviezdy: uteč · bez pádov · navyše čas pod {time}.",
  levelLabel: "LEVEL {number} / 10",
  campaignFinished: "Posledné poschodie dokončené. Získaj tri hviezdy vo všetkých desiatich leveloch.",

  navigation: 'Navigácia hry', portfolio: 'portfólio', games: 'Hry', language: 'Jazyk',
  mute: 'Vypnúť zvuk', unmute: 'Zapnúť zvuk', darkTheme: 'Prepnúť na tmavý vzhľad', lightTheme: 'Prepnúť na svetlý vzhľad', pauseGame: 'Pozastaviť hru', pause: 'Pauza',
  rule: 'JEDNO JEDNODUCHÉ PRAVIDLO', objective: 'Nedotkni sa podlahy.', objectiveNote: 'Dostaň sa k východu. So cťou, ak sa dá.',
  clock: 'ČAS ÚTEKU', best: 'OSOBNÝ REKORD', route: 'CESTA VON', you: '← TY', incidents: 'STRETNUTIA S PODLAHOU',
  move: 'pohyb', jump: 'skok / vyliezť', sprint: 'šprint', drag: 'ťahať', checkpoint: 'záchytný bod', look: 'ťahaním myši otáčaj pohľad', overtime: 'NADČASY NEPRICHÁDZAJÚ DO ÚVAHY',
  rebellion: 'MALÝ AKT FIREMNEJ VZBURY', introHeading: 'Mimo kancelárie.', introEmphasis: 'Doslova.',
  introNote: 'Pracovný deň sa skončil. Na podlahu nesmieš. Preskáč po stoloch, zvez sa na stoličke a uži si zaslúžený voľný večer.',
  loading: 'PRIPRAVUJEME KANCELÁRIU', play: 'PADLA, IDEME DOMOV', oneOffice: '10 LEVELOV', fourCheckpoints: '04 ZÁCHYTNÉ BODY', zeroOvertime: 'ŽIADNE NADČASY',
  desktop: 'Odporúčame klávesnicu a myš · So zvukom ožije aj kancelária', furniturePath: 'Áno, cesta vedie po nábytku.', hr: 'Personálne si ťa zavolá.',
  breakLabel: 'ČAS NA PRESTÁVKU', breakHeading: 'Malá prestávka.', breakNote: 'Čas aj dianie v kancelárii sú pozastavené.', resume: 'POKRAČOVAŤ V ÚTEKU', fresh: 'Začať nový pokus',
  success: 'ÚSPEŠNE NEDOSTUPNÝ', escaped: 'Konečne vonku', resultNote: 'Ďalšie stretnutie máš so svetom za oknom.', yourTime: 'TVOJ ČAS', falls: 'PÁDY', beat: 'PREKONAŤ SVOJ ČAS', back: 'Späť na hry',
  errorHeading: 'Kancelária je zatvorená.', errorNote: '3D hru sa nepodarilo spustiť. Zapni WebGL v prehliadači a obnov stránku.', retry: 'SKÚSIŤ ZNOVA',
  floorTouched: 'DOTYK S PODLAHOU', checkpointSaved: 'ZÁCHYTNÝ BOD ULOŽENÝ · POKRAČUJ',
  dragging: 'Ťaháš {object} · E na pustenie · drž sa pri okraji', nearby: 'E · Potiahni {object} — oranžový nábytok sa dá posúvať',
  openOffice: 'Otvorená kancelária', meetings: 'Zasadačky', coffee: 'Prestávka na kávu', final: 'Posledný úsek',
  hintOffice: 'Sleduj zelené značky. Medzerníkom skočíš; podrž ho pri hrane a vylezieš hore.',
  hintMeetings: 'Väčšie medzery preskoč so šprintom. Oranžový nábytok sa hýbe. Klávesom E ho pritiahneš.',
  hintCoffee: 'Udrž rovnováhu. Vozíky sa kĺžu, škatule sa prevracajú. R ťa vráti na záchytný bod.',
  hintFinal: 'Vyšplhaj sa po archívnych regáloch. Zelený východ je tvoja cesta von.',
  startSign: 'ZAČNI TU', checkpointSign: 'ZÁCHYTNÝ BOD', emailSign: 'TOTO MOHOL BYŤ E-MAIL',
  climbSign: 'ZÁKAZ LEZENIA PO NÁBYTKU', synergySign: 'SYNERGIA. ZNAČKA: SÚRNE.', meetingSign: 'ŠTVRŤROČNÁ PORADA O SYNERGII', coffeeSign: 'V NADVÄZNOSTI NA MOJU POSLEDNÚ KÁVU', exitSign: 'VÝCHOD  →', outSign: 'MIMO KANCELÁRIE',
  chair: 'kancelársku stoličku', cart: 'pojazdný vozík', box: 'archívnu škatuľu', plant: 'kvetináč', whiteboard: 'most z tabule', furniture: 'nábytok',
  title: 'Office Escape — Mimo kancelárie. Doslova.', description: 'Uteč po stoloch a pojazdných stoličkách bez dotyku s podlahou. Hravá 3D kancelárska hra.',
  canvasLabel: '3D hra Office Escape. WASD na pohyb, medzerník na skok, Shift na šprint, E na ťahanie nábytku, Escape na pauzu.',
};
let locale: Locale = 'en';
const listeners = new Set<() => void>();
export const getLocale = () => locale;
export const t = (key: TextKey): string => (locale === 'sk' ? sk : en)[key];
export function onLocaleChange(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; }
export function setLocale(next: Locale) {
  locale = next;
  if (typeof document !== 'undefined') {
    document.documentElement.lang = next;
    document.title = t('title');
    document.querySelector('meta[name="description"]')?.setAttribute('content', t('description'));
    document.querySelector('#game')?.setAttribute('aria-label', t('canvasLabel'));
    try { localStorage.setItem('locale', next); } catch { /* Session-only preference. */ }
    const url = new URL(location.href); url.searchParams.set('lang', next); history.replaceState(null, '', url);
  }
  listeners.forEach(listener => listener());
}
export function furnitureName(name: string) {
  const keys: Record<string, TextKey> = { 'office chair': 'chair', 'rolling cart': 'cart', 'archive box': 'box', 'potted plant': 'plant', 'whiteboard bridge': 'whiteboard' };
  return t(keys[name] ?? 'furniture');
}
export const areaNames: TextKey[] = ['openOffice', 'meetings', 'coffee', 'final'];
export const areaHints: TextKey[] = ['hintOffice', 'hintMeetings', 'hintCoffee', 'hintFinal'];
