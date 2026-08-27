export default {
  meta: {
    lang: 'sk',
    title: 'Alena Martinková — full stack vývojárka · tech & team lead',
    description:
      'Full stack vývojárka so zameraním na backend · tech & team lead. Python, FastAPI, PostgreSQL, Redis, RabbitMQ, React. Vediem backend v Rankacy.',
  },

  nav: {
    about: 'o mne',
    stack: 'stack',
    work: 'práca',
    career: 'kariéra',
    contact: 'kontakt',
    status: 'Backend Lead @ Rankacy',
    skip: 'Preskočiť na obsah',
    menu: 'Navigačné menu',
    sections: 'Sekcie',
  },

  hero: {
    eyebrow: 'Tech & team lead · Ostrava / remote',
    role: 'Full stack vývojárka so zameraním na backend',
    lead: 'V Rankacy vediem backend analytickej platformy pre CS2 a popri tom robím klientske projekty naprieč celým stackom. Potrpím si na architektúru, ktorá dáva zmysel aj o rok, API, ktoré vydržia, a termíny, ktoré platia.',
    ctaContact: 'Napíšte mi!',
    ctaWork: 'Pozrieť prácu',
  },

  terminal: {
    keys: { status: 'stav', location: 'lokalita', email: 'e-mail' },
    status: 'Aktuálne: Backend Lead @ Rankacy',
    location: 'Pôsobím v Ostrave · remote-friendly',
    focus: [
      'Pipeline na dáta zo zápasov a štatistické API v Rankacy',
      'Event-driven služby: FastAPI · RabbitMQ · PostgreSQL',
      'Mentoring, code review a architektúra naprieč tímom',
    ],
  },

  about: {
    index: 'o mne',
    title: 'Od prvého diagramu po produkciu',
    description:
      'Začínala som v roku 2019 v agentúrach — e-shopy, rezervačné systémy a interné nástroje pre medzinárodných klientov — a z frontendu som cez full stack prerástla k vedeniu tímu. Vedenie ma o kód nepripravilo: veľkú časť ho stále píšem sama.',
    notes: [
      'Môj denný stack je Python (FastAPI), PostgreSQL, Redis a RabbitMQ, vpredu React. Záleží mi na čistej architektúre, testoch, ktoré si na seba zarobia (PyTest, Cypress), a observabilite, z ktorej sa dá naozaj debugovať.',
      'Viesť tím pre mňa znamená jasné zadania, úprimné code review a mentoring bez mikromanažmentu. Mimo kódu ma baví kreatívna stránka — čokoľvek, vďaka čomu sa produkt lepšie používa.',
    ],
    caption: 'Aktuálne vyvíjam v Rankacy',
    stats: [
      'Rokov dodávania produktov',
      'Služieb a aplikácií dodaných od návrhu po produkciu',
      'Vedené tímy',
    ],
  },

  skills: {
    index: 'stack',
    title: 'Stack, ktorému verím, a ako s ním pracujem',
    description:
      'Diagram je tvar, ktorý má väčšina mojich systémov — pokojne klikajte, každý uzol má alternatívy.',
    groups: [
      {
        title: 'Backend a platformové inžinierstvo',
        description:
          'API, fronty a dátové modely, ktoré si držia tvar aj pod reálnou záťažou.',
        items: [
          'Python · FastAPI',
          'PostgreSQL · SQLAlchemy',
          'Redis · RabbitMQ',
          'Návrh API a event-driven služby',
        ],
      },
      {
        title: 'Produkt a frontend',
        description:
          'Full stack znamená, že fungovať musí produkt, nielen endpointy.',
        items: [
          'React · Vue',
          'Stav, formuláre a real-time UI',
          'Úzka spolupráca s dizajnom a produktom',
          'Prístupnosť a výkon',
        ],
      },
      {
        title: 'Dodávky a spoľahlivosť',
        description:
          'Mám rada systémy, ktoré sa nerozsypú o druhej ráno. Alebo horšie — pri piatkovom release.',
        items: [
          'CI/CD pipeline',
          'Docker · Kubernetes',
          'PyTest · Cypress · integračné testy',
          'Metriky a logovanie',
        ],
      },
      {
        title: 'Vedenie tímu a práca s AI',
        description:
          'Systému má rozumieť celý tím, nie jeden človek, ktorý drží všetko v hlave.',
        items: [
          'Mentoring a kultúra code review',
          'Zadania, odhady a plánovanie',
          'AI tam, kde nás reálne zrýchli',
          'Architektonické rozhodnutia zostávajú na vývojároch',
        ],
      },
    ],
  },

  work: {
    index: 'práca',
    title: 'Projekty, pod ktoré sa rada podpíšem',
    description:
      'Výber z produktovej práce aj klientskych dodávok. Väčšina beží v produkcii dodnes — a práve na to som hrdá.',
    via: 'cez',
    moreLabel: 'Ďalšie klientske projekty',
    projects: [
      {
        type: 'Analytická platforma pre e-sport',
        summary:
          'Rankacy hovorí hráčom CS2, v čom sa zlepšiť. Ja mám na starosti backend, ktorý to umožňuje — príjem a spracovanie zápasov, štatistické API, predplatné — od prvého architektonického rozhodnutia po posledné review.',
        highlights: [
          'Event-driven služby vo FastAPI — spracovanie zápasov rozdelené cez RabbitMQ',
          'PostgreSQL s miliónmi záznamov o zápasoch, Redis ako cache na časté čítania',
          'Beží na AWS pre hráčov po celom svete',
          'Predplatné a fakturácia cez Stripe',
        ],
        linkLabel: 'Pozrieť platformu',
      },
      {
        type: 'E-commerce prepojený s ERP',
        summary:
          'E-shop s priemyselným sortimentom postavený ako plne custom systém — FastAPI backend, storefront aj administrácia v Reacte: dynamické ceny, viacjazyčný katalóg, synchronizácia s ERP.',
        highlights: [
          'Integrácie logistiky, dopravy a platieb nasadzované bez odstávok',
          'Interná administrácia objednávok a produktov',
        ],
        linkLabel: 'Pozrieť web',
      },
      {
        type: 'Rezervačná platforma pre kúpele',
        summary:
          'Rezervačný portál pre kúpeľné pobyty v štýle Bookingu, napísaný od nuly v Laraveli a Reacte — verejný web aj interná administrácia ako jeden custom systém. Môj posledný a najväčší agentúrny projekt.',
        highlights: [
          'Vlastný systém dostupnosti a rezervácií — bez hotového booking enginu',
          'Verejný portál a administrácia postavené ako jeden celok',
        ],
        linkLabel: 'Pozrieť portál',
      },
    ],
    more: [
      { summary: 'Web pre vzťahy s investormi nápojovej skupiny Kofola' },
      {
        summary:
          'Portfólio českých webov Veolie vrátane systému verejných zákaziek',
      },
      { summary: 'Web a predaj vstupeniek ostravskej filharmónie' },
      { summary: 'E-shopy outdoorovej značky na štyroch trhoch' },
      { summary: 'Viacjazyčný web výrobcu cukroviniek značky Pedro' },
      { summary: 'Portál pre 12 športovísk v Ostrave' },
      { summary: 'Web jednej z najväčších kníhtlačiarní v strednej Európe' },
      { summary: 'Web tradičného výrobcu nábytku z masívu' },
      { summary: 'Web najväčšej školy varenia v Česku' },
      { summary: 'Web a mobilná appka predajcu doplnkov výživy' },
      { summary: 'Webová prezentácia strechárskej firmy' },
      { summary: 'Web českej advokátskej kancelárie' },
    ],
  },

  career: {
    index: 'kariéra',
    title: 'Kariéra v skratke',
    description:
      'Skrátená verzia — každá zastávka ma naučila niečo iné.',
    linkedin: 'Celá história na LinkedIne',
    items: [
      {
        period: '2024 — súčasnosť',
        title: 'Backend Lead Developer · Rankacy',
        description:
          'Nastúpila som ako full stack vývojárka, po dvoch mesiacoch som prevzala vedenie backendu. Architektúra, plánovanie, review — a každodenný chod platformového tímu.',
      },
      {
        period: '2023 — 2024',
        title: 'Frontend Developer · GIMMEDATA',
        description:
          'Frontend v Reacte a GraphQL pre dátové klientske produkty.',
      },
      {
        period: '2022 — súčasnosť',
        title: 'Full Stack Lead Developer · WAPS Technologies · freelance',
        description:
          'Na voľnej nohe od 2019; od 2022 vediem full stack klientske dodávky pre WAPS — architektonické rozhodnutia aj implementácia.',
      },
      {
        period: '2019 — 2023',
        title: 'Frontend → Full Stack Developer · Moravio',
        description:
          'Začínala som na frontendoch (Vue, WordPress) a prerástla k full stack práci v Laraveli a Next.js. Mala som na starosti CI/CD a testovanie, releasy som prezentovala priamo medzinárodným klientom.',
      },
      {
        period: '2018 — 2024',
        title: 'Bc. & Ing. · VŠB-TUO, Ostrava',
        description:
          'Informatika. Diplomová práca: blockchain framework napísaný od nuly v Pythone.',
      },
    ],
  },

  contact: {
    index: 'kontakt',
    title: 'Staviate backend alebo hľadáte tech leada?',
    note: 'Napíšte mi pár riadkov o tom, čo chystáte — či je to nový projekt, alebo tím, ktorému treba pomôcť — a spojíme sa.',
    ctaEmail: 'Napísať e-mail',
    ctaLinkedIn: 'Spojiť sa na LinkedIne',
    copy: 'Kopírovať',
    copied: 'E-mail skopírovaný',
  },

  diagram: {
    hint: 'kliknite na uzol pre detail',
    scenarios: { all: 'všetko', request: 'http request', job: 'async job' },
    swap: 'zmeniť:',
    usedIn: 'použité v:',
    close: 'Zavrieť detail',
    containers: 'Každá služba beží vo vlastnom kontajneri.',
    aria: 'Interaktívny diagram architektúry. Vyberte tok alebo uzol pre zobrazenie alternatív.',
  },

  appearance: {
    trigger: 'Nastavenie vzhľadu',
    accent: 'farba',
    cursor: 'kurzor',
    theme: theme => `Prepnúť na ${theme} režim`,
    themeDark: 'tmavý',
    themeLight: 'svetlý',
    language: 'jazyk',
  },

  footer: { top: 'nahor' },
}
