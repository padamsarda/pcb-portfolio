## Battery PCB

Holds the 1S6P cell pack with on-board protection circuitry.

| Parameter | Value |
|-----------|-------|
| Configuration | 1S6P — Panasonic NCR18650B |
| Capacity | 6 × 3400 mAh = **20,400 mAh (20.4 Ah)** |
| Energy | 20.4 Ah × 3.6 V = **73.4 Wh** |
| Voltage range | 2.5 V (min) — 3.6 V (nominal) — 4.2 V (max) |
| Protection | Over-charge and over-discharge circuit on-board |
| INA219 address | `0x4C` (A1 = SCL, A0 = VCC) — battery current/voltage monitoring |
| Connector | PicoBlade 8-pin (EM) / PicoLock 8-pin (FM) — same footprint |
