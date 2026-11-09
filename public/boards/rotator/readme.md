# Custom SatNOGS Rotator Controller PCB

A custom hardware implementation of a **SatNOGS-style dual-axis rotator controller**, designed to control Azimuth (AZ) and Elevation (EL) stepper motors and interface with a SatNOGS/Raspberry Pi system over RS-485.


## Overview

The controller is built around an **Arduino Nano (ATmega328P)** and provides:

- Dual-axis stepper motor control
- RS-485 communication with a Raspberry Pi / SatNOGS client
- Magnetic encoder interfaces for Azimuth and Elevation
- I²C multiplexing for two same-address encoder devices
- Azimuth and Elevation endstop inputs
- Controller temperature monitoring
- 48 V DC input
- 48 V → 12 V motor/control power conversion
- 12 V → 5 V logic power conversion

### Schematic
![Schematic](docs/satnogs-rotator-pcb.svg)

### High-level architecture
![High-level architecture](docs/architecture.png)

### PCB Renders

| Front | Back |
|---|---|
| ![PCB front](docs/pcb-front.png) | ![PCB back](docs/pcb-back.png) |

## Main Components

| Function | Component |
|---|---|
| Main controller | Arduino Nano / ATmega328P |
| RS-485 transceiver | SN65HVD485 |
| 48 V → 12 V buck | TPS54360 |
| 12 V → 5 V buck | TPS562200 |
| AZ motor driver | A4988 |
| EL motor driver | A4988 |
| I²C multiplexer | PCA9540B |
| AZ encoder | AS5601 |
| EL encoder | AS5601 |
| Temperature sensor | TC74 |
| Endstops | External mechanical switches |


## References

This project is based on the architecture and concepts of the open-source SatNOGS Rotator Controller.

- [SatNOGS Rotator Controller documentation](https://wiki.satnogs.org/SatNOGS_Rotator_Controller)
- [SatNOGS Rotator Controller hardware repository](https://gitlab.com/librespacefoundation/satnogs/satnogs-rotator-controller)
- [SatNOGS Rotator Controller firmware](https://gitlab.com/librespacefoundation/satnogs/satnogs-rotator-firmware)
- [SatNOGS Rotator Controller encoder hardware](https://gitlab.com/librespacefoundation/satnogs/satnogs-rotator-controller-encoder)
