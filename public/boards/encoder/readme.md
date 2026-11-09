> **Current connector update (2026-10-29):** J10-J13 are now MR30PB-M plated through-hole footprints (1.80mm holes/3.50mm pitch). Each uses Padam's supplied Amass_MR30PB-M.step at50% opacity. This supersedes the solder-cup/pigtail descriptions below. See documentation/MR30_CONNECTORS.md. The previous wire-cup MR30 stock check does not cover this PCB-pin variant.

# Reaction-wheel carrier — placement review, 2026-10-29

The schematic is rebuilt for four Readytosky MT2204 2300KV CW motors, an external NUCLEO-H753ZI, four DRV8311H stages, four AS5047U encoder daughterboards and CAN_A to PC/104. The carrier has 99 components on the shared 95.89 x 90.17 mm outline; each encoder board is 22 x 22 mm, built four times. **Both PCBs are deliberately unrouted: zero tracks, vias and copper zones. This is a placement review, not a fabrication release.**

## Open these files

- `main_ReactionWheel/main_ReactionWheel.kicad_pro`: five-sheet carrier schematic and placed carrier PCB.
- `module_AS5047U/module_AS5047U.kicad_pro`: separate shaft encoder schematic and placed PCB, four copies required.
- `PIN_MAP.md` / `PIN_MAP.csv`: all 50 host harness pins, Nucleo Morpho pin numbers, other headers and shared PC104 audit.
- `BOM_reactionwheel.csv`: one carrier plus four encoder boards and essential external electrical parts.
- `STOCK_CHECK.md` / `STOCK_CHECK.csv`: 30/30 selected part types found in live Robu or DigiKey inventory, dated 2026-10-29.
- `3dmodels/mount_four_MR30_nominal_fit.step`: supplied mount with conservative connector body envelopes.
- `exports/`: schematic PDFs, placement renders, ERC/DRC reports and verification summary.

Close any already-open reaction-wheel KiCad tabs **without saving**, then open these projects again. Otherwise a stale tab can overwrite the external edits. No Gerbers were generated and nothing was committed or pushed.

## Electrical architecture

```text
PC104 Vsys (context: 12–16.8 V) -> U5 TPS54302 / L1 -> VM_9V (8.94 V nominal)
                                                       |-> U1..U4 DRV8311H -> J10..J13 pigtails -> MR30 -> motors
                                                       |-> C61..C64: 4 x 100 uF bulk
                                                       `-> U7 comparator + Q1 -> external 22 ohm / 10 W brake
PC104 +5V -> NUCLEO-H753ZI E5V -> MOD_3V3 -> encoders, U6 CAN, current-sense references
PC104 CAN_A_H/L <-> U6 TCAN332 <-> H753 FDCAN1
```

Vsys voltage comes from existing local project context; verify the actual stack supply before bench power. All local returns are PGND. Stack AGND and DGND are not joined on this board. Unused stack rails/signals are left for stack pass-through, with no local routing. PC104 labels were taken directly from the shared symbol; CAN_A_H is pad 17 and CAN_A_L pad 19 in the current standard file.

The external Nucleo is connected by J2's 50-wire harness, not mounted above the central aperture. This keeps the wheel connector space free and uses the dev board Padam specified. Configure its E5V power selection using ST UM2407. Do not parallel stack +3.3V with Nucleo 3V3; MOD_3V3 is a separate net. Use onboard ST-LINK normally; J8/J9 expose SWD/UART. Do not attach two active SWD probes simultaneously.

Four timer groups provide twelve independent 3PWM signals; eight ADC3 inputs provide phase A/B current readback; SPI3 has four separate encoder selects. Pins avoid the Nucleo's main Ethernet/USB/LED conflicts identified during the allocation. Timer synchronization, ADC trigger timing, DMA/cache handling, SPI scheduling and closed-loop stability are firmware work. No four-motor firmware or control-rate benchmark is included.

### Driver configuration and power limits

Each DRV8311HRRWR uses hardware 3PWM configuration: MODE=AVDD; INLA/INLB/INLC=AVDD; SLEW=PGND; GAIN through 47k to PGND; CSAREF=MOD_3V3. nSLEEP has a 10k pull-down for reset-off behavior; nFAULT has a 10k pull-up. SOA/SOB reach the MCU ADCs through 33 ohm series resistors. Each driver has its own AVDD decoupling and CP-to-VM capacitor. The 47k selected part is 0.5% tolerance, tighter than the schematic's 1% allowance.

The motor's Robu rating is up to 25 A, 15 V. **This board is for current-limited flywheel duty, not the motor's full drone current.** The buck is limited to 3 A aggregate, not 3 A per wheel. Initial commissioning should limit commanded phase current to 0.5 A per wheel or less and measure loaded spin-up current, temperature and total VM power. DRV8311 peak/OCP figures are not continuous thermal ratings. Check actual flywheel inertia, friction, target speed and torque before accepting this driver stage for the mission duty.

U5's 0.596 V reference and 140k/10k feedback give 8.94 V nominal. Input bank is 28.2 uF nominal; ceramic output bank is 37.6 uF nominal; local motor electrolytics add 400 uF nominal. Capacitance under DC bias, buck ripple, loop stability and simultaneous motor load steps must be checked. The placed components reserve short local decoupling and high-current distribution paths; User.1 corridor drawings are planning guides, not copper.

The non-sinking buck needs a regenerative energy path. U7 TLV3012 and Q1 SI2302CDS switch an **external EP10WSS22RJBB 22 ohm / 10 W resistor** at nominal ON=9.77 V / OFF=9.43 V. At 9.77 V it absorbs about 4.34 W and 0.44 A. Resistor free-air thermal derating and enclosure heating need checking. Firmware must limit simultaneous deceleration to available absorption; this brake is not demonstrated for the unknown flywheel energy. The resistor sits off-board at J7, clear of the plastic mount.

R3 is an optional 120 ohm CAN termination, DNP unless this board is a physical bus end. All external logic is 3.3 V. CAN_A is the only stack data connection.

## Encoder selection and readout

Each shaft gets an **AS5047U-HTSM-TSSOP14**, bought from the active Infineon DigiKey listing. The old discontinued ams listing is not the selected source. Four identical daughterboards are placed for a custom bracket aligned with each inclined motor shaft; the ICs cannot simply sit flat on the carrier under these inclined motors.

- Absolute 14-bit mechanical angle: 360/16384 = **0.02197 degrees per count**. Resolution is not accuracy. The datasheet quotes about +/-0.4 degrees typical and +/-0.8 degrees maximum INL at optimum alignment/25 C; temperature and eccentricity can worsen it. Calibrate the assembled system if the control requirement needs better absolute accuracy.
- Up to 28,000 rpm sensor capability, dynamic angle compensation, and angle availability at standstill/reverse suit a reaction wheel better than relying on sensorless back-EMF at low speed. At 8.94 V, 2300 KV gives about 20,562 rpm ideal no-load; actual loaded speed, voltage and overspeed limits require measurement. Do not operate a magnet or flywheel at that speed without validating its retention.
- Use SPI mode 1, separate CS per wheel, shared clock/MOSI/MISO. Start at a conservative 2 MHz with short harnesses, then qualify timing and noise. The interface supports fast 16-bit angle access and 24/32-bit CRC frames; implement pipelined response handling, parity/CRC/error checks and the manufacturer's recovery sequence for the selected frame format. Do not assume all modes have identical framing.
- Convert counts to angle; unwrap successive samples through 0/360 degrees and divide by elapsed time for speed. Electrical angle requires measured motor pole-pair count and phase/zero-offset calibration. The MT2204 pole-pair count was not assumed from its name.
- In 3.3 V operation, join VDD/VDD3V3, ground TEST, decouple both supply pins as shown, and check field/error diagnostics before enabling a motor. ABI test pads TP1/2/3 are exposed for debugging.

The stocked **Radial Magnets 8995** is a 6.00 x 2.50 mm N35 **diametric** magnet, not an axial disk magnet. Mount it concentrically on the shaft end so the field rotates in the sensor plane. Choose the bracket/air gap so the field at the die is within the sensor's 35–70 mT working window, and verify its diagnostics over a full revolution. The supplied STEP omits the actual motor shaft, flywheel, magnet and holder, so their attachment and air gap are not certified by this layout.

## Mount and MR30 fit

The original mount remains attached in KiCad3D. J10-J13 now use custom direct solder-cup lands and four separate simplified connector models at the central hole, with wheel and phase silk. This supersedes the earlier pigtail layout and old four-envelope combined STEP visualization. **The MR30 direct PCB attachment is a prototype, not a manufacturer-approved footprint.** The drawing confirms3.50mm pitch but leaves cup diameter unquoted; the2.80mm lands require actual part measurement and a fit coupon. See [documentation/MR30_CONNECTORS.md](documentation/MR30_CONNECTORS.md) for sources, exact assumptions and mounting limits. At17.5x17.5mm packing the nominal18mm hole edge margin is only0.25mm.

## Libraries, checks and next review

Added footprint libraries live under each project's `lib/`; standard STEP models and envelope models live under `3dmodels/`. The PC104 table continues to point to the shared `0.Standard` project library. The local model README identifies simplified models. No global user library table is required for the added footprints.

Before routing: approve the actual motor/flywheel current and regenerative-energy budget, motor magnet bracket/air gap, MR30 retention/mating clearance and mount-to-PCB height. These are engineering measurements missing from the supplied geometry, not completed fit claims. Next, route short driver CP/VM/PGND loops, an uninterrupted quiet return for analog/SPI, thermal copper under the exposed pads, high-current VM distribution and CAN pair; then refill and repeat ERC/DRC plus bench checks.

Sources: [DRV8311](https://www.ti.com/lit/ds/symlink/drv8311.pdf), [TPS54302](https://www.ti.com/lit/ds/symlink/tps54302.pdf), [TLV3012](https://www.ti.com/lit/ds/symlink/tlv3012.pdf), [AS5047U](https://www.infineon.com/assets/row/public/documents/30/49/infineon-as5047u-datasheet-en.pdf), [Nucleo UM2407](https://www.st.com/resource/en/user_manual/um2407-stm32h7-nucleo144-board-stmicroelectronics.pdf), [MR30 drawing](https://www.china-amass.com/public/upload/20240723/c1ae9604bbe795ebfd366c9063019e3e.pdf), [MR30 wire type](https://www.china-amass.com/public/upload/20240530/db4152b756868052d42c3b96b5a13c21.pdf), [ESQ catalogue](https://suddendocs.samtec.com/catalog_english/esq_th.pdf). Part availability links and dated counts are in STOCK_CHECK.md.
## Verification snapshot

KiCad 10.0.4, final saved files: carrier 481/481 schematic nodes match PCB pads; encoder 33/33 match, with no extra connected pad nodes. The final cosmetic edits changed zero netlist nodes. Both boards have zero schematic-parity issues, zero backside components and zero tracks/vias/zones. Zone-fill was invoked with zero zones, as intended for this placement-only stage.

| Check | Carrier | Encoder (each) |
|---|---:|---:|
| Components | 99 | 12 |
| ERC errors | 0 | 0 |
| ERC warnings | 37 unused stack labels | 0 |
| Placement DRC errors excluding unrouted opens | 0 | 0 |
| DRC warnings | 1 shared PC104 library mismatch | 0 |
| Unconnected DRC items, intentionally unrouted | 343 | 21 |
| Schematic parity issues | 0 | 0 |

The PC104 warning is retained rather than editing the shared team footprint. All 108 pads, including four mounting holes, have identical positions, sizes, drills and shapes to the shared library; see stack-footprint-audit.json. KiCad's five default ignored DRC categories are listed verbatim in the verification JSON; no claim of all possible categories being enabled is made. The 37 ERC warnings correspond to unused stack labels. Nothing is routed or fabrication-ready.

All referenced local model files exist. The carrier CLI render omits some header/driver bodies despite their saved references; use carrier-placement.svg for the complete XY placement review. This renderer result is not evidence of full assembly mechanical clearance.
`nMount visualization update: combined mount + four MR30 envelopes is attached to carrier J1 as a project-relative 3D model. XY matches the supplied STEP/PC104 outline. Provisional model Z offset is 12.5 mm (mount underside about 10 mm above PCB top); this is a visualization assumption, not a confirmed stand-off dimension.

2026-10-29 connector update: J10-J13 moved to the aperture; custom hand-solder lands and per-connector models replace pigtails. See documentation/MR30_CONNECTORS.md. Old carrier placement images predate this update; use exports/MR30-placement.svg and four-MR30-top.png.
