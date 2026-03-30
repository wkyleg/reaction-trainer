# Store assets

- **`listing.json`** — marketplace copy and metadata.
- **PNG files** — masters for icons, banners, and previews (sized for store exports).
- **`.webp` files** — compressed derivatives (aspect ratio preserved). Typical names:
  - `preview-desktop-01-{full,1200w,800w}.webp`
  - `preview-mobile-01-{full,800w,480w}.webp`
  - `banner-{full,1200w,800w}.webp`, `expansion-preview-{full,1200w,800w}.webp`
  - `icon-512.webp`

Regenerate WebPs from PNG masters in the workspace `app-store-assets/<this-repo>/` folder:

```bash
cd app-store-assets && npm run process-screenshots
```
