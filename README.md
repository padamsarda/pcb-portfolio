# Padam Sarda · PCB portfolio

A browser workbench for Padam Sarda’s CubeSat, module, and personal PCB designs.

## Run the portfolio

```sh
npm ci
npm run dev
```

Open the local URL printed by Vite. Use the board index to browse the full archive or copy a board’s hash URL to return to it directly. A production build is available with `npm run build` and can be served from `dist/` over HTTP.

## Explore a board

- **PCB** shows the KiCad copper, silkscreen, fabrication, courtyard, and board outline plots. Drag to pan, scroll to zoom, or use Fit. The scale bar is in millimetres and the percentage is relative to the fitted view.
- **Design notes** use selected wording from the project documentation. Part names and reference designators move the PCB camera to their footprint. Each board also has its source README or available project documentation, with the purpose and build window above the notes.
- **Schematic** provides the exported KiCad sheets with pan, zoom, and a sheet selector.
- **3D** opens the KiCad GLB with orbit, zoom, and top-view controls. KiCad can omit component bodies when the corresponding library models are missing.
- **BOM** groups PCB footprints by value, package, and purchasing metadata, including DNP markers. Selecting a reference opens it in the PCB viewer.

## Board sources

The catalogue uses KiCad designs from the local `3U-EM-PCB`, `Padam_PCBs`, `Comsat`, and `probation` folders. The résumé’s PCB list informed the selection. The OBC uses the latest local board files and the original BeagleBone Black and Celeste STEP models. The BQ24650 PCB comes from a local KiCad backup because the checked-out project and its GitHub repository contain the schematic, STEP and fabrication files.

Build windows show the months of main development activity based on commits and KiCad backups where available. The evidence note on each board explains what supports its build window. Layout studies can lack a closed outline, assembly BOM or 3D model.

## Refresh assets

`tools/boards.json` maps the boards to their source files relative to the parent workspace. It contains the notes and links used by the site. A token such as `[[U3|ATSAMD21G18A]]` turns the label into a footprint link.

Run `tools/export_boards.py` using KiCad 10’s bundled Python, with `kicad-cli` alongside it. Use `--reuse` to refresh the catalogue while keeping existing CAD exports. The checked-in exports in `public/boards/` let the portfolio build on its own.
