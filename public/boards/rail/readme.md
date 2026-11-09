# TPS2596xx rail controller

Open `module_TPS2596xx.kicad_pro` in KiCad 10. This is Padam's latest saved revision, checked for publication on 2026-10-30. Publication does not modify the schematic, placements, routing or board outline.

## Current saved board

- Edge outline approximately **49.53 x 20.32 mm**, two layers, **1.6 mm** thickness.
- eFuse U1: TPS2596xx; current monitor U2: INA219; load switch U3: TPS22917.
- Current component values, connector positions and pin mappings are defined by the KiCad files. Older exports and reports describe previous revisions.

## Publication checks

- PCB DRC: **0 errors, 24 warnings**.
- Unrouted connections: **0**; schematic parity issues: **0**.
- Schematic ERC: **0 errors, 1 warning**.
- Latest reports: `verification/user-layout-drc.json` and `verification/user-layout-erc.json`.

PCB warnings cover footprint-library/type mismatches and silkscreen issues. The schematic warning is the existing four-way junction. No BOM or Gerbers were generated. StackView's **3D > Place module** imports the model at its actual size; missing model bodies use placeholder outlines and need physical clearance checks.

## Silkscreen and outline update (2026-11-01)

Removed the stray back-side `+ -` marking. Address jumper references are hidden on silkscreen; A1/A0 column headings and SDA/SCL/3V3/GND labels follow the actual pad nets and read from the connector edge. IN/OUT are larger and bold. The back carries a mirrored, bold knockout `Rail Controller V1` title. Corners have 0.4 mm fillets, retaining the existing envelope and copper clearances.

Copper, pad/component positions, tracks, vias and cached zone fills are byte-identical to the saved design before this edit. Schematic and project files are unchanged. Refill validation used a disposable copy only. Proof and latest checks: `verification/silkscreen-outline.json`. No existing Gerber/Cu files were modified. Reload the PCB from disk without saving the stale open tab.

2026-11-04: Board corners rounded to R1.0 mm; tracks/pads and schematic unchanged. Fresh refill, DRC/ERC errors, opens, parity and netlist node changes all zero. Standalone Gerbers refreshed.
