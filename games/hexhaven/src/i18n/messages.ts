import { getLocale } from './locale';

const messages: Readonly<Record<string, string>> = {
  'Build a home on the Long Bay.': 'Vybuduj si domov v Dlhom zálive.',
  'Games save on this device.': 'Hry sa ukladajú v tomto zariadení.',
  'Saving…': 'Ukladám…',
  'Saved on this device': 'Uložené v tomto zariadení',
  'Saving is unavailable. Export a replay to keep your game.':
    'Ukladanie nie je dostupné. Exportuj záznam, aby sa hra zachovala.',
  'Choose your next move.': 'Vyber si ďalší ťah.',
  'Choose a coastal or inland vertex for your first village.':
    'Vyber zvýraznené miesto na pobreží alebo vo vnútrozemí pre svoju prvú dedinu.',
  'Your game has resumed.': 'Pokračuješ v rozohranej hre.',
  'Settings apply for this visit. Browser storage is unavailable.':
    'Nastavenia platia počas tejto návštevy. Úložisko prehliadača nie je dostupné.',
  'Replay loaded. Continue the game or review the turn log.':
    'Záznam je načítaný. Pokračuj v hre alebo si prezri denník ťahov.',
  'This replay could not be loaded. Choose a Hexhaven replay file.':
    'Záznam sa nepodarilo načítať. Vyber súbor so záznamom hry Hexhaven.',
  'The empty board, before setup.': 'Prázdna doska pred úvodným rozmiestnením.',
  'Selection cancelled.': 'Výber bol zrušený.',
  'Your game will save on this device.': 'Tvoja hra sa bude ukladať v tomto zariadení.',
  'Saved games are unavailable. You can still play and export replays.':
    'Uložené hry nie sú dostupné. Môžeš hrať a exportovať záznamy hier.',
  'The 3D view is unavailable.':
    '3D zobrazenie nie je dostupné. Skús zapnúť hardvérovú akceleráciu prehliadača.',
  'The computer player could not choose a move.':
    'Počítačový hráč nedokázal vybrať ťah. Obnov stránku a pokračuj z uloženej hry.',
  'That move could not be made. Choose an available action.':
    'Tento ťah sa nepodarilo vykonať. Vyber dostupnú akciu.',
  'That action is malformed. Choose an available control.':
    'Táto akcia má neplatný formát. Použi dostupné ovládanie.',
  'That action is malformed. Choose one of the available actions.':
    'Táto akcia má neplatný formát. Vyber jednu z dostupných akcií.',
  'That action is unavailable in this phase. Choose one of the available actions.':
    'Táto akcia teraz nie je dostupná. Vyber jednu z dostupných akcií.',
  'That vertex is too close to an existing village, disconnected, or unaffordable. Choose a marked vertex.':
    'Miesto je príliš blízko dediny, nie je pripojené k tvojej ceste alebo ti chýbajú suroviny. Vyber zvýraznené miesto.',
  'That road is occupied, disconnected, blocked by an opponent, or unaffordable. Choose a marked edge.':
    'Cesta je obsadená, nepripojená, blokovaná protihráčom alebo ti chýbajú suroviny. Vyber zvýraznenú hranu.',
  'No resources need discarding.': 'Teraz nemusíš vracať žiadne suroviny.',
  'The bandit cannot move now.': 'Zbojníka teraz nemôžeš presunúť.',
  'Choose a bandit destination first.': 'Najprv vyber nové políčko pre zbojníka.',
  'The development deck is empty.': 'Balíček rozvojových kariet je prázdny.',
  'That card is not in your hand.': 'Túto kartu nemáš v ruke. Vyber kartu zo svojej ruky.',
  'Victory cards reveal automatically when you win.':
    'Karty víťazných bodov sa odhalia automaticky pri výhre.',
  'Play a year of plenty card first.': 'Najprv zahraj kartu Rok hojnosti.',
  'There is no open trade offer.': 'Teraz nie je otvorená žiadna obchodná ponuka.',
  'That counteroffer is no longer open.': 'Táto protiponuka už nie je otvorená.',
  'Choose two to four players and an integer seed.':
    'Vyber dvoch až štyroch hráčov a celočíselný kód ostrova.',
  'The replay must contain an integer seed.': 'Záznam musí obsahovať celočíselný kód ostrova.',
  'The replay layout must be beginner or random.':
    'Záznam musí používať ostrov pre začiatočníkov alebo náhodný ostrov.',
  'The replay must contain two to four players.': 'Záznam musí obsahovať dvoch až štyroch hráčov.',
  'The replay is not valid JSON.':
    'Súbor nemá platný formát JSON. Vyber exportovaný záznam hry Hexhaven.',
  'This replay format is unsupported. Expected version 1.':
    'Tento formát záznamu nie je podporovaný. Vyber záznam verzie 1.',
  'The replay action list is missing.':
    'V zázname chýba zoznam ťahov. Vyber iný exportovaný súbor.',
  'This browser does not provide local game storage.':
    'Tento prehliadač nepodporuje miestne ukladanie hier. Hru si môžeš zachovať exportom záznamu.',
  'Another Hexhaven tab is blocking local storage. Close it and try again.':
    'Iná karta s hrou Hexhaven blokuje úložisko. Zavri ju a skús to znova.',
  'Local game storage could not open.':
    'Úložisko hier sa nepodarilo otvoriť. Skontroluj povolenia úložiska prehliadača.',
  'The local storage operation did not start.':
    'Ukladanie sa nespustilo. Exportuj záznam, aby sa hra zachovala.',
  'The local storage transaction failed.':
    'Ukladanie zlyhalo. Exportuj záznam, aby sa hra zachovala.',
  'The saved data is invalid.': 'Uložené údaje nie sú platné.',
};

const placements: Readonly<Record<string, string>> = {
  'move the bandit': 'presun zbojníka',
  'the bandit move': 'presun zbojníka',
  'build a road': 'stavbu cesty',
  'a road': 'stavbu cesty',
  'build a village': 'stavbu dediny',
  'a village': 'stavbu dediny',
  'build a town': 'rozšírenie na mesto',
  'a town': 'rozšírenie na mesto',
};

/** App/engine diagnostics stay stable; only their user-facing presentation changes. */
export function translateMessage(message: string): string {
  if (getLocale() === 'en' || message === '') return message;
  const translated = messages[message];
  if (translated) return translated;
  const selected = /^Location selected\. Confirm to (.+)\.$/.exec(message);
  if (selected) return `Miesto je vybrané. Potvrď ${placements[selected[1] ?? ''] ?? 'svoj ťah'}.`;
  const location = /^Location (\d+) of (\d+)\. Press Enter to confirm (.+)\.$/.exec(message);
  if (location)
    return `Miesto ${location[1]} z ${location[2]}. Klávesom Enter potvrď ${placements[location[3] ?? ''] ?? 'svoj ťah'}.`;
  const player = /^Replay player (\d+) has invalid settings\.$/.exec(message);
  if (player) return `Hráč ${player[1]} má v zázname neplatné nastavenia. Vyber iný súbor.`;
  const action = /^Replay action (\d+) is malformed\.$/.exec(message);
  if (action) return `Ťah ${action[1]} má v zázname neplatný formát. Vyber iný súbor.`;
  const savePrefix = 'Save failed: ';
  const saveSuffix = '. Export a replay to keep your game.';
  if (message.startsWith(savePrefix) && message.endsWith(saveSuffix))
    return `Uloženie zlyhalo. ${translateMessage(message.slice(savePrefix.length, -saveSuffix.length))} Exportuj záznam, aby sa hra zachovala.`;
  const restorePrefix = 'The saved game could not be restored. ';
  if (message.startsWith(restorePrefix))
    return `Uloženú hru sa nepodarilo obnoviť. ${translateMessage(message.slice(restorePrefix.length))}`;
  if (message.startsWith('3D view: ')) return messages['The 3D view is unavailable.'] ?? '';
  return 'Akciu sa nepodarilo dokončiť. Skús ju znova alebo obnov stránku a načítaj uloženú hru.';
}
