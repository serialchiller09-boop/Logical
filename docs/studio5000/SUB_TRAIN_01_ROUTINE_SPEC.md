# SUB-TRAIN-01 — Studio 5000 routine specification

## 1. Create the project shell

1. Read the complete controller nameplate. Confirm whether the target is `1769-L18ER-BB1B`, record its firmware, and open a compatible Studio 5000 Logix Designer revision.
2. Create the controller project with no field outputs connected. Set the controller name to `SUB_TRAIN_01` or the site's approved training name.
3. Configure a periodic or continuous task from documented training response and controller-loading requirements. Record the selected task type/rate; this notebook does not supply a production timing value.
4. Create `MainProgram`, then create routines in this order:
   - `R00_Main`
   - `R10_InputMap`
   - `R20_InputConditioning`
   - `R30_ProtectionTrips`
   - `R40_Permissives`
   - `R50_MainBreaker`
   - `R61_CAP1_Kirk`
   - `R62_CAP2_Kirk`
   - `R63_CAP3_Kirk`
   - `R64_CAP4_Kirk`
   - `R70_TransformerFeeders`
   - `R80_CountersAlarms`
   - `R90_OutputMap`
   - `R99_SimulationModel`
5. In `R00_Main`, add one unconditional JSR for every routine in the listed order. Keep equipment logic out of `R00_Main`.
6. Create tags from `SUB_TRAIN_01_TAG_REGISTER.csv`, but replace every example I/O address with the module-generated path from the confirmed I/O tree.
7. Inhibit physical command outputs while building. The current trainer output map contains LEDs only; no substation close/trip coil is part of this scope.

## 2. Build the L18ER I/O tree

### Planned allocation

| Group | Required | Planned location | Important check |
|---|---:|---|---|
| Maintained switches | 15 DI | L18ER embedded 16-point DI | Confirm 24 VDC and sinking/sourcing/common arrangement; reserve one point. |
| Momentary controls | 15 DI | One compatible local 16-point POINT I/O group | Exact module is pending trainer electrical data; reserve one point. |
| Analog potentiometers | 2 AI | Compatible isolated onboard/POINT I/O analog channels | Confirm actual pot/interface signal; a bare pot is not automatically module-compatible. |
| Green/amber LEDs | 8 DO | L18ER embedded 16-point DO | Verify sourcing behavior, per-point current, commons, protection and need for interposing devices. |

Use descriptive alias/raw tags in `R10_InputMap`. No equipment routine reads `Local:*` module tags directly.

### Four-bank compromise imposed by the trainer

There is one CT/current potentiometer but four drawing-observed capacitor banks. `SIM_SelectedCapBank` selects bank 1–4 for one-at-a-time discharge/no-current testing. Only the selected bank may receive `NoCurrentProof` from that potentiometer. Every unselected bank's no-current proof is false.

This selector is a training convenience, not a model of the station's real CT arrangement.

## 3. Data structures

Build explicit rungs first. Convert to UDT/AOI instances only after all four copies pass cross-reference and independence tests.

### Suggested `UDT_Breaker`

| Member | Type | Meaning |
|---|---|---|
| `Raw52a`, `Raw52b` | BOOL | Raw auxiliary input states; `Raw52b` may be training-derived only. |
| `Closed`, `Open`, `Moving`, `BadStatus` | BOOL | Mutually interpreted state; bad/missing quality is neither open nor closed. |
| `QualityGood` | BOOL | Required input/module quality. |
| `ClosePerm`, `CloseReq`, `OpenReq` | BOOL | Decision layers kept separate. |
| `CloseCmd`, `OpenCmd` | BOOL | Bounded internal command requests; no field coil in this trainer scope. |
| `Trip`, `Lockout` | BOOL | Imported trip and training 86 state. |
| `FailToClose`, `FailToOpen` | BOOL | Travel supervision alarms. |
| `BlockCode` | DINT | Priority reason shown by the HMI. |
| `Operations` | DINT | Display copy of the proven operation counter. |

### Suggested `UDT_CapBank`

| Member | Type | Meaning |
|---|---|---|
| `Breaker` | `UDT_Breaker` | Independent breaker state. |
| `KeyAtBreaker` | BOOL | K1…K4 input after quality checking. |
| `AccessSecured` | BOOL | HMI simulator/expansion input; default fail-blocked if quality is unavailable. |
| `ReleaseReq` | BOOL | HMI request captured once and self-cleared on cancel/complete. |
| `NoCurrentProof` | BOOL | Selected-bank analog proof with good quality. |
| `DischargeDone` | BOOL | Copy of this bank's independent timer `.DN`. |
| `ReleasePermitted` | BOOL | Supplemental indication only—never “safe.” |
| `SequenceActive` | BOOL | Blocks closing during key-release sequence. |
| `StateCode`, `BlockCode` | DINT | HMI state/reason enumerations. |

Do not place the actual Kirk hardware authority in a UDT bit. The PLC observes/supplements the mechanical sequence.

## 4. `R10_InputMap`

1. Map 15 maintained inputs M01–M15.
2. Map 15 momentary inputs P01–P15.
3. Map two raw analog values.
4. Map eight LED outputs only in `R90_OutputMap`, not here.
5. Build module-health bits using actual connection/fault information supported by the configured modules.
6. Force `SYS_IOHealthy` false when a required module is inhibited, faulted or stale.
7. Never map a missing/failed input to a healthy/open default.

Acceptance:

- every physical address has one raw tag owner;
- every raw tag has a panel point label;
- cross-reference shows no direct `Local:*` reads outside map/diagnostic routines.

## 5. `R20_InputConditioning`

### Breaker state

For the trainer only:

```text
CBMain_52b_Training := NOT DI_CBMain_52a
CAPn_52b_Training   := NOT DI_CBCapn_52a
```

Guard these expressions with `SYS_TrainerMode`. The HMI must label them **derived**, and a future real-switchgear version must use independent 52a/52b contacts where the design requires them.

State truth table:

| Quality | 52a | 52b | Result |
|---|---:|---:|---|
| Bad | any | any | BAD QUALITY; close blocked |
| Good | 1 | 0 | CLOSED |
| Good | 0 | 1 | OPEN |
| Good | 1 | 1 | BAD STATUS |
| Good | 0 | 0 | MOVING until travel window expires, then BAD STATUS |

### Analog scaling

Keep separate raw, scaled and quality tags. Configure `RAW_MIN`, `RAW_MAX`, valid range and engineering span from measured module calibration.

```text
ScaledPct = (Raw - RAW_MIN) * 100.0 / (RAW_MAX - RAW_MIN)
```

Protect against equal endpoints and bad module quality. Do not quietly clamp a failed-low channel into a valid no-current proof.

Selected-bank proof:

```text
CAP1_NoCurrentProof = (SIM_SelectedCapBank = 1) AND AI_CurrentQualityGood AND CurrentBelowApprovedThreshold
CAP2_NoCurrentProof = (SIM_SelectedCapBank = 2) AND AI_CurrentQualityGood AND CurrentBelowApprovedThreshold
CAP3_NoCurrentProof = (SIM_SelectedCapBank = 3) AND AI_CurrentQualityGood AND CurrentBelowApprovedThreshold
CAP4_NoCurrentProof = (SIM_SelectedCapBank = 4) AND AI_CurrentQualityGood AND CurrentBelowApprovedThreshold
```

The threshold comes from the approved simulator/test design, not this specification.

## 6. `R30_ProtectionTrips`

Create one bit per imported cause before creating `TRIP_Any`. The screenshot shows SEL/CT/protection architecture, but the exact relay functions and tags require the original drawing and point list.

Minimum training causes:

1. `TRIP_MasterPB`
2. `TRIP_Transformer`
3. `TRIP_4KVBus`
4. `TRIP_CAP1`
5. `TRIP_CAP2`
6. `TRIP_CAP3`
7. `TRIP_CAP4`
8. `TRIP_Simulator`

Execute this routine before permissive and command routines.

```text
Each cause XIC ------------------------------- OTL L_86Lockout
TRIP_Any XIC -------------------------------- OTU every pending close request
PB_86Reset XIC -- ONS OSR_86Reset -- P_86Reset XIC -- OTU L_86Lockout
```

### First-out

Give each cause a documented integer code. On the rising edge of a cause, move its code only when `TRIP_FirstOutCode = 0`. Rung order is the explicit priority for simultaneous events. Acknowledge does not erase first-out. A valid 86 reset may clear the code only after all causes are clear.

The PLC first-out is a training/operations aid; protection-relay event reports remain authoritative.

## 7. `R40_Permissives`

### Main breaker

```text
P_CBMain_Close =
    DI_SafetyChainHealthy
AND DI_ControlPowerHealthy
AND DI_RemoteMode
AND DI_SourceAvailable
AND DI_XfmrProtectionHealthy
AND DI_MVRelayHealthy
AND SYS_IOHealthy
AND CBMain_Open
AND NOT CBMain_BadStatus
AND NOT L_86Lockout
AND NOT TRIP_Any
```

Add the approved VT voltage band only after its source is documented. Do not invent it from the screenshot.

### Each capacitor bank n = 1…4

```text
P_CAPn_Close =
    BUS4KV_Energized
AND AI_BusVoltage_QualityGood
AND DI_MVRelayHealthy
AND CAPn_Open
AND NOT CAPn_BadStatus
AND DI_KnAtBreaker
AND CAPn_AccessSecured
AND NOT CAPn_SequenceActive
AND NOT CAPn_RecloseInhibit
AND NOT CAPn_Trip
AND NOT L_86Lockout
```

Create one reason bit per term and an ordered `BlockCode`. Do not show only “NOT PERMISSIVE” on the HMI.

## 8. `R50_MainBreaker`

Use separate event, decision, command and status layers.

```text
(DI_PB_CBMain_Close OR HMI_REQ_CBMain_Close)
  -> dedicated ONS OSR_CBMain_CloseReq
  -> latch REQ_CBMain_Close for evaluation

REQ_CBMain_Close AND P_CBMain_Close
  -> bounded T_CBMain_ClosePulse / internal CMD_CBMain_Close

REQ_CBMain_Close AND NOT P_CBMain_Close
  -> latch close-rejected alarm, capture BlockCode, clear request

Open request OR TRIP_Any
  -> clear close request/command before any open action
```

Do not latch a physical close coil. The LED-only trainer has no breaker coil output; `R99_SimulationModel` changes virtual feedback in simulation mode, while the physical operator moves M07 in trainer mode.

Count `DI_CBMain_52a` false-to-true with `OSR_CBMain_ClosedEdge` and `CTU C_CBMain_Operations`. Do not count button presses.

## 9. `R61`–`R64` capacitor/Kirk routines

Write and test CAP-1 first. Copy it three times only after its states pass. Immediately rename every timer, counter, ONS bit, request and alarm in each copy, then use cross-reference to prove no shared state.

State sequence per bank:

1. **READY/ENERGIZED:** key is trapped at breaker; ordinary electrical close permissives may be evaluated.
2. **OPEN_VERIFY:** release requested, breaker 52a off/52b on, quality good.
3. **DISCHARGE_WAIT:** selected bank has good no-current proof; run only its `T_CAPn_Discharge`.
4. **RELEASE_PERMITTED:** open/no-current/discharge proofs remain true; drive supplemental indication for selected bank.
5. **KEY_AT_BANK/ACCESS:** key-at-breaker false and access simulator state active; close blocked.
6. **RETURN_RESTORE:** access secured and key returned/trapped; clear sequence and recalculate close permissives.

Every lost proof resets the discharge timer and drops `ReleasePermitted`. First scan/power cycle must return to a non-release state unless an approved, tested retained design explicitly requires otherwise.

Use `KEY RELEASE PERMITTED`; never use “safe,” “de-energized” or “safe to touch.”

## 10. `R70_TransformerFeeders`

The uploaded one-line shows the main transformer, feeders/motors and protective-relay architecture. Until exact points are transcribed:

- create read-only HMI placeholders with `DrawingTagPending = TRUE`;
- simulate transformer healthy/alarm/trip independently;
- display feeder/motor branch status without providing close controls;
- preserve one bit per relay trip instead of collapsing them into a generic healthy bit in the final design;
- do not copy protection pickup values into PLC logic.

## 11. `R80_CountersAlarms`

Required stateful elements:

| Element | Instances | Trigger/reset |
|---|---|---|
| Operation CTU | Main + CAP1…CAP4 | Dedicated ONS of proven 52a rising edge; authorized reset only. |
| Trip CTU | One training counter | Dedicated ONS of `TRIP_Any`; HMI alarm journal remains event record. |
| Discharge TON | Four | Independent open/no-current/release sequence; any lost proof resets. |
| Close-pulse TON | Five virtual breakers | Accepted request; `.DN` clears request. |
| Travel TON | Five virtual breakers | Command without expected feedback; state proof resets. |
| Request ONS | Every physical/HMI event | One unique storage BOOL per event; never share across parallel branches. |
| First-out ONS | Per capture policy | Trip transition; code clears only through controlled reset. |

First-scan logic clears transient requests, command pulses and release-permitted indications. Retain counters only after documenting controller power-cycle, download and maintenance requirements.

## 12. `R90_OutputMap`

One writer per physical output:

| LED | Logic |
|---|---|
| Green 1 | `ControlHealthy OR LampTest` |
| Green 2 | `BUS4KV_Energized OR LampTest` |
| Green 3–6 | matching `CAPn_Closed OR LampTest` |
| Amber 1 | `L_86Lockout OR TRIP_Any OR LampTest` |
| Amber 2 | selected `CAPn_ReleasePermitted OR LampTest` |

Lamp test affects only lamp outputs. It must never alter breaker state, trip state, timers, counters, keys or permissives.

## 13. `R99_SimulationModel`

Run only when `SYS_SimMode` is true and `SYS_TrainerMode` is false.

For each virtual breaker:

- accepted close command starts a parameterized travel delay, then sets simulated 52a;
- open/trip clears simulated 52a after its parameterized delay;
- scenario bits can inject fail-to-close, fail-to-open, contradictory status, relay trip and bad quality;
- transition between simulation and trainer modes is allowed only with all requests/commands clear and a reviewed breaker state;
- there is exactly one feedback writer in each mode.

Never let the simulation routine write physical output-module tags.

## 14. Wonderware interface contract

Wonderware may write only:

- `HMI_REQ_*` momentary request tags;
- simulation scenario controls when `SYS_SimMode` is true;
- `SIM_SelectedCapBank` when no key-release sequence is active;
- authorized alarm acknowledge, counter reset and 86 reset requests.

Wonderware must not write raw/conditioned I/O, permissive results, trip causes, 52a/52b status, timers, counters, output tags or `ReleasePermitted`.

Test loss of communication while every command button is held. PLC logic self-clears request tags after accept/reject and no command output may stick.

## 15. Minimum pre-release tests

- [ ] First scan creates no spontaneous close or key-release indication.
- [ ] Every main and capacitor close-permissive term is failed individually.
- [ ] Trip asserted during a close clears commands and latches 86.
- [ ] Both true/both false 52a/52b states become BAD STATUS.
- [ ] Bad analog/module quality blocks no-current proof and key release.
- [ ] Switching `SIM_SelectedCapBank` cannot transfer proof during an active sequence.
- [ ] K1…K4 have unique timers, counters, one-shots and request bits.
- [ ] Each proven close counts exactly once; rejected requests count zero.
- [ ] HMI communication loss cannot leave a request or command stuck.
- [ ] Lamp test changes lamps only.
- [ ] Simulation/trainer mode transfer has one state writer and no output pulse.
- [ ] Forces, temporary bypasses and test rungs are removed before backup.

## Open document-control items

The screenshot is not adequate to release exact station device names. Keep these open until the original PDF/elementaries are available:

- drawing number and revision;
- high-side switch/breaker and CT tags;
- transformer tag, rating and relay point list;
- exact 4.16 kV main/bus/tie arrangement;
- feeder A/B/C and clouded-addition breaker tags;
- motor/load feeder tags and SEL relay models/points;
- capacitor bank 1–4 breaker tags, ratings, CTs and discharge equipment;
- K1–K4 key-exchange drawing and access/disconnect truth table;
- protection cause/effect and hardwired trip ownership.
