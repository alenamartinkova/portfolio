export default {
  meta: {
    lang: 'sk',
    title: 'Alena Martinková — backend engineer & tech lead',
    description:
      'Alena Martinková — full stack vývojárka so zameraním na backend a tech lead. Python, FastAPI, PostgreSQL, Redis, RabbitMQ, React.',
  },

  nav: {
    about: 'o mne',
    stack: 'stack',
    work: 'práca',
    contact: 'kontakt',
    status: 'Backend Lead @ Rankacy',
    skip: 'Preskočiť na obsah',
    sections: 'Sekcie',
  },

  hero: {
    eyebrow: 'Full stack · Produktovo vedený vývoj',
    role: 'Full stack vývojárka so zameraním na backend',
    lead: 'Vyvíjam škálovateľné platformy a produkty založené na dátach. Sústredím sa na návrh backendových architektúr, vedenie vývojových tímov a úzku spoluprácu s dizajnom a produktom, aby bol výsledok rýchly, merateľný a kvalitný.',
    ctaContact: 'Napíšte mi!',
    ctaWork: 'Pozrieť prácu',
  },

  terminal: {
    keys: { status: 'stav', location: 'lokalita', email: 'e-mail' },
    status: 'Aktuálne: Backend Lead @ Rankacy',
    location: 'Pôsobím v Ostrave · remote-friendly',
    focus: [
      'Návrh distribuovaných Python microservices a dátových pipeline',
      'Rozvoj platformy a funkcií bežiacich v reálnom čase',
      'Spolupráca naprieč produktom, dizajnom a vývojom',
    ],
  },

  about: {
    index: 'o mne',
    title:
      'Backend vývojárka s produktovým myslením a dôrazom na čisté, spoľahlivé systémy',
    description:
      'Som full stack vývojárka so zameraním na backend a vyvíjam rýchle, spoľahlivé webové platformy. Od roku 2019 som dodávala všetko od e-shopov a rezervačných systémov po interné nástroje a produkty pracujúce s dátami v reálnom čase — aktuálne vediem backend v Rankacy, predtým som pracovala pre Moravio a GIMMEDATA. Úzko spolupracujem s dizajnom a produktom, aby každý release držal pohromade, bol merateľný a výkonný.',
    notes: [
      'Môj hlavný stack je Python (FastAPI), PostgreSQL, Redis, RabbitMQ a React. Záleží mi na čistej architektúre, efektívnych riešeniach, observabilite a poctivom testovaní (PyTest, Cypress).',
      'Baví ma viesť tímy, mentorovať vývojárov a udržať releasy jasné a predvídateľné. Mimo kódu ma zaujíma aj kreatívna stránka — čokoľvek, čo zlepší užívateľský zážitok.',
    ],
    caption: 'Aktuálne vyvíjam v Rankacy',
    stats: [
      'Rokov dodávania digitálnych produktov',
      'Produkčných služieb a webových aplikácií dodaných od začiatku do konca',
      'Vedené cross-funkčné tímy',
    ],
  },

  skills: {
    index: 'stack',
    title: 'Systémové myslenie, čistá architektúra a dodávky, ktoré držia',
    description:
      'Rada beriem zložité zadania a mením ich na prehľadné, škálovateľné systémy. Moja práca stojí na pomedzí inžinierstva, produktovej jasnosti a premysleného používateľského zážitku. Záleží mi na správnosti, udržateľnosti a na tom, aby tím dodával v pokoji — nie v chaose.',
    groups: [
      {
        title: 'Backend a platformové inžinierstvo',
        description:
          'Návrh a škálovanie backendových systémov, ktoré zostanú rýchle, predvídateľné a pochopiteľné aj keď vyrastú.',
        items: [
          'Python · FastAPI',
          'PostgreSQL · SQLAlchemy',
          'Redis · RabbitMQ',
          'Návrh API',
        ],
      },
      {
        title: 'Vývoj webových produktov',
        description:
          'Vyvíjam použiteľné a efektívne produkty — nielen endpointy.',
        items: [
          'React a základy moderného frontendu',
          'Stav, routing, formuláre a real-time aktualizácie UI',
          'Plynulá spolupráca',
          'Prístupnosť a ohľad na výkon',
        ],
      },
      {
        title: 'Nasadenie, testovanie a spoľahlivosť',
        description:
          'Mám rada systémy, ktoré sa nerozsypú o druhej ráno. Alebo horšie — pri piatkovom release.',
        items: [
          'CI/CD pipeline',
          'Dockerizované služby · Kubernetes',
          'PyTest a integračné testy',
          'Metriky a logovanie',
        ],
      },
      {
        title: 'Vývoj s podporou AI',
        description:
          'AI nástroje sú bežnou súčasťou mojej práce, nie experiment na okraji — používam ich tam, kde reálne zrýchlia veci, a nechávam ich mimo tam, kde nie.',
        items: [
          'Písanie kódu a code review s podporou AI',
          'Kontext a prompty, ktoré fungujú na reálnom codebase',
          'Architektonické rozhodnutia zostávajú na vývojárovi',
          'Pomáham tímu osvojiť si to bez zľavovania z kvality',
        ],
      },
    ],
  },


  work: {
    index: 'práca',
    title: 'Spolupráca postavená na dôvere, dodávkach a merateľnom dopade',
    description:
      'Spolupracujem so zakladateľmi, agentúrami a internými tímami na ceste od nápadu k škálovateľnému spusteniu — a zostávam aj na iterácie.',
    clientsLabel: 'Klienti',
    via: 'cez',
    previously: 'Predtým',
    projects: [
      {
        type: 'Analytická platforma pre e-sport',
        role: 'Backend Lead Developer',
        period: 'mar 2024 — súčasnosť',
        previous: 'Full Stack Developer · jan 2024 — mar 2024',
        summary:
          'Backend pre competitive gaming, ktorý poháňa štatistiky hráčov v CS2, spracovanie zápasov a predplatné. Vediem softvérový tím, riadim návrh riešenia od začiatku do konca a držím v chode každodenné dodávky — od architektúry API po review implementácií.',
        highlights: [
          'Event-driven služby vo FastAPI spracúvajúce dáta zo zápasov vo veľkom objeme',
          'PostgreSQL databáza s miliónmi záznamov o zápasoch, ladená na rýchle čítanie',
          'Škálovanie na AWS pre hráčov po celom svete',
          'Systém predplatného a fakturácia cez Stripe',
        ],
        linkLabel: 'Pozrieť platformu',
      },
      {
        type: 'E-commerce a systémy prepojené s ERP',
        summary:
          'Moderný e-commerce backend s dynamickými cenami, viacjazyčným obsahom, integráciami dopravy a internou administráciou.',
        highlights: [
          'Integrovala som logistiku, dopravu a platobné API bez odstávky',
          'Implementovala som internú administráciu na správu objednávok a produktov',
        ],
        linkLabel: 'Pozrieť web',
      },
      {
        type: 'Klientske dodávky · na voľnej nohe',
        role: 'Full Stack Lead Developer',
        period: 'jan 2022 — súčasnosť',
        summary:
          'Vediem dodávky v Laraveli a Reacte pre hybridné klientske projekty a vyvažujem architektonické rozhodnutia s vlastnou implementáciou cez celý stack.',
        highlights: [],
        linkLabel: '',
      },
      {
        type: 'Softvér na zákazku a interné nástroje',
        role: 'Full Stack Developer',
        period: 'júl 2020 — júl 2023',
        previous: 'Frontend Web Developer · 2019 — 2020',
        summary:
          'Funkcie a interné nástroje pre medzinárodné klientske projekty, od rezervačných systémov po business dashboardy. Mala som na starosti CI/CD a testovanie a releasy som prezentovala priamo klientom.',
        highlights: [
          'Dodala som backendové a full-stack funkcie naprieč viacerými produktmi',
          'Spolupracovala som s dizajnérmi a PM na čistých, produkčne pripravených riešeniach',
          'Backendy v Laraveli a Node s frontendmi v Reacte a Strapi',
        ],
        linkLabel: 'Pozrieť agentúru',
      },
      {
        type: 'Frontendové aplikácie',
        role: 'Frontend Developer',
        period: 'júl 2023 — jan 2024',
        summary:
          'Dodávala som moderné frontendové aplikácie vo Vue.js, HTML, CSS a GraphQL, remote a v úzkej spolupráci s produktom a QA.',
        highlights: [],
        linkLabel: '',
      },
    ],
  },

  contact: {
    index: 'kontakt',
    title:
      'Hľadáte vývojárku s produktovým myslením alebo tech leada na čiastočnú kapacitu?',
    note: 'Napíšte pár riadkov a dáme reč.',
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
    layers: {
      client:
        'Vykresľovacia vrstva. Stav komponentov, routing a formuláre, s aktualizáciami z API v reálnom čase.',
      api: 'Hranica requestu. Tu žije validácia, autorizácia a business pravidlá; čokoľvek pomalšie než request sa odovzdáva do fronty.',
      queue:
        'Oddeľuje request od pomalej práce. Publikovanie je lacné, takže API zostáva pod záťažou responzívne.',
      workers:
        'Consumeri, ktorí robia náročnú prácu — spracovanie zápasov, importy, naplánované joby — a čítajú aj zapisujú do dátovej vrstvy.',
      database:
        'Zdroj pravdy, do ktorého zapisuje API aj workeri. Návrh schémy, migrácie a query plány tu hrajú väčšiu rolu než kdekoľvek inde v stacku.',
      cache:
        'Časté čítanie a krátkodobý stav. API číta cez cache, workeri ju obnovia, keď je hotová skutočná práca.',
    },
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
