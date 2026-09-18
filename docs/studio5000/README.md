# Studio 5000 package — SUB-TRAIN-01

Target basis: **CompactLogix L18ER**, exact catalog and firmware pending nameplate confirmation. The likely catalog is `1769-L18ER-BB1B`; do not create or flash the controller from that assumption alone.

This package turns the uploaded Duke Energy Texas 138/4.16 kV one-line into a controlled training subset:

- incoming 138 kV/high-side availability and main-transformer protection are monitored;
- one normalized 4.16 kV main-breaker model energizes the training bus;
- feeder/motor branches remain monitored HMI objects until their device tags are transcribed;
- four drawing-observed shunt-capacitor branches become independent `CAP1`…`CAP4` instances;
- K1…K4, protection, 86, CT/VT values and every command are simulated or connected only to an isolated low-voltage trainer.

## Files

- [`SUB_TRAIN_01_ROUTINE_SPEC.md`](SUB_TRAIN_01_ROUTINE_SPEC.md) — project creation order, I/O architecture, UDTs, routines, rung acceptance rules and emulator/trainer transition.
- [`SUB_TRAIN_01_TAG_REGISTER.csv`](SUB_TRAIN_01_TAG_REGISTER.csv) — 115 planned physical, internal, HMI, timer, counter and one-shot tags.

The CSV is a **design register, not a Studio 5000 import file**. Module-generated tag paths vary with the confirmed controller catalog, firmware, POINT I/O module and chassis tree. Create the I/O tree first, replace the example `Local:*` paths, then produce an import through the installed Studio 5000 revision if desired.

## L18ER hardware fit

Rockwell's CompactLogix 5370 L1 literature lists 16 embedded DC inputs and 16 embedded DC outputs for the L18ER family. That supports the 15 maintained switches and eight LEDs with spares. The additional 15 momentary controls require a compatible 16-point local POINT I/O input group. Two isolated analog inputs are required for the selected capacitor-bank CT/current simulator and 4.16 kV bus VT simulator; confirm whether the complete L18ER catalog provides the required analog channels or add a compatible module.

Do not select a POINT I/O catalog until trainer voltage, source/sink convention, commons, isolation and current loading are known.

## Required before an ACD is released

1. Original one-line PDF with drawing number/revision.
2. Breaker elementary/control schematics.
3. Full controller catalog and firmware.
4. Exact local POINT I/O input and analog module selections.
5. Relay point list/cause-and-effect—not protection settings invented in PLC.
6. Capacitor-bank manual, discharge requirement, Kirk key-exchange drawing and key schedule.
7. Wonderware/AVEVA and OI communication-driver versions.
8. Approved isolated-trainer wiring drawing.

## Safety boundary

This is teaching logic. The standard PLC does not replace protective relays, a hardwired trip/86 path, trapped-key hardware, grounding, discharge devices, absence-of-voltage testing, LOTO or an approved switching/safe-work procedure. Never connect trainer analog inputs directly to energized CT or VT circuits.
