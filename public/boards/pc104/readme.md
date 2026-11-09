AnantSAT-II PC/104 backplane

Board: 95.89 x 90.17 mm, R5.08 corners, 104 pads at 2.54 mm pitch.
H1 (pins 53-104) carries power; H2 (pins 1-52) carries signals.

Files: PC104-Board.kicad_pro, PC104.pretty and PC104_H1_H2.kicad_sym.
Open the project in KiCad 10.

The four mounting holes are deliberately asymmetric. Keep their positions:
(0, 0), (85.73, 3.81), (85.73, -76.2), (0, -73.66) mm.

AGND, DGND, PGND and chassis join only at the EPS ground tie point.
Other boards must keep these ground domains separate.
