# Portfolio

Personal site — [martinkova.dev](https://martinkova.dev)

Built with React 19 + Vite. No CSS framework, no UI kit: plain CSS with design
tokens in `src/styles/tokens.css`.

## Scripts

```bash
npm install     # install dependencies
npm run dev     # dev server on http://localhost:3000
npm run build   # production build into build/
npm run preview # serve the production build locally
```

`npm start` is kept as an alias for `npm run dev`.

## Structure

```
index.html                 page shell, meta + OG tags, fonts
src/main.jsx               entry point
src/App.jsx                page composition
src/App.css                layout + shared components (panels, chips, buttons)
src/styles/tokens.css      colors, radii, type scale, spacing
src/styles/base.css        reset, grid background, focus & scrollbar styles
src/hooks.js               scroll progress, active section, copy-to-clipboard
src/components/            one .jsx + .css per section
public/                    static assets served from /
```

## Images

The full-resolution photo lives in `assets-src/` so it is **not** copied into
the build. `public/images/` holds only the derived files that ship:
`me-{340,430,680,860}.{jpg,webp}` for the About section and `og-image.jpg`
(1200×1200) for link previews.

To regenerate them after replacing `assets-src/me-original.jpg`:

```bash
for w in 340 430 680 860; do
  sips --resampleWidth $w -s format jpeg -s formatOptions 80 \
    --out public/images/me-$w.jpg assets-src/me-original.jpg
  cwebp -q 78 -resize $w 0 assets-src/me-original.jpg -o public/images/me-$w.webp
done
```

The OG image is a square crop offset from the top so the head is not clipped
(`sips -c 3840 3840 --cropOffset 96 0`), then resized to 1200×1200.

## Notes

- The build output goes to `build/` (not Vite's default `dist/`) so the existing
  deployment setup keeps working.
- Content lives in plain arrays at the top of each section component —
  `experience` and `education` in `Education.jsx`, `projects` and `clients` in
  `References.jsx`, `skillGroups` in `Skills.jsx`.
- The architecture diagram in `StackDiagram.jsx` is hand-authored SVG; node
  positions are a simple coordinate grid at the top of the file.
