# MCU-controlled solar charger — review prototype

This module uses an external EPS MCU through J7. It contains the four-switch power stage, drivers, sensing, input reverse-current blocking, gate-bias supply and latched fault shutdown. No MCU, firmware or battery BMS is included.

**Board: 65 × 52 mm, two copper layers, 1.6 mm FR4, proposed 1 oz copper, all components on top.** This is a review/bench prototype, not a fabrication release or a space-qualified design. Control-loop stability, switching waveforms, fault response and thermal performance have not been measured.

## Files

- `dev_SolarCharger.kicad_pro`: open this project in KiCad 10.
- `dev_SolarCharger.kicad_sch`: root schematic; four child sheets.
- `dev_SolarCharger.kicad_pcb`: editable layout with copper fills.
- `SolarCharger_BOM.xlsx`: grouped BOM, reference-by-reference assembly register and historical component-selection links. Blank prices are not included in the subtotal. Orange rows indicate unavailable supplier listings.
- `exports/schematic.pdf`: all schematic sheets.
- `verification/`: ERC, DRC/parity and independent node-map audit. These reports describe CAD checks, not bench validation.

## Working electrical basis

| Quantity | Working basis |
|---|---|
| PV source | One provisional 7-cell, 8.4 W panel; Vmp 16.5 V |
| Design input sweep | 10–25 V; confirm actual worst-case open-circuit voltage before release |
| Battery/load bus | 4S battery; operating 12–16 V, 16.0 V working CV target |
| Rating check | Precharged 16.8 V battery considered; chemistry/charging limits remain host responsibilities |
| Inductor | 68 µH ±20%, 102 mΩ maximum DCR, 3 A heating rating, 2.7 A saturation rating at 20% inductance drop |
| Switching | 200 kHz starting point; both bridges must receive valid switching/refresh sequences |
| Drivers | Approximately 9.934 V gate bias; 3.3 V host logic |
| Protection | Nominal 2.0 A positive inductor-current latch trip and 17.0 V battery OV latch trip; both depend on host/reference supply and tolerances |

The input/output voltage assumptions above are provisional design inputs, not newly measured panel specifications. The converter cannot produce 2 A of battery charging from one 8.4 W panel at a 16 V bus. At 90% assumed efficiency the power ceiling alone gives about `8.4 × 0.90 / 16 = 0.47 A`, before subtracting load demand. The earlier 90% estimate is a planning assumption, not verified efficiency of this board.

## Power path

```text
PV+ → F1 → ideal-diode MOSFET Q5 → panel shunt R1 → VIN
                                                  │
                                    Q1/Q2 half bridge
                                                  │ SW_A
                                         inductor shunt R2
                                                  │
                                                 L1
                                                  │ SW_B
                                    Q3/Q4 half bridge
                                                  │
                                                VBUS ─── LOAD+
                                                  │
                                          battery shunt R3
                                                  │
                                                 F2
                                                  │
                                                BAT+
PV−, BAT−, LOAD− and host ground share PGND.
```

Battery current is sensed in the battery branch, separately from the load. Converter-output current alone would not tell the MCU how much current enters the battery while a load is connected. The bus follows battery voltage, with wiring/shunt/fuse drops.

Q5/U3 block reverse current toward the panel. They do not disconnect the battery from the load. No low-voltage load disconnect or independent battery-management function is provided.

## External MCU connector J7

2 × 8, 2.54 mm vertical header. Verify orientation against the pin-1 marker and schematic; odd and even rows must not be interchanged.

| Pin | Signal | Meaning |
|---|---|---|
| 1 | +3V3 | Host-supplied regulated logic power |
| 2 | PGND | Logic/power return |
| 3 | PWM_AH | Input-bridge high-side command |
| 4 | PWM_AL | Input-bridge low-side command |
| 5 | PWM_BH | Output-bridge high-side command |
| 6 | PWM_BL | Output-bridge low-side command |
| 7 | RUN | Hold LOW during reset/startup; LOW asynchronously disables/latches off |
| 8 | ARM | Rising edge arms only after supply and fault checks |
| 9 | FAULT | HIGH when shutdown latch is not armed |
| 10 | ADC_VPV | Panel voltage divided by 11 |
| 11 | ADC_IPV | Panel current, approximately 2.5 V/A |
| 12 | ADC_VBAT | Battery-terminal voltage divided by 6 |
| 13 | ADC_IBAT | Battery current, approximately REF1V65 + 0.5 V/A; positive charging |
| 14 | ADC_IL | Inductor current, approximately REF1V65 + 0.4 V/A |
| 15 | REF1V65 | Buffered half of host 3.3 V, telemetry/calibration reference |
| 16 | PGND | Logic/power return |

Approximate conversion equations, after zero/gain calibration:

- `Vpanel = 11 × V(ADC_VPV)`
- `Vbattery = 6 × V(ADC_VBAT)`
- `Ipanel = V(ADC_IPV) / 2.5`
- `Ibattery = [V(ADC_IBAT) − V(REF1V65)] / 0.5`
- `Iinductor = [V(ADC_IL) − V(REF1V65)] / 0.4`

ADC voltages are in volts and resulting currents in amperes. Input amplifier U5 is unidirectional in this configuration. Battery and inductor channels are bidirectional around the midpoint. Sampling and filtering must be coordinated with PWM; a load need not be resistive.

## Startup and control requirements

1. Keep RUN LOW, ARM LOW and all four PWM outputs LOW during host reset. The physical RUN pulldown is not a substitute for correct host pin configuration.
2. This revision requires a connected battery to generate gate bias. It does not cold-start from PV alone with a disconnected battery.
3. Check the 3.3 V supply, midpoint and approximately 10 V gate bias. Use valid low-side charging intervals to establish both bootstrap supplies while preventing unwanted inductor current.
4. Check ADC ranges, battery voltage and current zeros. Pulse ARM only after the comparator outputs are valid; assert RUN appropriately. Any fault clears the latch; restarting requires a deliberate new ARM edge after removing the fault.
5. Generate complementary PWM with non-overlap. Initial 100 ns deadtime is only a bench starting point. UCC27282 interlock does not generate the required deadtime.
6. Both high-side drivers are bootstrap supplied. Do not hold either high-side MOSFET on indefinitely. Firmware must maintain bootstrap refresh in buck, boost, transition and no-load operation.
7. Apply the battery CC/CV limits and panel operating-point limit together. If load plus allowed charging cannot absorb all available PV power, curtail extraction from the panel. Do not force MPPT at the expense of battery CV/current limits.

The hardware current trip uses INA240 output followed by a comparator and latch. Its delay, PWM-edge recovery, tolerance and inductor saturation margin require measurement. It is not a proven cycle-by-cycle or guaranteed hard-short protection circuit. Use a current-limited bench source for first power-up. Branch fuses are secondary protection; their interrupt capability must be checked against the actual source.

## Footprints and assembly

Local symbol and footprint libraries are included. Footprint selection follows the exact ordering/package variant, not the abbreviated supplier title.

| Function/ref | Package/land-pattern basis |
|---|---|
| Power MOSFETs Q1–Q5 | TI CSD18543Q3AT, VSON 3.3 × 3.3 mm NexFET; sources 1–3, gate 4, common drain land 5–8 |
| Half-bridge drivers U1/U2 | TI UCC27282QDRCRQ1, DRC VSON-10, EP 1.65 × 2.4 mm; exposed pad grounded |
| Reverse-current controller U3 | LM74700QDBVTQ1, DBV SOT-23-6 |
| Gate-bias regulator U4 | TPS7A4901DGNR, DGN HVSSOP-8 with exposed pad; do not substitute a negative-output TPS7A30 |
| Current amplifiers U5/U6 | INA186A2QDDFRQ1, thin DDF SOT-8; differs from a generic SOIC-8 |
| Inductor-current amplifier U7 | INA240A1PWR, PW TSSOP-8 |
| Midpoint buffer U8 | OPA333AIDBVR, DBV SOT-23-5 |
| Comparator U9 | TLV3202AIDGKR, DGK VSSOP-8 |
| Fault latch U10 | SN74LVC1G74DCTR, DCT 8-pin package; Q is pin 5 and inverted Q/FAULT is pin 3. Do not substitute RSE/DQE packages |
| Inductor L1 | Bourns SRR1210-680M non-A version; body 12 ±0.5 mm square, 10 mm high, land pattern checked against non-A drawing |
| Input capacitors C1/C2 | H2101M050D120HY, radial Ø8 × 12 mm, 3.5 mm lead pitch, polarized |
| Output capacitor C4 | HBV221M1VTR-1010, SMD Ø10 × 10 mm can and base envelope, polarized |
| Bypass capacitors C3/C5 | CL21A106KBYQNNE, 0805, 10 µF/50 V X5R; actual biased capacitance is less than nominal |
| Shunts R1/R2/R3 | Vishay WSL2512R0500FEA / R0200FEA / R0100FEA, 2512, 1 W |
| Fuses F1/F2 | Littelfuse 0466002.NR, 1206; the similar-looking 0467002.NR is 0603 and is not interchangeable |
| Diodes D1–D3 | BAT54WS, SOD-323; verify cathode markings |
| Other R/C | 0805 HandSolder footprints; populate the specified values, tolerances and voltage ratings from the assembly register |

Generic lab-kit passives are deliberately not assigned invented manufacturer codes. Their stock, voltage rating and effective capacitance must be checked before assembly. Gate-driver bootstrap capacitors are 220 nF/25 V X7R, with at least 100 nF effective capacitance at 10 V bias. The regulator output capacitor must retain at least 2.2 µF under operating bias. The BOM does not certify these unspecified lab-kit items.

Standard KiCad 3D models are assembly aids. The inductor and DGN/DDF ICs use clearly identified, approximate local VRML package envelopes because those vendor models are not installed; their electrical footprints were checked separately. Radial capacitor model height can differ from the selected 12 mm can. Use datasheet dimensions for mechanical clearance.

## Why 25 × 10 mm is not feasible with these parts

The selected inductor alone is nominally 12 × 12 mm, wider than a 10 mm board even before its ±0.5 mm body tolerance. The input bulk cans are two Ø8 mm parts and the output can is Ø10 mm, before allowing for five MOSFETs, drivers, sensing, power routing and headers. A 25 × 10 mm top-assembled board requires changing the component set, not just tighter placement.

65 × 52 mm is the present serviceable prototype outline, not a proven minimum. Shrinking further needs a different packaging/sourcing decision and a new layout/thermal check. No reverse-side components were used to conceal the area requirement.

## Before fabrication / bench review

Resolve unavailable Robu IC listings and the unpriced shunts/fuses/diodes; confirm that substitute packages and pinouts match before buying. Confirm actual panel Voc/temperature limits and battery chemistry/charge limits. Review the latest CAD reports, gate-loop and Kelvin-sense routing, diode polarities and connector orientation. Verify driver startup/refresh, deadtime, switching overshoot, current-sense settling, fault latency, control-loop stability and temperature on a current-limited bench prototype. Snubbers, compensation and gate-resistor tuning must follow those measurements.

No Gerbers or fabrication release is claimed. Nothing is committed.
