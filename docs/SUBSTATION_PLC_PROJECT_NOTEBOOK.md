# Substation PLC Simulator & Trainer — Project Notebook

**Project ID:** SUB-TRAIN-01  
**Targets:** Studio 5000 or RSLogix 500 · Wonderware / AVEVA InTouch · isolated low-voltage trainer

> **TRAINING MODEL — NOT PROTECTION OR A SWITCHING PROCEDURE**  
> Keep this project software-only or on an isolated low-voltage trainer. A standard PLC must not replace a protective relay, hardwired trip, mechanical Kirk interlock, approved discharge/grounding method, or absence-of-voltage test. Never open an energized CT secondary and never connect the trainer directly to substation CT/VT circuits.

## Project cover sheet

| Field | Project value |
|---|---|
| Project | Substation PLC simulator & trainer |
| Approved one-line / revision | **ADD ACTUAL DRAWING NUMBER AND REVISION** |
| Controller / firmware | ______________________________ |
| Programming target | Studio 5000 / RSLogix 500 (circle active target) |
| Emulator and version | ______________________________ |
| Wonderware / AVEVA version | ______________________________ |
| Trainer voltage, commons and isolation | **VERIFY BEFORE WIRING** |
| Prepared by / date | ______________________________ |
| Reviewer / date | ______________________________ |

## 1. Design basis

The actual station one-line was not included with the repository. The baseline below is an explicit assumption to replace before using anything beyond software emulation.

| Assumed tag | Device | Modeled role |
| --- | --- | --- |
| SRC-101 | Training source | Supplies the incoming side of the model; availability is simulated. |
| CB-101 | Main breaker | Connects the source to BUS-101. Model includes 52a/52b state, close/open requests and trip ownership. |
| BUS-101 | Main bus | Derived energized state; no live medium-voltage equipment is connected to the trainer. |
| T-101 | Power transformer | Feeder load with simulated protection health/trip contacts and alarm indications. |
| CB-201 | Transformer feeder breaker | Connects BUS-101 to T-101 in the training one-line. |
| CB-301 / CAP-1 | Capacitor bank 1 breaker | Switched bank with operation count, anti-repeat logic and K1 transfer-key state. |
| CB-302 / CAP-2 | Capacitor bank 2 breaker | Second switched bank with independent permissives and K2 transfer-key state. |
| 86-L | Master lockout relay model | Latches protective trips and blocks closes until the trip cause is clear and reset is accepted. |

### Control boundary

- **PLC may own:** training requests, permissive display, simulator states, indications, counters, alarms and HMI handshakes.
- **PLC may monitor:** relay trips/health, breaker auxiliary contacts, key position, disconnect/access position and hardwired trip status.
- **PLC does not replace:** protective relay pickup, hardwired 86/trip circuits, trapped-key mechanics, grounding, absence-of-voltage test or safe-work procedure.

## 2. Step-by-step build plan

### 01. Freeze the training design basis

**Outcome:** A signed-off scope with every unknown visible.

- [ ] Attach the actual one-line, elementary diagrams, relay list, breaker control schematics, cap-bank manual and Kirk key exchange drawing.
- [ ] Replace the assumed tags SRC-101, CB-101, CB-201, CB-301, CB-302, T-101 and 86-L with drawing tags.
- [ ] Record controller catalog number, firmware, programming software revision, emulator and Wonderware/AVEVA version.
- [ ] Declare the boundary: software only, isolated low-voltage trainer, or observation of real equipment. Do not mix modes.
- [ ] Write an “out of scope” list: protection settings, synchronization, arc-flash calculations and live switching are not implemented here.

**Evidence to retain:** Design-basis sheet, marked-up one-line, document register and training boundary statement.

### 02. Define devices and safe states

**Outcome:** A state model that cannot confuse command with proof.

- [ ] For every breaker, list 52a, 52b, local/remote, spring/energy charged, trip-circuit healthy, close coil and trip coil points actually available.
- [ ] For every relay, list healthy, alarm and trip contacts independently; identify hardwired trip paths the PLC only monitors.
- [ ] For T-101, list only indications present on the drawings (for example winding temperature, pressure/gas, sudden pressure or lockout) without inventing contacts.
- [ ] For each cap bank, document key trapped/released positions, disconnect/ground switch/access-door sequence and discharge requirement from approved documents.
- [ ] Create OPEN, CLOSED, MOVING, BAD STATUS and BAD QUALITY truth tables. Do not treat missing data as OPEN.

**Evidence to retain:** Device register, state truth tables and protection ownership matrix.

### 03. Build the I/O and tag register

**Outcome:** Every trainer point has one address, owner and normal state.

- [ ] Reserve one 16-point input group for 15 maintained switches and one for 15 momentary switches; mark the spare channel in each group.
- [ ] Configure two analog channels to match the trainer electrical signal. Record raw endpoints from measured calibration, not assumptions.
- [ ] Reserve eight outputs for six green and two amber LEDs; verify output common, source/sink type and per-channel current.
- [ ] Create raw I/O aliases, conditioned tags, command tags, status tags and HMI tags as separate layers.
- [ ] Perform point-to-point continuity checks with PLC power isolated, then a low-voltage I/O checkout.

**Evidence to retain:** Completed I/O table, module configuration printout and signed point-to-point sheet.

### 04. Create the controller project

**Outcome:** A compiling shell that matches the eventual target.

- [ ] Studio 5000: create the controller at the exact emulator/hardware catalog and revision; RSLogix 500: select an emulator-compatible processor.
- [ ] Create MainProgram and routines in the documented 00–99 execution order before writing equipment logic.
- [ ] Create controller-scoped types/tags in Studio 5000. In RSLogix 500, allocate and document B3, T4, C5, N7 and F8 files.
- [ ] Set task/watchdog periods from the selected controller and training response requirements; record them as project parameters.
- [ ] Enable external access only for HMI tags that must be read/written. Keep raw outputs and bypass bits out of the operator interface.

**Evidence to retain:** Version-zero ACD or RSS file, cross-reference report and clean verify/compile.

### 05. Map and condition inputs

**Outcome:** Stable, quality-aware states for logic and HMI.

- [ ] Copy/alias hardware addresses in InputMap; equipment routines never read slot addresses directly.
- [ ] Scale both pots using measured raw minimum/maximum and expose raw, engineering and quality tags.
- [ ] Create training-only 52b complements behind a clearly named mode bit; real deployment requires the actual independent contact where specified.
- [ ] Add bad-state detection for 52a and 52b both true, both false beyond travel, missing module and out-of-range analog.
- [ ] Test each maintained and momentary input online without enabling any command output.

**Evidence to retain:** Live I/O checkout with expected/actual states and analog calibration record.

### 06. Implement trips and transformer supervision

**Outcome:** Trip-first logic with first-out evidence.

- [ ] Bring relay trip contacts into ProtectionTrips without adding pickup settings to the PLC.
- [ ] OR protective causes into TRIP_Any, but retain one bit per cause for first-out and HMI detail.
- [ ] Latch the training 86 model on any trip and unlatch pending close requests in the same early routine.
- [ ] Permit reset only when every trip cause is clear, input quality is good and reset authority is valid.
- [ ] Inject every trip separately and two simultaneously; verify documented first-out priority and that trip always wins.

**Evidence to retain:** Cause-and-effect test sheet and first-out priority record.

### 07. Build breaker control

**Outcome:** Request/permissive/command/status layers with no hidden seal-in.

- [ ] Calculate a named close permissive and individual block-reason bits for each breaker.
- [ ] Use dedicated one-shots to accept each physical/HMI request once; do not share storage bits.
- [ ] Generate bounded close/open pulses where the control schematic requires them; never latch a physical coil indefinitely.
- [ ] In simulation mode only, make a breaker plant model that changes feedback after a parameterized travel delay.
- [ ] Test close allowed, every close rejection, fail to close, fail to open, contradictory feedback and trip during close.

**Evidence to retain:** Permissive matrix, rung printout and breaker FAT cases.

### 08. Build both cap-bank Kirk sequences

**Outcome:** Independent, testable supplemental indications around a real mechanical boundary.

- [ ] Create separate K1 and K2 state tags, release requests, discharge timers, no-current indications and alarms.
- [ ] Require proven open, current below the approved threshold and the approved discharge wait before indicating release permitted.
- [ ] Block close whenever the key is not at the breaker, disconnect/access is open, sequence is active or input quality is bad.
- [ ] Require key return and access/disconnect restoration before the bank can return to READY.
- [ ] Walk every state and failure: timer reset, current returns, key changes early, access opens, relay trips and power cycles.

**Evidence to retain:** Approved key-exchange truth table and independent CAP-1/CAP-2 sequence FAT.

### 09. Add timers, counters, one-shots and alarms

**Outcome:** Each stateful instruction has an owner, reset and power-up behavior.

- [ ] List every TON/RTO, CTU and ONS/OSR instance with purpose, preset source, reset and retentive behavior.
- [ ] Count proven 52a rising edges, not button presses or command bits.
- [ ] Keep operation counts retentive only if controller and maintenance requirements support it; document download behavior.
- [ ] Use first-scan logic to clear transient requests while preserving only the states intentionally designated retentive.
- [ ] Verify no ONS/OSR storage bit, timer or counter is shared between equipment instances.

**Evidence to retain:** Stateful-instruction register and power-cycle/download test results.

### 10. Build Wonderware / AVEVA HMI

**Outcome:** An operator interface that requests, explains and records—but never owns protection.

- [ ] Prove communications and quality using a heartbeat before building controls.
- [ ] Build the one-line and reusable breaker faceplate from PLC status/permissive/reason tags.
- [ ] Write request bits only; make PLC logic self-clear accepted/rejected requests and test a dropped connection mid-press.
- [ ] Build the cap-bank sequence page with an explicit “supplemental indication” warning.
- [ ] Configure alarm acknowledgement separately from trip/86 reset and test bad quality on every screen.

**Evidence to retain:** HMI tag export, screen prints, alarm list and communications-loss FAT.

### 11. Connect the isolated physical trainer

**Outcome:** A documented, current-limited low-voltage interface.

- [ ] Verify trainer voltage, commons, source/sink conventions, channel loading, fusing and isolation against both manuals.
- [ ] Wire with PLC and trainer de-energized; label both ends and keep field wiring separate from network/power conductors.
- [ ] Use isolated signal simulation for current/voltage pots. Never connect the trainer directly to a live CT or VT circuit.
- [ ] Prove every input and LED in an I/O-only test routine before allowing BreakerControl to execute.
- [ ] Set SYS_SimMode false, disable the internal plant model and prove it cannot write over physical feedback.

**Evidence to retain:** Wiring drawing, continuity/megger method as appropriate to trainer, I/O checkout and mode-control test.

### 12. FAT, backup and handoff

**Outcome:** A repeatable project someone else can restore and test.

- [ ] Run normal sequences plus every single permissive failure, protective trip, bad status, bad quality and communications failure.
- [ ] Test first scan, controller restart, HMI restart, emulator restart, download and loss/return of trainer power.
- [ ] Capture controller file, HMI application, tag exports, I/O map, FAT results and software/firmware versions together.
- [ ] Remove forces, temporary bypasses and test code; run cross-reference searches for each force/bypass tag.
- [ ] Have a qualified reviewer approve the training system before any connection beyond the isolated trainer boundary.

**Evidence to retain:** Signed FAT, force/bypass-zero report, restore test and released backup package.

## 3. Physical trainer I/O

**Capacity used:** 15 maintained inputs, 15 momentary inputs, 2 analog inputs, 6 green LED outputs and 2 amber LED outputs. Reserve the sixteenth channel in each digital input group. Addresses below are rack examples only; match the exact selected modules and processor.

### 15 maintained toggles

| Point | PLC tag / symbol | Studio 5000 example | RSLogix 500 example | Trainer label | Normal | Action | Engineering tag | Design note |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| M01 | DI_SafetyChainHealthy | Local:1:I.Data.0 | I:1/0 | Safety chain healthy simulation | ON |  |  | Status input only. A real emergency stop remains hardwired and safety-rated. |
| M02 | DI_ControlPowerHealthy | Local:1:I.Data.1 | I:1/1 | Control power healthy | ON |  |  | Drops every close permissive. |
| M03 | DI_RemoteMode | Local:1:I.Data.2 | I:1/2 | Local / remote selector | OFF |  |  | ON selects HMI/trainer remote control. |
| M04 | DI_SourceAvailable | Local:1:I.Data.3 | I:1/3 | Training source available | ON |  |  | Simulation of source voltage relay status. |
| M05 | DI_XfmrProtectionHealthy | Local:1:I.Data.4 | I:1/4 | Transformer protection healthy | ON |  |  | Composite training contact; real relay contacts remain independent. |
| M06 | DI_FeederRelayHealthy | Local:1:I.Data.5 | I:1/5 | 50/51 relay healthy | ON |  |  | Device-health indication, not a substitute for its trip output. |
| M07 | DI_VoltageRelayHealthy | Local:1:I.Data.6 | I:1/6 | 27/59 relay healthy | ON |  |  | Training healthy contact for under/over-voltage relay. |
| M08 | DI_CB101_52a | Local:1:I.Data.7 | I:1/7 | CB-101 closed indication | OFF |  |  | Trainer uses one toggle. Real gear should bring independent 52a and 52b contacts. |
| M09 | DI_CB201_52a | Local:1:I.Data.8 | I:1/8 | CB-201 closed indication | OFF |  |  | 52b is derived only in training mode. |
| M10 | DI_CB301_52a | Local:1:I.Data.9 | I:1/9 | CB-301 / CAP-1 closed | OFF |  |  | Drives CAP-1 status and operation edge count. |
| M11 | DI_CB302_52a | Local:1:I.Data.10 | I:1/10 | CB-302 / CAP-2 closed | OFF |  |  | Drives CAP-2 status and operation edge count. |
| M12 | DI_K1AtBreaker | Local:1:I.Data.11 | I:1/11 | K1 inserted/trapped at breaker | ON |  |  | Simulation of a key-position switch; the physical key system remains mechanical. |
| M13 | DI_K2AtBreaker | Local:1:I.Data.12 | I:1/12 | K2 inserted/trapped at breaker | ON |  |  | Required for CAP-2 close permissive. |
| M14 | DI_CAP1DisconnectOpen | Local:1:I.Data.13 | I:1/13 | CAP-1 disconnect/access open | OFF |  |  | ON blocks close. Confirm the actual lock sequence and switch truth table. |
| M15 | DI_CAP2DisconnectOpen | Local:1:I.Data.14 | I:1/14 | CAP-2 disconnect/access open | OFF |  |  | ON blocks close. This is indication, not personnel protection. |

### 15 momentary controls

| Point | PLC tag / symbol | Studio 5000 example | RSLogix 500 example | Trainer label | Normal | Action | Engineering tag | Design note |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| P01 | DI_PB_CB101_Close | Local:2:I.Data.0 | I:2/0 | CB-101 CLOSE |  | Request |  |  |
| P02 | DI_PB_CB101_Open | Local:2:I.Data.1 | I:2/1 | CB-101 OPEN |  | Request |  |  |
| P03 | DI_PB_CB201_Close | Local:2:I.Data.2 | I:2/2 | CB-201 CLOSE |  | Request |  |  |
| P04 | DI_PB_CB201_Open | Local:2:I.Data.3 | I:2/3 | CB-201 OPEN |  | Request |  |  |
| P05 | DI_PB_CB301_Close | Local:2:I.Data.4 | I:2/4 | CAP-1 CLOSE |  | Request |  |  |
| P06 | DI_PB_CB301_Open | Local:2:I.Data.5 | I:2/5 | CAP-1 OPEN |  | Request |  |  |
| P07 | DI_PB_CB302_Close | Local:2:I.Data.6 | I:2/6 | CAP-2 CLOSE |  | Request |  |  |
| P08 | DI_PB_CB302_Open | Local:2:I.Data.7 | I:2/7 | CAP-2 OPEN |  | Request |  |  |
| P09 | DI_PB_MasterTrip | Local:2:I.Data.8 | I:2/8 | MASTER TRIP |  | Trip input |  |  |
| P10 | DI_PB_86Reset | Local:2:I.Data.9 | I:2/9 | 86 RESET |  | Reset request |  |  |
| P11 | DI_PB_AlarmAck | Local:2:I.Data.10 | I:2/10 | ALARM ACKNOWLEDGE |  | Acknowledge |  |  |
| P12 | DI_PB_CountReset | Local:2:I.Data.11 | I:2/11 | COUNTER RESET |  | Maintenance request |  |  |
| P13 | DI_PB_K1ReleaseRequest | Local:2:I.Data.12 | I:2/12 | K1 RELEASE REQUEST |  | Sequence request |  |  |
| P14 | DI_PB_K2ReleaseRequest | Local:2:I.Data.13 | I:2/13 | K2 RELEASE REQUEST |  | Sequence request |  |  |
| P15 | DI_PB_LampTest | Local:2:I.Data.14 | I:2/14 | LAMP TEST |  | Test |  |  |

### 2 analog potentiometers

| Point | PLC tag / symbol | Studio 5000 example | RSLogix 500 example | Trainer label | Normal | Action | Engineering tag | Design note |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| AI01 | AI_FeederCurrentRaw | Local:3:I.Ch0Data | I:3.0 | Potentiometer 1 — isolated CT/current simulator |  |  | AI_FeederCurrent_A | Scale raw minimum/maximum to the trainer range. Never connect a trainer analog input directly to an energized CT secondary. |
| AI02 | AI_BusVoltageRaw | Local:3:I.Ch1Data | I:3.1 | Potentiometer 2 — isolated VT/bus-voltage simulator |  |  | AI_BusVoltage_Pct | Use percent-of-nominal in the emulator until the approved VT ratio is known. |

### 6 green LEDs

| Point | PLC tag / symbol | Studio 5000 example | RSLogix 500 example | Trainer label | Normal | Action | Engineering tag | Design note |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| G01 | DO_LED_ControlHealthy | Local:4:O.Data.0 | O:4/0 | CONTROL HEALTHY |  |  |  |  |
| G02 | DO_LED_BusEnergized | Local:4:O.Data.1 | O:4/1 | BUS ENERGIZED |  |  |  |  |
| G03 | DO_LED_CB101Closed | Local:4:O.Data.2 | O:4/2 | CB-101 CLOSED |  |  |  |  |
| G04 | DO_LED_CB201Closed | Local:4:O.Data.3 | O:4/3 | CB-201 CLOSED |  |  |  |  |
| G05 | DO_LED_CAP1Closed | Local:4:O.Data.4 | O:4/4 | CAP-1 CLOSED |  |  |  |  |
| G06 | DO_LED_CAP2Closed | Local:4:O.Data.5 | O:4/5 | CAP-2 CLOSED |  |  |  |  |

### 2 amber LEDs

| Point | PLC tag / symbol | Studio 5000 example | RSLogix 500 example | Trainer label | Normal | Action | Engineering tag | Design note |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| A01 | DO_LED_TripLockout | Local:4:O.Data.6 | O:4/6 | TRIP / 86 LOCKOUT |  |  |  |  |
| A02 | DO_LED_KeyRelease | Local:4:O.Data.7 | O:4/7 | KEY RELEASE PERMITTED |  |  |  |  |

### Internal / HMI tag starter set

| Tag | Type | Owner | Purpose |
| --- | --- | --- | --- |
| SYS_SimMode | BOOL | Configuration | Selects internal breaker plant model. Must be false before trainer outputs are enabled. |
| SYS_FirstScan | BOOL | Controller | First-scan initialization; map to S:FS in Logix 5000 or S:1/15 in many SLC projects after verifying processor behavior. |
| SYS_IOHealthy | BOOL | Diagnostics | Combined module/communications health. A failed input module blocks closes. |
| BUS101_Energized | BOOL | State model | Derived from source available, main breaker state and voltage proof. |
| CB101_52b_Training | BOOL | State model | Training-only complement of 52a. Do not use as an independent proof in real switchgear. |
| P_CB101_Close | BOOL | Permissives | All reviewed conditions required to accept a main-breaker close request. |
| P_CB201_Close | BOOL | Permissives | Main bus energized, transformer protection healthy, breaker open and no lockout. |
| P_CAP1_Close | BOOL | Permissives | Bus/relay healthy, key at breaker, disconnect closed, breaker open, no 86 and no inhibit timer. |
| P_CAP2_Close | BOOL | Permissives | Independent CAP-2 equivalent; never share an ONS storage bit with CAP-1. |
| TRIP_Any | BOOL | Trips | OR of protective-relay trips, transformer trip, master trip and simulation trip requests. |
| TRIP_FirstOutCode | DINT / N7 | Trips | Captures the first active cause; subsequent trips do not overwrite it until a controlled reset. |
| L_86Lockout | BOOL | Trips | Latched lockout model. Reset only when all causes are clear and reset permissive is true. |
| T_CAP1_Discharge | TIMER / T4 | Cap bank | Nameplate/engineering-approved discharge wait preset; page deliberately supplies no preset. |
| T_CAP2_Discharge | TIMER / T4 | Cap bank | Independent timer and independent state for bank 2. |
| C_CB101_Operations | COUNTER / C5 | Maintenance | Counts rising edges of proven closed feedback, not button presses. |
| C_CAP1_Operations | COUNTER / C5 | Maintenance | Counts CAP-1 52a off-to-on transitions. |
| C_CAP2_Operations | COUNTER / C5 | Maintenance | Counts CAP-2 52a off-to-on transitions. |

## 4. Controller structure and ladder patterns

### Recommended routine order

| # | Routine | Responsibility | Review result |
| --- | --- | --- | --- |
| 00 | MainProgram | Calls every routine in a fixed order; contains no equipment logic. | JSR order is visible and reviewed. |
| 10 | InputMap | Copies physical/emulated addresses into descriptive raw tags and validates module health. | One owner for every input alias. |
| 20 | InputConditioning | Debounce where justified, scale pots, create training-only 52b complements and reject impossible states. | Conditioned status tags plus bad-status alarms. |
| 30 | ProtectionTrips | Processes relay contacts, first-out capture and 86 lockout before close logic runs. | Trips always win the scan. |
| 40 | Permissives | Calculates one named permissive and one named reason bit for each close condition. | HMI can explain every blocked close. |
| 50 | BreakerControl | Arbitrates trainer and HMI requests, generates bounded command pulses and proves travel. | Commands are separate from status. |
| 60 | CapBankKirk | Runs both bank state machines, discharge timers and key-release indication. | No PLC bit is presented as a mechanical key guarantee. |
| 70 | Transformer | Combines alarm indications while preserving independent trip causes. | Transformer protection is visible without moving it into the PLC. |
| 80 | CountersAlarms | Counts proven operations, applies one-shots, latches alarms and handles acknowledgement/reset. | Maintenance totals and first-out record. |
| 90 | OutputMap | Maps internal commands and indications to physical outputs; lamp test affects lamps only. | One writer for each physical output. |
| 99 | SimulationModel | When enabled, turns accepted commands into delayed breaker feedback and analog scenarios. | Disabled and isolated in trainer mode. |

### Close permissive matrix

| Device | Close requires | Trip / block | PLC boundary |
| --- | --- | --- | --- |
| CB-101 | Safety chain healthy; control power healthy; remote/local authority valid; source available; protection and I/O healthy; 86 reset; breaker proven open | Master/protective trip, 86 lockout, contradictory 52a/52b, module fault | Control and indication only; protection trip remains hardwired/relay-owned where required. |
| CB-201 | CB-101 closed; BUS-101 voltage proven; transformer protection healthy; feeder relay healthy; 86 reset; breaker open | Transformer/feeder trip, bus dead, 86 lockout, bad status | Accept close request and supervise travel. |
| CB-301 / CAP-1 | Bus energized and voltage in approved band; relay healthy; K1 at breaker; CAP-1 disconnect/access not open; discharge/reclose inhibit complete; breaker open | Key removed, access/disconnect open, relay trip, bus dead, 86, bad status | Supplemental interlock, sequence and indication. Mechanical Kirk system is authoritative. |
| CB-302 / CAP-2 | Same classes of proof as CAP-1 using independent tags, timer, ONS storage and key K2 | Same classes of trip/block using CAP-2 device inputs | Independent sequence; no shared state that can release the wrong key. |
| 86-L reset | All active trip causes clear; breakers in reviewed state; reset request edge; reset authority valid | Any active or untrustworthy trip input | A reset never creates a close command. |

### Illustrative ladder patterns

> Tags are invented. All presets, thresholds, voltage bands and travel times are placeholders that must come from reviewed project documents. Verify instruction behavior for the exact processor and firmware.

#### Main-breaker close acceptance

A request is an event; a permissive is a continuously evaluated condition; an output is a bounded action. Keep all three separate.

```text
XIC(DI_PB_CB101_Close) ONS(OSR_CB101_CloseReq) OTL(REQ_CB101_Close);
XIC(REQ_CB101_Close) XIC(P_CB101_Close) XIO(T_CB101_ClosePulse.DN) OTE(CMD_CB101_Close);
XIC(REQ_CB101_Close) XIC(P_CB101_Close) TON(T_CB101_ClosePulse, PRE_CLOSE_PULSE_PLACEHOLDER);
XIC(T_CB101_ClosePulse.DN) OTU(REQ_CB101_Close);
XIC(REQ_CB101_Close) XIO(P_CB101_Close) OTL(ALM_CB101_CloseRejected) OTU(REQ_CB101_Close);
```

**RSLogix 500 translation:** Use OSR with a dedicated B3 storage bit, T4:x for the pulse timer and B3 bits for REQ/CMD. Verify the chosen processor instruction syntax.

#### Trip-dominant 86 lockout

Trip logic executes before close logic and drops commands in the same scan. Reset is edge-triggered and cannot issue a close.

```text
XIC(TRIP_Any) OTL(L_86Lockout);
XIC(TRIP_Any) OTU(REQ_CB101_Close) OTU(REQ_CB201_Close);
XIC(TRIP_Any) OTU(REQ_CAP1_Close) OTU(REQ_CAP2_Close);
XIC(DI_PB_86Reset) ONS(OSR_86Reset) XIC(P_86Reset) OTU(L_86Lockout);
```

**RSLogix 500 translation:** Use OTL/OTU only when the reset path is explicit and tested. A real 86 device may require physical/manual reset and must not be bypassed in PLC logic.

#### CAP-1 key-release sequence

The PLC may supervise indications; it cannot replace the trapped-key hardware, grounding, discharge resistors, absence-of-voltage test or work procedure.

```text
XIO(CB301_52a) XIC(CB301_52b) XIC(CAP1_NoCurrent) XIC(REQ_K1Release) TON(T_CAP1_Discharge, PRE_FROM_APPROVED_DOCUMENT);
XIO(DI_K1AtBreaker) XIO(T_CAP1_Discharge.DN) OTL(ALM_K1RemovedEarly);
XIC(T_CAP1_Discharge.DN) XIC(DI_K1AtBreaker) XIO(DI_CAP1DisconnectOpen) OTE(IND_K1ReleasePermitted);
XIO(DI_K1AtBreaker) OR XIC(DI_CAP1DisconnectOpen) OTE(BLK_CAP1_KeyAccess);
```

**RSLogix 500 translation:** Use an independent T4 timer and B3 bits for each bank. Do not copy bank 1 storage addresses into bank 2.

#### Count proven breaker operations once

A button press can be rejected and a close coil can fail. Count the state transition that proves the mechanism moved.

```text
XIC(CB101_52a) ONS(OSR_CB101_ClosedEdge) CTU(C_CB101_Operations);
XIC(CAP1_52a) ONS(OSR_CAP1_ClosedEdge) CTU(C_CAP1_Operations);
XIC(CAP2_52a) ONS(OSR_CAP2_ClosedEdge) CTU(C_CAP2_Operations);
XIC(MaintResetAuthorized) XIC(DI_PB_CountReset) ONS(OSR_CountReset) RES(C_CB101_Operations);
```

**RSLogix 500 translation:** Use separate OSR storage bits and C5 counters. Save totals externally before download/reset if maintenance depends on them.

#### Analog input scaling and quality

Separate raw counts, engineering value and quality. A bad channel must not quietly become a valid zero.

```text
CPT(AI_FeederCurrent_Pct, (AI_FeederCurrentRaw - RAW_MIN) * 100.0 / (RAW_MAX - RAW_MIN));
LIM(RAW_VALID_LOW, AI_FeederCurrentRaw, RAW_VALID_HIGH) OTE(AI_FeederCurrent_QualityGood);
XIC(AI_FeederCurrent_QualityGood) LES(AI_FeederCurrent_Pct, CAP_NO_CURRENT_THRESHOLD_APPROVED) OTE(CAP_NoCurrentIndication);
```

**RSLogix 500 translation:** Use SCP where supported or compute with F8 values and explicit divide-by-zero protection. Raw limits and thresholds come from module configuration and approved design data.

### Timers, counters and one-shots

| Element | Example instance | Trigger | Use | Reset | Design check |
| --- | --- | --- | --- | --- | --- |
| TON — breaker travel | T_CBxxx_CloseTravel | Accepted close command | Raises fail-to-close if 52a is not proven before the reviewed travel window | 52a proves or request clears | Preset comes from breaker/control-circuit data, not this notebook. |
| TON — cap discharge | T_CAPx_Discharge | Breaker proven open AND no-current proof true AND key-release request latched | Enables supplemental KEY RELEASE PERMITTED indication | Any proof drops, breaker closes or sequence resets | Use the capacitor-bank manufacturer/nameplate and approved procedure. |
| TON — status debounce | T_x_StatusStable | Raw auxiliary state changes | Accepts a stable trainer switch state where contact bounce is observed | Raw state reverses | Do not mask real disagreement or protection transitions with a long filter. |
| CTU — operations | C_CBxxx_Operations | ONS of proven 52a rising edge | Maintenance indication only | Authorized maintenance reset with audit note | Do not count close requests; count completed mechanical operations. |
| CTU — trips | C_ProtectiveTrips | ONS of TRIP_Any | Training/maintenance history | Authorized reset | The alarm journal remains the event record. |
| ONS / OSR — request | OSR_x_Request | Momentary trainer or HMI request goes false-to-true | Creates one accepted request per press | Instruction storage resets when rung-in goes false | Every event gets its own storage bit; never reuse one across branches. |
| ONS / OSR — first-out | OSR_TripCapture | Combined trip goes false-to-true | Captures a code only if no first-out is already stored | Trip clear plus authorized 86 reset | For simultaneous events, explicit rung order establishes priority and must be documented. |

### Platform crosswalk

| Concept | Studio 5000 | RSLogix 500 | Wonderware / AVEVA |
| --- | --- | --- | --- |
| Boolean storage | Named BOOL tag | B3:x/y with symbol and description | Discrete I/O or memory tag linked to PLC tag/address |
| Integer / code | DINT named tag | N7:x | Integer tag |
| Analog engineering value | REAL named tag | F8:x | Real tag with units/range |
| Timer | TIMER tag; TON/RTO/RES | T4:x; TON/RTO/RES | Read .ACC/.DN for diagnostics; do not implement the permissive timer in HMI |
| Counter | COUNTER tag; CTU/RES | C5:x; CTU/RES | Read .ACC; reset through an authorized PLC request |
| Rising edge | ONS with unique BOOL storage | OSR with unique B3 storage (processor dependent) | HMI writes request; PLC owns edge detection |
| Structured equipment | UDT/AOI after base logic is tested | Repeated documented file ranges/subroutines | Reusable symbol/faceplate with instance tag references |
| First scan | S:FS | Processor status first-scan bit; verify processor manual | Not an HMI function |

## 5. Kirk key system for the capacitor banks

**Use the words KEY RELEASE PERMITTED, never “safe,” “de-energized,” or “safe to touch.”** A CT low-current indication is not an absence-of-voltage test. K1 and K2 require independent tags, timers, one-shot storage, counters and state.

| State | Breaker proof | CT/current indication | Key location | Release indication | Close result |
| --- | --- | --- | --- | --- | --- |
| ENERGIZED / READY | Closed or available to close | May be present | Trapped at breaker | Blocked | Allowed only with all electrical permissives |
| OPEN — VERIFY | 52a off and independent 52b on | Must fall below approved proof threshold | Still trapped | Blocked | Blocked while release request is active |
| DISCHARGE WAIT | Proven open | No-current indication maintained | Still trapped | Blocked until approved timer is done | Blocked |
| RELEASE PERMITTED | Proven open | No-current and wait complete | May be mechanically released | Amber indication only | Blocked by sequence latch |
| KEY AT BANK / ACCESS | Open and locked | Absence of voltage established by approved work practice, not PLC | Trapped in bank/access lock | Not applicable | Blocked because key-at-breaker is false or access is open |
| RETURN / RESTORE | Open | Safe state confirmed | Returned and trapped at breaker; access secured | Reset after request clears | Eligible after all permissives are recalculated |

### Sequence

1. **Open:** open the selected bank breaker; trip/open always overrides close.
2. **Prove:** require independent 52a/52b agreement, good quality and no-current indication.
3. **Wait:** run that bank's discharge timer using the approved manufacturer/engineering preset.
4. **Release:** indicate release permitted; the mechanical lock controls actual key removal.
5. **Access:** key-at-breaker drops and/or disconnect/access opens, immediately blocking electrical close.
6. **Return:** secure access, restore the disconnect as designed, return/trap the key, cancel the request and recalculate every permissive.

### Kirk-system failure checks

- [ ] No-current input failed low does not become a personnel-safety proof.
- [ ] A breaker auxiliary contact is not treated as proof of isolation.
- [ ] Timer completion is not treated as proof of capacitor discharge.
- [ ] An HMI animation is not treated as proof of key location.
- [ ] K1 state cannot release or block K2 accidentally.
- [ ] Loss of any proof resets the selected bank's timer.
- [ ] A power cycle cannot skip into RELEASE PERMITTED.
- [ ] Key/access change blocks close immediately.

## 6. Wonderware / AVEVA HMI

### Screen register

| Screen | Includes | Operator action | Acceptance |
| --- | --- | --- | --- |
| 01 — One-line overview | Source, four breakers, bus, transformer, both cap banks, 86 and analog meters | Open faceplates; no direct output writes | Every color has a text/state label; bad quality is gray/hatched, not “open”. |
| 02 — Breaker faceplate | 52a/52b, close/open request, permissive summary, command pulse, fail-to-open/close, local/remote | Two-step select then execute for training | Close rejected reason is visible and requests self-clear in PLC. |
| 03 — Cap bank / Kirk sequence | Key location, breaker proof, CT no-current indication, discharge timer state, disconnect/access indication | Request release or cancel; follow mechanical procedure | Banner says PLC indication is supplemental and never “safe to touch”. |
| 04 — Alarms & first-out | Active, unacknowledged, first-out code, timestamp from HMI historian, 86 state | Acknowledge; reset only from dedicated control | Acknowledge does not clear the trip or 86. |
| 05 — Operations & maintenance | Breaker operation counters, trip counter, failed-travel count, last reset note | Authorized counter reset | Counter reset is audited or manually logged. |
| 06 — Simulator / trainer | Mode, virtual relay trips, analog scenario values, trainer I/O quality | Inject only while simulation is enabled | Simulation watermark is unmistakable; physical-output enable is separately controlled. |
| 07 — Diagnostics | Raw/conditioned I/O, module quality, controller/HMI heartbeat and bad-state alarms | Read-only | No force control is exposed as an ordinary operator button. |

### HMI build order

1. Install/configure the AVEVA communication server or OI driver that matches the selected Allen-Bradley controller. Record driver version, controller firmware and route in the notebook.
2. Create one access name/topic for this training PLC. Prove read-only communications with SYS_Heartbeat before adding commands.
3. Import or create HMI tags from the PLC external-access tag list. Use descriptive PLC tags in Studio 5000; for RSLogix 500, map B3/N7/F8 addresses to symbols and comments.
4. Build a reusable breaker faceplate with status, quality, permissives, block reasons, close/open request tags and operation count. The faceplate writes request bits only.
5. Make command scripts momentary and design PLC requests to self-clear after accept/reject. Test loss of communications while the button is pressed.
6. Build the one-line with state plus quality. Do not rely on red/green alone: show OPEN, CLOSED, MOVING, BAD STATUS and BAD QUALITY text.
7. Build the Kirk sequence display from proofs and state; label release as “PERMITTED” rather than “SAFE”. Do not put an HMI-only bypass around key/access inputs.
8. Configure alarm priorities, acknowledgement, first-out text and history. Protection operation and control-system fault must be distinct alarm classes.
9. Restrict simulator controls, counter reset and 86 reset by role. Record credentials/configuration according to the site procedure; never hard-code them in PLC comments.
10. Run the HMI acceptance tests: stale data, PLC stopped, driver disconnected, bad analog quality, stuck request, simultaneous trips and browser/client restart.

## 7. Factory acceptance tests

| ID | Test | Method | Expected result |
| --- | --- | --- | --- |
| FAT-01 | Power-up / first scan | Restart controller in each mode | No spontaneous close; transient requests clear; intentional retentive data behaves as documented. |
| FAT-02 | Main close success | Make all CB-101 permissives, pulse close and prove status | One request, bounded command, one operation count, CLOSED indication. |
| FAT-03 | Each close block | Drop one permissive at a time | No output; exact block reason; rejected request self-clears. |
| FAT-04 | Trip during close | Assert master/protective trip during command | Command drops, 86 latches, trip is first-out, closes remain blocked. |
| FAT-05 | Aux contact disagreement | Simulate impossible 52a/52b combinations | BAD STATUS; neither OPEN nor CLOSED claimed; close blocked. |
| FAT-06 | CAP discharge interruption | Begin K1 release then restore current/proof loss | Timer resets and release-permitted drops immediately. |
| FAT-07 | Wrong key location | Remove K1 or open CAP-1 access then request close | CAP-1 close blocked; CAP-2 remains independent. |
| FAT-08 | Bank independence | Operate both banks and inject one bank fault | No shared timer/ONS/counter state; only intended common bus/86 effects cross over. |
| FAT-09 | HMI communications loss | Disconnect driver while command is pressed | No stuck request/output; quality goes bad; operator is notified. |
| FAT-10 | Analog bad quality | Drive raw value outside configured valid range / fault module | Bad quality, no-current proof invalid, key release blocked. |
| FAT-11 | Counter integrity | Press close repeatedly without feedback, then complete one close | Rejected/failed presses do not count; one proven rising edge counts once. |
| FAT-12 | Lamp test | Hold lamp-test button in normal and trip states | All LEDs illuminate; internal breaker/trip/permissive states remain unchanged. |
| FAT-13 | 86 reset discipline | Request reset with cause active, then after clear | Active cause prevents reset; valid reset clears 86 only and never closes equipment. |
| FAT-14 | Mode boundary | Switch between internal simulation and trainer mode | Transition requires all commands clear/open reviewed state; one status writer at a time. |

### Handoff package

- [ ] Controller ACD/RSS source, upload/compare, firmware/catalog and module profiles
- [ ] HMI backup, tag export, communications configuration, alarm export and role record
- [ ] One-line, elementary diagrams, I/O map, permissive matrix and cause/effect matrix
- [ ] FAT results, analog calibration, point-to-point sheets and force/bypass-zero record
- [ ] Clean-machine restore steps, required installers/licenses and known-good backup location
- [ ] Revision, approvers, open items, trainer-only boundary and next review date

## 8. Project-specific documents required

- [ ] Approved substation one-line and revision
- [ ] Breaker elementary/control schematics
- [ ] Relay manual, settings file and cause/effect matrix
- [ ] Transformer protection schematic
- [ ] Capacitor-bank nameplate/manual and discharge requirement
- [ ] Kirk key exchange drawing and key schedule
- [ ] PLC/module installation and instruction manuals
- [ ] Trainer wiring and electrical specifications
- [ ] Wonderware / AVEVA application and OI-driver manuals
- [ ] Electrical safe-work, switching, LOTO and MOC procedures

## Reference starting points

- [Rockwell Automation Literature Library](https://literature.rockwellautomation.com/) — Controller, module and instruction manuals—select the exact catalog, firmware and publication revision.
- [Studio 5000 Logix Designer product page](https://www.rockwellautomation.com/en-us/products/software/factorytalk/designsuite/studio-5000.html) — Project environment and compatibility starting point.
- [AVEVA InTouch HMI](https://www.aveva.com/en/products/intouch-hmi/) — HMI/communications documentation starting point; product naming varies by installed generation.
- [Kirk Key Interlock resources](https://www.kirkkey.com/resources/) — Obtain the actual key-interlock scheme, operation/maintenance instructions and project drawing.
- [NFPA 70E overview](https://www.nfpa.org/codes-and-standards/nfpa-70e-standard-development/70e) — Electrical safe-work-practice scope; use the adopted edition and employer procedure.

---

### Signoff

| Role | Name / signature | Date |
|---|---|---|
| Prepared by |  |  |
| Controls review |  |  |
| Electrical / protection review |  |  |
| Training release |  |  |
