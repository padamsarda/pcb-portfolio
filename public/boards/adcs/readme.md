# ADCS

STM32H753ZIT6 controller with the original Adafruit 2472 BNO055 breakout.

Final EM rev 1.0 fabrication package, regenerated 23 October 2026: [Gerbers and drills](gerber_ADCS.zip), [fabrication notes](FABRICATION_NOTES.md), [release checksums](RELEASE.json). Updated renders, schematic PDF, assembly drawing and assembly BOM are in [exports](../exports/).

| Function | Reference | Selected part |
|---|---|---|
| MCU | U2 | STM32H753ZIT6 |
| 25 MHz crystal, 8 pF load | Y1 | ECS-250-8-33B-CTN-TR |
| BNO055 breakout | U3 | Original Adafruit 2472 |
| CAN transceiver | U4 | TCAN332DR |
| USB ESD protection | U5 | USBLC6-2SC6 |
| USB 3.3 V regulator | U6 | TLV1117LV33DCYR |
| USB supply soft-start | U7 | TPS22918DBVR |
| USB presence detector | Q1 | Diodes Incorporated 2N7002-7-F |
| Analog supply ferrite | FB1 | BLM21PG601SN1D |

These part numbers are stored in both schematic and PCB metadata and appear in Stackview's BOM. Y1 uses DigiKey cut tape **50-ECS-250-8-33B-CTN-CT-ND**; crystal selection is complete.

Fit one two-pin shunt on power selector J8. Change the selection with all power off.

| J8 link | Board power | USB use |
|---|---|---|
| 1–2, USB | USB 5 V through the onboard 3.3 V regulator | Standalone board, detached from the stack |
| 2–3, STACK | PC/104 3.3 V | USB data can remain connected |

The USB regulator is TLV1117LV33DCYR U6. TPS22918DBVR U7 ramps the USB supply to the board. The regulator tab is its output, not ground.

Firmware reads PA9 as a GPIO input: low means USB VBUS is present. Use that signal to control USB attachment and detachment, with hardware VBUS sensing disabled. USB power operation must respect the connected source's current allocation and suspend requirements. Measure startup current and regulator temperature with the intended workload during bring-up.

NRST test point TP11 is beside SWD header J6. Local 100 nF bypass capacitor C29 serves MCU U2 VDD pin 30.

Final CAD checks: DRC **0 violations / 41 intentional unused stack connections / 0 schematic parity**. ERC **0 active errors / 33 existing warnings / 1 documented VCAP exclusion**. Purchasing metadata changes preserve routing, placement and netlist nodes. The existing USB symbol/library warning is its deliberate S1 shield-pad naming; the VCAP exclusion documents the required external tie between the MCU regulator outputs.

After assembly, verify 3.3 V/VCAP levels, startup and repeated USB reconnects, regulator temperature at the intended workload, oscillator startup/frequency, CAN termination and shared-I2C ownership/recovery. Validate IMU orientation/calibration in the assembled stack. These bench checks are separate from release of the fabrication files.
