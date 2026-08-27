// Only translatable strings live here. Locale-invariant data — URLs, tech
// names, file names, diagram geometry — stays in the components.
export default {
  meta: {
    lang: 'en',
    title: 'Alena Martinková — Backend Engineer & Tech Lead',
    description:
      'Alena Martinková — backend-leaning full stack engineer and tech lead. Python, FastAPI, PostgreSQL, Redis, RabbitMQ, React.',
  },

  nav: {
    about: 'about',
    stack: 'stack',
    work: 'work',
    contact: 'contact',
    status: 'Backend Lead @ Rankacy',
    skip: 'Skip to content',
    menu: 'Navigation menu',
    sections: 'Sections',
  },

  hero: {
    eyebrow: 'Full stack · Product-led engineering',
    role: 'Full stack developer focused on backend',
    lead: 'I build scalable platforms and data-driven products. My focus is on designing resilient backend architectures, leading engineering teams, and partnering closely with design & product to deliver fast, measurable, high-quality experiences.',
    ctaContact: 'Contact me!',
    ctaWork: 'See recent work',
  },

  terminal: {
    keys: { status: 'status', location: 'location', email: 'email' },
    status: 'Currently: Backend Lead @ Rankacy',
    location: 'Based in Ostrava · remote-friendly',
    focus: [
      'Architecting distributed Python microservices and data pipelines',
      'Driving platform evolution and real-time features',
      'Working in cross-functional collaboration across product, design and engineering',
    ],
  },

  about: {
    index: 'about',
    title:
      'Backend engineer with a product mindset and focus on clean, reliable systems',
    description:
      'I’m a backend-leaning full-stack developer who builds fast, reliable web platforms. Since 2019 I’ve shipped everything from e-commerce and booking systems to internal tools and real-time data products—currently leading backend at Rankacy, previously at Moravio and GIMMEDATA. I partner closely with design and product so each release is cohesive, measurable, and performant.',
    notes: [
      'My go-to stack is Python (FastAPI), PostgreSQL, Redis, RabbitMQ, React. I care about clean architecture, efficient solutions, observability, and proper testing (PyTest, Cypress).',
      'I enjoy leading teams, mentoring engineers, and keeping delivery calm and predictable. Outside the code, I like getting involved in the creative side—anything that improves the user experience.',
    ],
    caption: 'Currently building at Rankacy',
    stats: [
      'Years shipping digital products',
      'Production services & web apps delivered end-to-end',
      'Cross-functional teams led',
    ],
  },

  skills: {
    index: 'stack',
    title: 'Systems thinking, clean architecture, and practical delivery',
    description:
      'I like taking complex ideas and turning them into clear, scalable systems. My work sits at the intersection of engineering, product clarity, and thoughtful user experience. I care about correctness, maintainability, and making sure teams ship with confidence — not chaos.',
    groups: [
      {
        title: 'Backend & platform engineering',
        description:
          'Designing and scaling backend systems that stay fast, predictable, and understandable as they grow.',
        items: [
          'Python · FastAPI',
          'PostgreSQL · SQLAlchemy',
          'Redis · RabbitMQ',
          'API design',
        ],
      },
      {
        title: 'Web product development',
        description:
          'Building usable, performant products — not just endpoints.',
        items: [
          'React & modern frontend fundamentals',
          'State, routing, forms & real-time UI updates',
          'Smooth collaboration',
          'Accessibility & performance awareness',
        ],
      },
      {
        title: 'Deployment, testing & reliability',
        description:
          'I like systems that don’t break at 2 am. Or worse — during a Friday release.',
        items: [
          'CI/CD pipelines',
          'Dockerized services · Kubernetes',
          'PyTest & integration testing',
          'Metrics & logging best-effort',
        ],
      },
      {
        title: 'AI-assisted delivery',
        description:
          'AI tooling is part of my normal loop rather than a side experiment — used where it genuinely speeds things up, kept out of where it doesn’t.',
        items: [
          'AI-assisted coding & code review day to day',
          'Context and prompting that works on real codebases',
          'Architecture decisions stay with the engineer',
          'Helping the team adopt it without lowering the bar',
        ],
      },
    ],
  },


  work: {
    index: 'work',
    title: 'Partnerships built on trust, delivery, and measurable impact',
    description:
      'I collaborate with founders, agencies, and in-house teams to move from idea to scalable launch—and stick around to iterate.',
    clientsLabel: 'Clients',
    via: 'via',
    previously: 'Previously',
    projects: [
      {
        type: 'E-sports analytics platform',
        role: 'Backend Lead Developer',
        period: 'Mar 2024 — Present',
        previous: 'Full Stack Developer · Jan 2024 — Mar 2024',
        summary:
          'The competitive gaming backend behind CS2 player insights, match processing and subscription revenue. I oversee the software team, guide solution design end to end, and keep daily delivery running — from API architecture to implementation reviews.',
        highlights: [
          'Event-driven FastAPI services processing match data at scale',
          'A PostgreSQL database of millions of match records, tuned for fast reads',
          'Scaled on AWS to serve players worldwide',
          'Subscription system and Stripe billing flows',
        ],
        linkLabel: 'View platform',
      },
      {
        type: 'E-commerce & ERP-connected systems',
        summary:
          'A modern e-commerce backend with dynamic pricing, multilingual content, delivery integrations and internal admin tooling.',
        highlights: [
          'Integrated logistics, shipping, and payment APIs without downtime',
          'Implemented internal administration panel for order & product management',
        ],
        linkLabel: 'Visit site',
      },
      {
        type: 'Client deliveries · Freelance',
        role: 'Full Stack Lead Developer',
        period: 'Jan 2022 — Present',
        summary:
          'Lead Laravel + React deliveries for hybrid client projects, balancing architecture decisions with hands-on implementation across the stack.',
        highlights: [],
        linkLabel: '',
      },
      {
        type: 'External software & internal tools',
        role: 'Full Stack Developer',
        period: 'Jul 2020 — Jul 2023',
        previous: 'Frontend Web Developer · 2019 — 2020',
        summary:
          'Features and internal tools for international client projects, from booking engines to business dashboards. I owned CI/CD and testing, and presented releases directly to clients.',
        highlights: [
          'Delivered backend & full-stack features across multiple products',
          'Collaborated with designers and PMs to ship clean, production-ready solutions',
          'Laravel/Node backends with React/Strapi frontends',
        ],
        linkLabel: 'See agency',
      },
      {
        type: 'Frontend applications',
        role: 'Frontend Developer',
        period: 'Jul 2023 — Jan 2024',
        summary:
          'Delivered modern front-end applications with Vue.js, HTML, CSS, and GraphQL while collaborating remotely across product and QA.',
        highlights: [],
        linkLabel: '',
      },
    ],
  },

  contact: {
    index: 'contact',
    title: 'Need a product-minded engineer or fractional tech lead?',
    note: 'Send a note and let’s meet up.',
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
    layers: {
      client:
        'The rendering layer. Component state, routing and forms, with real-time updates pushed from the API.',
      api: 'The request boundary. Validation, auth and business rules live here; anything slower than a request gets handed to the queue.',
      queue:
        'Decouples the request path from slow work. Publishing is cheap, so the API stays responsive under load.',
      workers:
        'Consumers doing the expensive work — match processing, imports, scheduled jobs — reading from and writing back to the data layer.',
      database:
        'The source of truth, written to by both the API and the workers. Schema design, migrations and query plans matter more here than anywhere else in the stack.',
      cache:
        'Hot reads and ephemeral state. The API reads through it; workers refresh it once the real work is done.',
    },
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
