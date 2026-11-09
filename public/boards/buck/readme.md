# TPS54302 buck module

A compact buck converter for an 11-17 V battery supply. The same PCB supports 5 V or 3.3 V with the component values below. Normal load target: 1 A.

20.32 x 30.48 mm, two layers. Input and output are on opposite short edges. Screw terminals face up; breadboard headers face down.

| Connection, viewed from the top | Positive | Ground |
|---|---|---|
| Input corner pins | J3 | J4 |
| Input screw terminal J1 | Pin 2 | Pin 1 |
| Output corner pins | J5 | J6 |
| Output screw terminal J2 | Pin 1 | Pin 2 |

Both ends are positive-left / ground-right. J7: jumper 1-2 = ON, 2-3 = OFF; no jumper = OFF.

| Component | 5 V | 3.3 V |
|---|---|---|
| U1 | TPS54302DDCR | Same |
| L1 | 10 uH | 6.8 uH |
| R1 / R2 | 100 kohm / 13.3 kohm, 1% | 100 kohm / 22.1 kohm, 1% |
| C1 | 10 uF, 50 V X7R, 1210 | Same |
| C2, C3 | 100 nF, 50 V X7R, 0805 | Same |
| C4, C5 | 22 uF each, 25 V X7R, 1210 | Same |
| C6 | 75 pF C0G, 0805 | 47 pF C0G, 0805 |
| R3 / R4 | 511 kohm / 105 kohm, 1% | Same |

Open the `.kicad_pro` in KiCad 10. The two XLSX files are the BOMs for each output voltage.

2026-11-04: Board corners rounded to R1.0 mm; tracks/pads and schematic unchanged. Fresh refill, DRC/ERC errors, opens, parity and netlist node changes all zero. Standalone Gerbers refreshed.
