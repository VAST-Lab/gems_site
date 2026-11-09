# gems_site (GemScans)

A web catalog and 3D Gaussian Splatting viewer for interactive inspection and provenance exploration of rare minerals and gemstones.

## Tech Stack
- **Framework:** React 18, Vite 8, React Router 6
- **Styling:** Tailwind CSS v4
- **Backend / Authentication:** Supabase (`@supabase/supabase-js`)
- **3D Visualization:** WebGL / Gaussian Splatting viewer (`viewer.js`), 3D Globe

## Major Features & Capabilities
- **In-Browser 3D Gaussian Splat Viewer:** Interactive real-time inspection of 3D scanned gemstones with orbit controls and splat rendering.
- **Geographic Specimen Provenance:** Interactive 3D globe plotting specimen discovery locations across the world.
- **Elemental Periodic Table Filtering:** Filter specimens by chemical formula and constituent elements via an interactive periodic table modal.
- **Public & Vault Catalogs:** Browse the public mineral gallery or authenticate with Supabase to access high-value private collection vaults.
- **Model Conversion & Ingestion Tools:** Includes model counting and format handling helpers (`count_splats.js`, `Convert.jsx`).

## Development
```bash
npm install
npm run dev
npm run build
```
