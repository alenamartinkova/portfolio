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
    journey: 'journey',
    work: 'work',
    contact: 'contact',
    status: 'Backend Lead @ Rankacy',
    skip: 'Skip to content',
    menu: 'Navigation menu',
    sections: 'Sections',
  },

  hero: {
    eyebrow: 'Full stack · Product-led engineering',
    role: 'Engineer & backend tech lead',
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

  journey: {
    index: 'journey',
    title: 'Experience & education milestones',
    description:
      'Every role sharpened a different muscle—architecture, velocity, empathy, or leadership. Together they help me build products that scale gracefully.',
    experienceLabel: 'Roles that shaped my skills',
    educationLabel: 'Academic foundation',
    experience: [
      {
        period: 'Mar 2024 — Present',
        title: 'Backend Lead Developer · Rankacy',
        description:
          'Oversee an e-sports software team, guide solution design end to end, and keep daily delivery running — from API architecture to implementation reviews.',
        tags: ['Python', 'Team leadership', 'E-sports'],
      },
      {
        period: 'Jan 2024 — Mar 2024',
        title: 'Full Stack Developer · Rankacy',
        description:
          'Handled both the backend API and front-end application during the early Rankacy build, providing diagrams, database architecture, and Jira-ready specs.',
        tags: ['Django', 'Python', 'Client comms'],
      },
      {
        period: 'Jul 2023 — Jan 2024',
        title: 'Frontend Developer · GIMMEDATA',
        description:
          'Delivered modern front-end applications with Vue.js, HTML, CSS, and GraphQL while collaborating remotely across product and QA.',
        tags: ['Vue', 'GraphQL', 'Remote'],
      },
      {
        period: 'Jan 2022 — Present',
        title: 'Full Stack Lead Developer · WAPS Technologies (Freelance)',
        description:
          'Lead Laravel + React deliveries for hybrid client projects, balancing architecture decisions with hands-on implementation across the stack.',
        tags: ['PHP', 'React', 'Leadership'],
      },
      {
        period: 'Jul 2020 — Jul 2023',
        title: 'Full Stack Developer · Moravio',
        description:
          'Developed Laravel/Node backends with React/Strapi frontends, owned CI/CD, testing (Cypress + PHP Unit), and presented releases directly to clients.',
        tags: ['Laravel', 'React', 'CI/CD'],
      },
      {
        period: 'Jan 2019 — Present',
        title: 'Full Stack Developer · Self-employed',
        description:
          'Built static and dynamic sites, complex booking portals, and e-shops. Owned planning, client comms, Cypress/PHPUnit testing, and both FE/BE implementation.',
        tags: ['Scrum/Kanban', 'Cypress', 'Client delivery'],
      },
      {
        period: '2019 — 2020',
        title: 'Frontend Web Developer · Moravio',
        description:
          'Built Vue, HTML, CSS, and WordPress projects while supporting helpdesk workstreams, testing, and agile ceremonies.',
        tags: ['Vue', 'WordPress', 'Cypress'],
      },
    ],
    education: [
      {
        period: 'Sep 2021 — Jun 2024',
        title: "Master's Degree · VSB - Technical University of Ostrava",
        description:
          'Master thesis focused on blockchain; implemented a custom blockchain framework in Python.',
        tags: ['Blockchain', 'Python', 'Research'],
      },
      {
        period: '2018 — 2021',
        title: "Bachelor's Degree · VSB - Technical University of Ostrava",
        description:
          'Information Technology program with strong foundation in software engineering fundamentals.',
        tags: ['PHP', 'Databases', 'Software engineering'],
      },
    ],
  },

  work: {
    index: 'work',
    title: 'Partnerships built on trust, delivery, and measurable impact',
    description:
      'I collaborate with founders, agencies, and in-house teams to move from idea to scalable launch—and stick around to iterate.',
    clientsLabel: 'Clients & teams',
    projects: [
      {
        type: 'E-sports analytics platform',
        summary:
          'Build the competitive gaming backend that powers CS2 player insights, match processing, and subscription revenue.',
        highlights: [
          'Event-driven FastAPI services processing match data at scale',
          'Subscription system and Stripe billing flows',
        ],
        linkLabel: 'View platform',
      },
      {
        type: 'External software & internal tools',
        summary:
          'Built features and internal tools for international client projects, ranging from booking engines to business dashboards.',
        highlights: [
          'Delivered backend & full-stack features across multiple products',
          'Collaborated with designers and PMs to ship clean, production-ready solutions',
        ],
        linkLabel: 'See agency',
      },
      {
        type: 'E-commerce & ERP-connected systems',
        summary:
          'Built modern e-commerce backend with dynamic pricing, multilingual content, delivery integrations, and internal admin tooling.',
        highlights: [
          'Integrated logistics, shipping, and payment APIs without downtime',
          'Implemented internal administration panel for order & product management',
        ],
        linkLabel: 'Visit site',
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
