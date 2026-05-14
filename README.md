# personal-website

My personal site & portfolio — a place to share projects, writing and research.

Built with **Astro 5**, **TypeScript** (strict), **Tailwind CSS 4** and **MDX**.

## Requirements

- Node `>= 22.12`
- pnpm `>= 10`

## Commands

| Command        | Description                              |
| -------------- | ---------------------------------------- |
| `pnpm dev`     | Start the dev server at `localhost:4321` |
| `pnpm build`   | Build the static site to `./dist/`       |
| `pnpm preview` | Preview the production build locally     |
| `pnpm check`   | Type-check the project (`astro check`)   |
| `pnpm lint`    | Run ESLint                               |
| `pnpm format`  | Format the codebase with Prettier        |

## Project structure

```
src/
  assets/          → optimized images (Astro <Image />)
  components/      → Astro components (layout, hero, about, work, writing, ui)
  content/         → MDX content collections (projects, blog, research)
  layouts/         → page layouts
  lib/             → utilities
  pages/           → routes
  styles/          → tokens.css + globals.css (Tailwind entry)
public/            → static assets served as-is
```

## License

See [LICENSE](./LICENSE).
