// Only translatable strings live here. Locale-invariant data — URLs, tech
// names, file names, diagram geometry — stays in the components.
//
// Copy rule of thumb: every claim lives in exactly one section. The hero
// carries the positioning, About the story, Stack the how, Work the proof,
// Career the dates — so nothing has to repeat.
export default {
  meta: {
    lang: 'en',
    title: 'Alena Martinková — Full Stack Developer · Tech & Team Lead',
    description:
      'Full stack developer focused on backend · tech & team lead. Python, FastAPI, PostgreSQL, Redis, RabbitMQ, React. Leading backend at Rankacy.',
  },

  nav: {
    about: 'about',
    stack: 'stack',
    work: 'work',
    career: 'career',
    contact: 'contact',
    status: 'Backend Lead @ Rankacy',
    skip: 'Skip to content',
    menu: 'Navigation menu',
    sections: 'Sections',
  },

  hero: {
    eyebrow: 'Tech & team lead · Ostrava / remote',
    role: 'Full stack developer focused on backend',
    lead: 'I lead the backend of a CS2 analytics platform at Rankacy, and take on client projects across the whole stack on the side. I’m big on architecture that still makes sense a year later, APIs that survive real traffic, and deadlines that hold.',
    ctaContact: 'Contact me!',
    ctaWork: 'See recent work',
  },

  terminal: {
    keys: { status: 'status', location: 'location', email: 'email' },
    status: 'Currently: Backend Lead @ Rankacy',
    location: 'Based in Ostrava · remote-friendly',
    focus: [
      'Match data pipelines & stats APIs at Rankacy',
      'Event-driven services: FastAPI · RabbitMQ · PostgreSQL',
      'Mentoring, code review & architecture across the team',
    ],
  },

  about: {
    index: 'about',
    title: 'From first diagram to production',
    description:
      'I started in 2019 with agency work — e-shops, booking systems and internal tools for international clients — and grew from frontend through full stack to leading a team. Leading didn’t take the code away from me: I still write a good part of it myself.',
    notes: [
      'My daily stack is Python (FastAPI), PostgreSQL, Redis and RabbitMQ, with React in front. I care about clean architecture, tests that earn their keep (PyTest, Cypress) and observability you can actually debug from.',
      'Leading a team means clear specs, honest code review and mentoring without micromanaging. Outside the code I enjoy the creative side — anything that makes the product feel better to use.',
    ],
    caption: 'Currently building at Rankacy',
    stats: [
      'Years of shipping products',
      'Services & apps delivered end to end',
      'Teams led as tech lead',
    ],
  },

  skills: {
    index: 'stack',
    title: 'The stack I trust, and how I run it',
    description:
      'The diagram is the shape most of my systems take — click around, every node has alternatives.',
    groups: [
      {
        title: 'Backend & platform engineering',
        description:
          'APIs, queues and data models that keep their shape under real load.',
        items: [
          'Python · FastAPI',
          'PostgreSQL · SQLAlchemy',
          'Redis · RabbitMQ',
          'API design & event-driven services',
        ],
      },
      {
        title: 'Product & frontend',
        description:
          'Full stack means the product has to work, not just the endpoints.',
        items: [
          'React · Vue',
          'State, forms & real-time UI',
          'Close collaboration with design & product',
          'Accessibility & performance',
        ],
      },
      {
        title: 'Delivery & reliability',
        description:
          'I like systems that don’t break at 2 am. Or worse — during a Friday release.',
        items: [
          'CI/CD pipelines',
          'Docker · Kubernetes',
          'PyTest · Cypress · integration tests',
          'Metrics & logging',
        ],
      },
      {
        title: 'Leading & AI-assisted work',
        description:
          'The whole team should understand the system — not one person holding it all in their head.',
        items: [
          'Mentoring & code review culture',
          'Specs, estimates & planning',
          'AI in the loop where it genuinely speeds us up',
          'Architecture decisions stay with engineers',
        ],
      },
    ],
  },

  work: {
    index: 'work',
    title: 'Projects I’m glad to put my name on',
    description:
      'A selection from product work and client deliveries. Most of it still runs in production — which is the part I’m proud of.',
    via: 'via',
    moreLabel: 'More client work',
    projects: [
      {
        type: 'E-sports analytics platform',
        summary:
          'Rankacy tells CS2 players what to improve. I run the backend that makes that possible — match ingestion and processing, stats APIs, subscriptions — mine from the first architecture decision to the last implementation review.',
        highlights: [
          'Event-driven FastAPI services — match processing fanned out through RabbitMQ',
          'PostgreSQL with millions of match records, Redis caching the hot reads',
          'Runs on AWS, serving players worldwide',
          'Subscription & billing flows built on Stripe',
        ],
        linkLabel: 'View platform',
      },
      {
        type: 'E-commerce & ERP-connected systems',
        summary:
          'An industrial-supplies e-shop built as a fully custom system — FastAPI backend with a React storefront and admin: dynamic pricing, multilingual catalogue, ERP synchronisation.',
        highlights: [
          'Logistics, shipping and payment API integrations rolled out without downtime',
          'Internal administration for order & product management',
        ],
        linkLabel: 'Visit site',
      },
      {
        type: 'Spa booking platform',
        summary:
          'A Booking-style reservation portal for spa stays, written from scratch in Laravel and React — the public web and the internal administration as one custom system. My last and biggest agency project.',
        highlights: [
          'Custom availability & reservation flow, no ready-made booking engine underneath',
          'Public portal and back-office administration built as one whole',
        ],
        linkLabel: 'Visit portal',
      },
    ],
    more: [
      { summary: 'Investor relations site of the Kofola beverage group' },
      {
        summary:
          'Portfolio of Czech Veolia sites plus a public-procurement system',
      },
      { summary: 'Website and ticketing of the Ostrava philharmonic' },
      { summary: 'E-shops of the outdoor brand across four markets' },
      { summary: 'Multilingual site of the candy maker behind Pedro' },
      { summary: 'Portal for 12 sports centres in Ostrava' },
      { summary: 'Site of one of Central Europe’s biggest book printers' },
      { summary: 'Site of a traditional solid-wood furniture maker' },
      { summary: 'Web of the biggest cooking school in Czechia' },
      { summary: 'Web and mobile app of a health-products seller' },
      { summary: 'Web presentation of a roofing company' },
      { summary: 'Website of a Czech law firm' },
    ],
  },

  career: {
    index: 'career',
    title: 'Career at a glance',
    description:
      'The short version — every stop taught me something different.',
    linkedin: 'Full history on LinkedIn',
    items: [
      {
        period: '2024 — present',
        title: 'Backend Lead Developer · Rankacy',
        description:
          'Joined as a full stack developer, took over backend leadership after two months. Architecture, planning, reviews — and the day-to-day running of the platform team.',
      },
      {
        period: '2023 — 2024',
        title: 'Frontend Developer · GIMMEDATA',
        description:
          'React and GraphQL front-end work on data-driven client products.',
      },
      {
        period: '2022 — present',
        title: 'Full Stack Lead Developer · WAPS Technologies · freelance',
        description:
          'Freelancing since 2019; from 2022 I lead full stack client deliveries for WAPS — architecture decisions plus hands-on implementation.',
      },
      {
        period: '2019 — 2023',
        title: 'Frontend → Full Stack Developer · Moravio',
        description:
          'Started on frontends (Vue, WordPress), grew into full stack Laravel and Next.js work. Owned CI/CD and testing, presented releases directly to international clients.',
      },
      {
        period: '2018 — 2024',
        title: 'BSc & MSc (Ing.) · VŠB-TUO, Ostrava',
        description:
          'Information technology. Master’s thesis: a blockchain framework built from scratch in Python.',
      },
    ],
  },

  contact: {
    index: 'contact',
    title: 'Building a backend or looking for a tech lead?',
    note: 'Drop me a few lines about what you’re planning — a new project, or a team that could use a hand — and let’s talk.',
    ctaEmail: 'Email me',
    ctaLinkedIn: 'Connect on LinkedIn',
    copy: 'Copy',
    copied: 'Email address copied',
  },

  diagram: {
    hint: 'click a node to inspect',
    scenarios: { all: 'all', request: 'http request', job: 'async job' },
    swap: 'swap:',
    usedIn: 'used in:',
    close: 'Close details',
    containers: 'Every service runs in its own container.',
    aria: 'Interactive architecture diagram. Select a flow, or a node to see its alternatives.',
  },

  appearance: {
    trigger: 'Appearance settings',
    accent: 'accent',
    cursor: 'cursor',
    theme: theme => `Switch to ${theme} theme`,
    themeDark: 'dark',
    themeLight: 'light',
    language: 'language',
  },

  footer: { top: 'top' },
}
