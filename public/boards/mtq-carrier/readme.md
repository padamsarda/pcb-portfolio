**FABRICATION EXPORT (2026-11-04):** gerber_carrier_MTQ.zip generated at Padam's explicit instruction after discussion of the INA226 input-voltage risk. CAD checks pass; that electrical issue remains unresolved. See gerber_carrier_MTQ/FABRICATION_NOTES.txt and verification/fabrication-release.json. This supersedes the earlier export hold below.

**FABRICATION HOLD (2026-11-04):** see verification/final-review.md. All 52 vias normalized to 0.8/0.4 mm; CAD checks pass, but INA226 switching-node input protection is unresolved. Final Gerbers have not been generated.

# Magnetorquer test carrier

Open carrier_MTQ.kicad_pro. The PCB keeps Padam's revised driver/INA arrangement and is now fully connected with 69 track segments, 16 vias and 15 copper zones. Module bodies may overhang; electrical pads stay inside the carrier.

See the current [front copper](copper_front.png), [back copper](copper_back.png), [3D top](placement_3d.png), [3D bottom](copper_bottom_3d.png) and [pour review](verification/pours-review.md). The earlier routing_plan.png and layout_options.png are historical planning studies; the current PCB and pours-review.json supersede placement-review.json.

The user's latest connector locations are retained with small alignment adjustments. Control headers sit beside the corresponding driver pins; the common I2C header remains between the drivers. A and coil-B pours use front copper; each driver-B pour runs on the back and connects through its INA module shunt. Long I2C runs are behind VM; short front bridges remain left of the INA pad row, clear of VM. VM preserves the central spine and branches with 0/45/90-degree outlines. Filled VM area increased from 1627.3 to 1747.2 mm² (+7.4%). Ground pours cover both sides, joined by nine ground stitching vias. Zone clearance is 0.35 mm; thermal gap/spokes are 0.30/0.50 mm. All pad connections are now solid, as requested; soldering requires more heat. Every pin has a front silkscreen label; the bottom carries the board name. See silkscreen_front.png and silkscreen_back.png.

Maximum outline: **77.58 x 86.90 mm**. With rail and buck down the left and CSS across the top, the complete fabrication envelope is **99.90 x 99.90 mm**, with 2 mm routed gaps. Panels/Buck_Rail_CSS_MTQ/maximum_area.kicad_pcb shows the empty allocation; tabs are not designed yet. The earlier combined placement is only a historical proposal.

| Ref | Function |
|---|---|
| U1 | Dual driver: M1 X, M2 Y |
| U2 | Dual driver: M1 Z, M2 spare |
| U3 / U4 / U5 | INA226 X / Y / Z |
| J1 | Bench PSU: VM, GND |
| J2 / J3 / J4 | X / Y / Z coil: pin1 A, pin2 B |
| J5 | Spare coil: pin1 B, pin2 A, matching the user's revised schematic |
| J6 / J7 / J8 / J9 | X / Y / Z / spare control: 2-pin 2.54 mm, IN1, IN2 (MCU already shares GND) |
| J10 | External controller: 3V3, GND, SDA, SCL |
| J14 | Independent alerts: ALERT_X_n, ALERT_Y_n, ALERT_Z_n |
| J15 / J16 / J17 | X / Y / Z coil-voltage probe headers, 1x02 at 2.54 mm pitch: pin1 A, pin2 B; parallel with the corresponding coil terminals |

## Sensor addresses

| INA | Address (7 bit) | A1 | A0 |
|---|---|---|---|
| X | 0x41 | GND | 3V3 |
| Y | 0x44 | 3V3 | GND |
| Z | 0x45 | 3V3 | 3V3 |

These avoid each other and default rail INA219 0x40 / CSS ADS1115 0x48. Set addresses using the purchased modules' own solder pads with power off: X A0-to-VCC, Y A1-to-VCC, Z both A0/A1-to-VCC. Unbridged address pins must default to GND on those modules; confirm with an I2C scan. The carrier has no address jumpers or flywire pads.

## Connections and limits

Each X/Y/Z driver OUTA connects directly to coil A. Coil B connects to INA IN+, through the on-module shunt to IN-, then back to driver OUTB. Current flowing A-to-B through the coil reads positive. The spare channel remains direct to its terminal. J11-J13 current breakout connectors are removed. J15/J16/J17 measure the actual coil A/B terminals on the coil side of the B-lead shunts. No external shunt resistor or wiring is required. PWM/flyback input compatibility remains UNVALIDATED; series wiring is not a claim of safe operation with arbitrary PWM conditions. Check the INA226 input limits and module shunt current range before operating. All three VBUS inputs connect to VM, the PSU positive terminal, to measure supply voltage. Keep VM at 0-36 V for these sensors, even though the driver IC itself permits a higher voltage. INA VCC uses external 3.3V from J10. J10 is the only common host interface: pin1 3V3, pin2 GND, pin3 SDA, pin4 SCL. Provide I2C/ALERT pull-ups at the host or verify those already on the modules.

Latest verification (2026-11-04): ERC 0; DRC 0 errors / 0 warnings; 0 unconnected items; schematic parity 0. All 83 schematic node assignments and PCB pad nets match the pre-edit baseline. The schematic itself and 77.58 x 86.90 mm outline are unchanged. All 19 parts remain on top. Close stale open KiCad windows without saving, reopen the project, and press B to refill after subsequent changes.

All symbols are boxed; footprints have Fab/courtyard boundaries. **The old driver footprint's two mirrored rows have been corrected using the vendor DXF and top-view photo.** The source STEP is retained and its registered copy is linked from 3dmodels/. Module mounting circles are Fab references, not off-board carrier holes.

The driver power-row screw terminals must be removed before fitting matched-height sockets/posts. The STEP preview shows the as-supplied terminals and assumes 8.5 mm clearance below the driver PCB; the exact mating hardware still needs a real-part check. Solder carrier joints from the underside before inserting modules. INA header order is photo-verified, but **exact purchased-module edge offsets remain provisional**. See verification/module-review.md for mapping, sources, solderability and remaining electrical limits.

Sources: TI INA226 https://www.ti.com/lit/ds/symlink/ina226.pdf ; TI DRV8871 https://www.ti.com/lit/ds/symlink/drv8871.pdf ; 7Semi Vikram-453R6D and FlyRobo INA226 product pages. Nothing is committed.



Silkscreen updated: functional labels replace visible J/U references. X/Y/Z COIL and PROBE, INPUT SUPPLY with VM+/GND-, I2C/3V3, ALERT X/Y/Z, SPARE COIL and SPARE controls. X1/X2, Y1/Y2, Z1/Z2 and SP1/SP2 correspond to each channel's IN1/IN2. Copper, pads, fills and schematic nodes unchanged. See silkscreen_front.png.

2026-11-04 refresh: Padam's saved MTQ zone-outline changes retained, zones refilled, standalone and combined fabrication outputs regenerated. Source schematic node changes: 0. MTQ DRC/ERC/unconnected/parity: 0. Combined panel: 18 previously documented mechanical overhang conflicts, no copper errors or opens.

2026-11-04: Board corners rounded to R1.0 mm; tracks/pads and schematic unchanged. Fresh refill, DRC/ERC errors, opens, parity and netlist node changes all zero. Standalone Gerbers refreshed.
