# ethan-y-cheung.github.io

Personal portfolio. The home page is a 3D book you page through (react-three-fiber);
`/projects` is a flat catalog of the same content for anyone who would rather read
than turn pages, with one case study per project at `/projects/[slug]`.

## Running it

```bash
npm install
npm run dev     # http://localhost:3000
npm run build
npm run lint
```

## Layout

| Path | What lives there |
| --- | --- |
| `src/lib/projects.ts` | Project catalog. Single source of truth: `/projects`, the case studies, and the book's Projects spread all read from it. |
| `src/lib/spreads.ts` | Page-by-page content of the book, including which projects get featured. |
| `src/lib/socials.ts`, `src/lib/skill-icons.ts` | Contact links and the stack-chip icon set. |
| `src/components/Book3D/` | The book: scene, page turns, scroll sequencing, project overlay. |
| `src/components/catalog/` | Shell, theme toggle, and background for the flat `/projects` wing. |
| `public/projects/` | Screenshots and posters referenced from `projects.ts`. |

Adding a project means appending an entry to `src/lib/projects.ts`. Order in that
array is the catalog order everywhere, and `id` is the URL slug.

Deployed on Vercel.
