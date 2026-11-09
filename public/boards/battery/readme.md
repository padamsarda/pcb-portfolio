# Battery board

4S2P battery interface using BQ76952PFBR with direct stack I2C_A. Open
`main_battery/main_battery.kicad_pro`. Fabrication files are in
`main_battery/gerber_battery/` and `main_battery/gerber_battery.zip`.

| Connection | Function |
|---|---|
| J4 / J8 | Pack B+ / B- |
| J5 / J6 / J7 | C3+ / C2+ / C1+ |
| J12 | Pack output: 1-4 PACK+, 5-8 PGND |
| J15 / J16 | Alternate PACK+ / GND solder-wire outputs |
| SW1 | Manual pack on/off switch |
| J9 | PC/104 stack interface. Pins 39 and 40 carry BAT_CFETOFF and BAT_DFETOFF for manual charge and discharge cutoff. |
| J10 | Deploy switch |
| J11 | Heater |
| J1 / J2 / J3 | BQ / BQ / EPS thermistors |
| SW2 | BQ wake |

The stack can monitor battery voltage, current and temperature over I2C_A. EPS supplies the I2C pull-ups and must configure the BQ before enabling its FETs.
Cold start requires independent host power or separately validated OTP configuration.
The straight SW1 toggle and vertical output connector need a stack-clearance check.
