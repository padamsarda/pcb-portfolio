# Magnetorquer Test PCB

A 2 layer test board for characterizing magnetorquer coils under different operating conditions like voltage, current & temperature.The coils are driven by a DRV8871 motor driver controlled by an STM32F4 mcu. The board integrates current and voltage monitoring while providing I²C and CAN interfaces for connecting external sensors such as magnetometers and temperature sensors. USB type C and SWD interfaces are provided for power, programming and debugging.

### Board at a glance

| | |
|---|---|
| **MCU** | STM32F405RGTx (Cortex-M4, LQFP-64) |
| **Motor Driver** | DRV8871DDA H-Bridge Driver |
| **Current Sensing** | INA219AID |
| **Communication** | CAN (TJA1051T/3) + I²C |
| **Power Input** | USB Type-C and DC Barrel Jack |
| **Programming** | SWD |
| **Designed with** | KiCad 10 |

## Schematic

![Schematic](docs/MT_test_driver.svg)

## PCB

<p align="center">
  <img src="docs/pcb_top.png" alt="PCB Top" width="49.5%" />
  <img src="docs/pcb_bottom.png" alt="PCB Bottom" width="49.5%" />
</p>

## Key Components

| Reference | Part | Function |
|-----------|------|----------|
| U1 | DRV8871DDA | H-Bridge motor driver for magnetorquer coils |
| U2 | AMS1117-3.3 | 3.3 V linear voltage regulator |
| U3 | INA219AID | High-side current and power monitor |
| U4 | STM32F405RGTx | ARM Cortex-M4 microcontroller |
| U5 | USBLC6-2SC6 | USB ESD protection |
| U6 | TJA1051T/3 | CAN transceiver |
| Y1 | 16 MHz Crystal | MCU system clock |
| FB1 | Ferrite Bead | Power supply noise filtering |
| D2 | NUP2105L | CAN bus ESD protection |

## Connectors & I/O

| Reference | Interface | Description |
|-----------|-----------|-------------|
| J1 | SWD | Programming and debugging |
| J2 | DC Barrel Jack | External power input |
| J3 | USB Type-C | USB power input |
| J4 | Temperature Header | External temperature sensor interface |
| J5 | Magnetometer Header | I²C interface for external magnetometers |
| J6 | Battery Header | Battery connection |
| J7 | CAN Header | CAN communication interface |
| MT1 | Screw Terminal | Magnetorquer coil output |


Designed and developed as part of **Team Anant**.
