/*
 * Training-project data for the substation PLC notebook.
 *
 * This is deliberately a design workbook, not an engineered protection scheme. Tags,
 * addresses and timer presets are examples/placeholders. The page keeps this distinction
 * visible and gives the learner one place to replace assumptions with reviewed drawings.
 */

export const PROJECT_ID = 'SUB-TRAIN-01';

export const DRAWING_OBSERVATIONS = [
  { area: 'Drawing identity', observed: 'Duke Energy Texas project-substation one-line; title identifies a 138/4.16 kV station.', confidence: 'Readable', action: 'Record the original drawing number and revision from the native PDF/title block.' },
  { area: 'Incoming transformation', observed: 'A 138 kV source enters through high-side switching/protection and a main step-down transformer to the 4.16 kV system.', confidence: 'Topology visible', action: 'Transcribe transformer, disconnect, breaker, CT and relay device tags from the original drawing.' },
  { area: '4.16 kV bus and feeders', observed: 'The medium-voltage bus supplies labeled feeder branches (including Feeder A, B and C) plus clouded additions.', confidence: 'Topology visible', action: 'Confirm every feeder name, breaker number, bus section and tie arrangement from the PDF.' },
  { area: 'Motor/load feeders', observed: 'Multiple protected load/motor branches and SEL relay bubbles are shown on the bus.', confidence: 'Visible; labels soft', action: 'Do not create PLC tags from the screenshot—use the relay/elementary drawings.' },
  { area: 'Capacitor banks', observed: 'Four repeated three-phase shunt-capacitor branches appear in the lower addition cloud.', confidence: 'Count visible', action: 'Confirm bank designations, ratings, breaker numbers, CTs, discharge devices and key schedule.' },
  { area: 'Protection/communications', observed: 'CTs, protective-relay functions and communications connections are depicted.', confidence: 'Architecture visible', action: 'Protection remains relay-owned; obtain settings, cause/effect and communications point lists separately.' }
];

export const CONTROLLER_BASIS = [
  { item: 'Controller family', selection: 'CompactLogix 5370 L1 — user specified L18ER', designEffect: 'Use the L1 embedded I/O plus local 1734 POINT I/O; confirm the complete nameplate catalog before creating the ACD.' },
  { item: 'Likely full catalog', selection: '1769-L18ER-BB1B — CONFIRM', designEffect: 'Rockwell literature lists 16 embedded DC inputs and 16 embedded DC outputs for this family; the selected catalog also determines onboard analog capability.' },
  { item: 'Maintained switches', selection: '15 embedded digital inputs + 1 spare', designEffect: 'Fits one 16-point bank after voltage, sourcing/sinking and common wiring are confirmed.' },
  { item: 'Momentary switches', selection: '15 additional digital inputs + 1 spare', designEffect: 'Requires compatible local POINT I/O expansion; select the module only after the trainer electrical interface is known.' },
  { item: 'LED outputs', selection: '8 of 16 embedded digital outputs', designEffect: 'Leaves 8 spares; verify sourcing behavior, output current and whether interposing devices are required.' },
  { item: 'Potentiometers', selection: '2 analog input channels', designEffect: 'Use isolated onboard/expansion analog channels compatible with the measured trainer signal; do not assume a bare pot can connect directly.' },
  { item: 'Studio 5000 revision', selection: 'MATCH CONTROLLER FIRMWARE', designEffect: 'Record firmware and compatible Logix Designer revision before creating or flashing the project.' },
  { item: 'Emulation strategy', selection: 'Confirm installed emulator support; keep internal plant model', designEffect: 'The ACD target and emulator must be compatible. If not, validate logic on a supported virtual target and separately prove the L18ER hardware mapping.' }
];

/** Normalized simulator names. They are intentionally not presented as the drawing's device tags: the
 * screenshot is sufficient for topology/count but not reliable character-by-character transcription. */
export const ASSUMED_TOPOLOGY = [
  { tag: 'UTILITY_138KV', device: '138 kV source', role: 'Drawing-observed incoming source; availability is simulated on the isolated trainer.' },
  { tag: 'SW_HV / CB_HV', device: 'High-side switching and protection', role: 'Monitored as a simplified healthy/available state until the elementary drawings provide exact device points.' },
  { tag: 'XFMR_MAIN', device: '138/4.16 kV main transformer', role: 'Drawing-observed step-down transformer with relay-owned protection and PLC supervision only.' },
  { tag: 'CB_MAIN', device: '4.16 kV main breaker', role: 'Normalized trainer breaker with 52a/52b state, close/open requests, trip ownership and operation count.' },
  { tag: 'BUS_4KV', device: '4.16 kV bus', role: 'Derived energized/quality state; no live medium-voltage equipment is connected to the trainer.' },
  { tag: 'FDR_A… / MOTOR_LOADS', device: 'Feeder and motor branches', role: 'Shown on the HMI as monitored load branches; exact tags remain a drawing-transcription task.' },
  { tag: 'CB_CAP1…CB_CAP4', device: 'Four shunt-capacitor bank breakers', role: 'Independent switched-bank instances with operation count, discharge sequence and K1–K4 trapped-key state.' },
  { tag: '86_LOCKOUT', device: 'Master lockout model', role: 'Latches imported protective trips and blocks closes until causes are clear and reset is accepted.' }
];

export const TRAINER_IO = {
  maintained: [
    { channel: 'M01', tag: 'DI_SafetyChainHealthy', studio: 'Local:1:I.Data.0', rslogix: 'I:1/0', device: 'Safety chain healthy simulation', normal: 'ON', note: 'Status input only. A real emergency stop remains hardwired and safety-rated.' },
    { channel: 'M02', tag: 'DI_ControlPowerHealthy', studio: 'Local:1:I.Data.1', rslogix: 'I:1/1', device: 'Control power healthy', normal: 'ON', note: 'Drops every close permissive.' },
    { channel: 'M03', tag: 'DI_RemoteMode', studio: 'Local:1:I.Data.2', rslogix: 'I:1/2', device: 'Local / remote selector', normal: 'OFF', note: 'ON selects HMI/trainer remote control.' },
    { channel: 'M04', tag: 'DI_SourceAvailable', studio: 'Local:1:I.Data.3', rslogix: 'I:1/3', device: '138 kV source available', normal: 'ON', note: 'Simulation of incoming-source and high-side availability—not a live voltage indication.' },
    { channel: 'M05', tag: 'DI_XfmrProtectionHealthy', studio: 'Local:1:I.Data.4', rslogix: 'I:1/4', device: 'Main transformer protection healthy', normal: 'ON', note: 'Composite trainer contact; actual relay alarm/trip contacts remain separate.' },
    { channel: 'M06', tag: 'DI_MVRelayHealthy', studio: 'Local:1:I.Data.5', rslogix: 'I:1/5', device: '4.16 kV protection healthy', normal: 'ON', note: 'Composite trainer health input for the drawing-observed protective-relay layer.' },
    { channel: 'M07', tag: 'DI_CBMain_52a', studio: 'Local:1:I.Data.6', rslogix: 'I:1/6', device: '4.16 kV main breaker closed', normal: 'OFF', note: 'Trainer has one contact per breaker; 52b may be derived only in training mode.' },
    { channel: 'M08', tag: 'DI_CBCap1_52a', studio: 'Local:1:I.Data.7', rslogix: 'I:1/7', device: 'CAP-1 breaker closed', normal: 'OFF', note: 'Drives CAP-1 state and proven-operation count.' },
    { channel: 'M09', tag: 'DI_CBCap2_52a', studio: 'Local:1:I.Data.8', rslogix: 'I:1/8', device: 'CAP-2 breaker closed', normal: 'OFF', note: 'Drives CAP-2 state and proven-operation count.' },
    { channel: 'M10', tag: 'DI_CBCap3_52a', studio: 'Local:1:I.Data.9', rslogix: 'I:1/9', device: 'CAP-3 breaker closed', normal: 'OFF', note: 'Drives CAP-3 state and proven-operation count.' },
    { channel: 'M11', tag: 'DI_CBCap4_52a', studio: 'Local:1:I.Data.10', rslogix: 'I:1/10', device: 'CAP-4 breaker closed', normal: 'OFF', note: 'Drives CAP-4 state and proven-operation count.' },
    { channel: 'M12', tag: 'DI_K1AtBreaker', studio: 'Local:1:I.Data.11', rslogix: 'I:1/11', device: 'K1 inserted/trapped at CAP-1 breaker', normal: 'ON', note: 'Simulation of key-position indication; the physical key system remains mechanical.' },
    { channel: 'M13', tag: 'DI_K2AtBreaker', studio: 'Local:1:I.Data.12', rslogix: 'I:1/12', device: 'K2 inserted/trapped at CAP-2 breaker', normal: 'ON', note: 'Independent CAP-2 close proof.' },
    { channel: 'M14', tag: 'DI_K3AtBreaker', studio: 'Local:1:I.Data.13', rslogix: 'I:1/13', device: 'K3 inserted/trapped at CAP-3 breaker', normal: 'ON', note: 'Independent CAP-3 close proof.' },
    { channel: 'M15', tag: 'DI_K4AtBreaker', studio: 'Local:1:I.Data.14', rslogix: 'I:1/14', device: 'K4 inserted/trapped at CAP-4 breaker', normal: 'ON', note: 'Independent CAP-4 close proof.' }
  ],
  momentary: [
    { channel: 'P01', tag: 'DI_PB_CBMain_Close', studio: 'Local:2:I.Data.0', rslogix: 'I:2/0', device: '4.16 kV MAIN CLOSE', action: 'Request' },
    { channel: 'P02', tag: 'DI_PB_CBMain_Open', studio: 'Local:2:I.Data.1', rslogix: 'I:2/1', device: '4.16 kV MAIN OPEN', action: 'Request' },
    { channel: 'P03', tag: 'DI_PB_Cap1_Close', studio: 'Local:2:I.Data.2', rslogix: 'I:2/2', device: 'CAP-1 CLOSE', action: 'Request' },
    { channel: 'P04', tag: 'DI_PB_Cap1_Open', studio: 'Local:2:I.Data.3', rslogix: 'I:2/3', device: 'CAP-1 OPEN', action: 'Request' },
    { channel: 'P05', tag: 'DI_PB_Cap2_Close', studio: 'Local:2:I.Data.4', rslogix: 'I:2/4', device: 'CAP-2 CLOSE', action: 'Request' },
    { channel: 'P06', tag: 'DI_PB_Cap2_Open', studio: 'Local:2:I.Data.5', rslogix: 'I:2/5', device: 'CAP-2 OPEN', action: 'Request' },
    { channel: 'P07', tag: 'DI_PB_Cap3_Close', studio: 'Local:2:I.Data.6', rslogix: 'I:2/6', device: 'CAP-3 CLOSE', action: 'Request' },
    { channel: 'P08', tag: 'DI_PB_Cap3_Open', studio: 'Local:2:I.Data.7', rslogix: 'I:2/7', device: 'CAP-3 OPEN', action: 'Request' },
    { channel: 'P09', tag: 'DI_PB_Cap4_Close', studio: 'Local:2:I.Data.8', rslogix: 'I:2/8', device: 'CAP-4 CLOSE', action: 'Request' },
    { channel: 'P10', tag: 'DI_PB_Cap4_Open', studio: 'Local:2:I.Data.9', rslogix: 'I:2/9', device: 'CAP-4 OPEN', action: 'Request' },
    { channel: 'P11', tag: 'DI_PB_MasterTrip', studio: 'Local:2:I.Data.10', rslogix: 'I:2/10', device: 'MASTER TRIP', action: 'Trip input' },
    { channel: 'P12', tag: 'DI_PB_86Reset', studio: 'Local:2:I.Data.11', rslogix: 'I:2/11', device: '86 RESET', action: 'Reset request' },
    { channel: 'P13', tag: 'DI_PB_AlarmAck', studio: 'Local:2:I.Data.12', rslogix: 'I:2/12', device: 'ALARM ACKNOWLEDGE', action: 'Acknowledge' },
    { channel: 'P14', tag: 'DI_PB_CountReset', studio: 'Local:2:I.Data.13', rslogix: 'I:2/13', device: 'COUNTER RESET', action: 'Maintenance request' },
    { channel: 'P15', tag: 'DI_PB_LampTest', studio: 'Local:2:I.Data.14', rslogix: 'I:2/14', device: 'LAMP TEST', action: 'Test' }
  ],
  analog: [
    { channel: 'AI01', tag: 'AI_SelectedCapCurrentRaw', studio: 'Local:3:I.Ch0Data', rslogix: 'I:3.0', device: 'Potentiometer 1 — selected-bank isolated CT/current simulator', engineering: 'AI_SelectedCapCurrent_Pct', note: 'HMI selects CAP-1…4 for one-at-a-time checkout. Never connect a trainer input to an energized CT secondary.' },
    { channel: 'AI02', tag: 'AI_BusVoltageRaw', studio: 'Local:3:I.Ch1Data', rslogix: 'I:3.1', device: 'Potentiometer 2 — isolated 4.16 kV bus VT simulator', engineering: 'AI_BusVoltage_Pct', note: 'Use percent-of-nominal until the approved VT ratio and module calibration are transcribed.' }
  ],
  green: [
    { channel: 'G01', tag: 'DO_LED_ControlHealthy', studio: 'Local:4:O.Data.0', rslogix: 'O:4/0', device: 'CONTROL HEALTHY' },
    { channel: 'G02', tag: 'DO_LED_BusEnergized', studio: 'Local:4:O.Data.1', rslogix: 'O:4/1', device: '4.16 kV BUS ENERGIZED' },
    { channel: 'G03', tag: 'DO_LED_Cap1Closed', studio: 'Local:4:O.Data.2', rslogix: 'O:4/2', device: 'CAP-1 CLOSED' },
    { channel: 'G04', tag: 'DO_LED_Cap2Closed', studio: 'Local:4:O.Data.3', rslogix: 'O:4/3', device: 'CAP-2 CLOSED' },
    { channel: 'G05', tag: 'DO_LED_Cap3Closed', studio: 'Local:4:O.Data.4', rslogix: 'O:4/4', device: 'CAP-3 CLOSED' },
    { channel: 'G06', tag: 'DO_LED_Cap4Closed', studio: 'Local:4:O.Data.5', rslogix: 'O:4/5', device: 'CAP-4 CLOSED' }
  ],
  amber: [
    { channel: 'A01', tag: 'DO_LED_TripLockout', studio: 'Local:4:O.Data.6', rslogix: 'O:4/6', device: 'TRIP / 86 LOCKOUT' },
    { channel: 'A02', tag: 'DO_LED_KeyRelease', studio: 'Local:4:O.Data.7', rslogix: 'O:4/7', device: 'SELECTED KEY RELEASE PERMITTED' }
  ]
};

export const INTERNAL_TAGS = [
  { tag: 'SYS_SimMode', type: 'BOOL', owner: 'Configuration', purpose: 'Selects internal breaker plant model. Must be false before trainer outputs are enabled.' },
  { tag: 'SYS_FirstScan', type: 'BOOL', owner: 'Controller', purpose: 'First-scan initialization; map to S:FS in Logix 5000 or S:1/15 in many SLC projects after verifying processor behavior.' },
  { tag: 'SYS_IOHealthy', type: 'BOOL', owner: 'Diagnostics', purpose: 'Combined module/communications health. A failed input module blocks closes.' },
  { tag: 'SIM_SelectedCapBank', type: 'DINT / N7', owner: 'Configuration', purpose: 'Selects CAP-1…4 for the single physical CT/current potentiometer; only the selected bank may use that proof.' },
  { tag: 'BUS4KV_Energized', type: 'BOOL', owner: 'State model', purpose: 'Derived from source available, main breaker state, VT simulation and input quality.' },
  { tag: 'CBMain_52b_Training', type: 'BOOL', owner: 'State model', purpose: 'Training-only complement of 52a. Do not use as an independent proof in real switchgear.' },
  { tag: 'P_CBMain_Close', type: 'BOOL', owner: 'Permissives', purpose: 'All reviewed conditions required to accept a 4.16 kV main-breaker close request.' },
  { tag: 'P_CAP[1..4]_Close', type: 'BOOL[4] / B3 range', owner: 'Permissives', purpose: 'Four independent results: bus and relay healthy, matching key at breaker, breaker open, no 86 and no inhibit.' },
  { tag: 'TRIP_Any', type: 'BOOL', owner: 'Trips', purpose: 'OR of imported SEL/protective-relay trips, transformer trip, master trip and simulation trip requests.' },
  { tag: 'TRIP_FirstOutCode', type: 'DINT / N7', owner: 'Trips', purpose: 'Captures the first active cause; subsequent trips do not overwrite it until a controlled reset.' },
  { tag: 'L_86Lockout', type: 'BOOL', owner: 'Trips', purpose: 'Latched lockout model. Reset only when all causes are clear and reset permissive is true.' },
  { tag: 'T_CAP[1..4]_Discharge', type: 'TIMER[4] / T4 range', owner: 'Cap bank', purpose: 'Four independent discharge-wait instances; presets come from the bank documents and key schedule.' },
  { tag: 'C_CBMain_Operations', type: 'COUNTER / C5', owner: 'Maintenance', purpose: 'Counts rising edges of proven main-breaker closed feedback, not button presses.' },
  { tag: 'C_CAP[1..4]_Operations', type: 'COUNTER[4] / C5 range', owner: 'Maintenance', purpose: 'Four independent counters driven by each capacitor breaker 52a rising edge.' }
];

export const PROGRAM_ROUTINES = [
  { order: '00', routine: 'MainProgram', purpose: 'Calls every routine in a fixed order; contains no equipment logic.', output: 'JSR order is visible and reviewed.' },
  { order: '10', routine: 'InputMap', purpose: 'Copies physical/emulated addresses into descriptive raw tags and validates module health.', output: 'One owner for every input alias.' },
  { order: '20', routine: 'InputConditioning', purpose: 'Debounce where justified, scale pots, create training-only 52b complements and reject impossible states.', output: 'Conditioned status tags plus bad-status alarms.' },
  { order: '30', routine: 'ProtectionTrips', purpose: 'Processes relay contacts, first-out capture and 86 lockout before close logic runs.', output: 'Trips always win the scan.' },
  { order: '40', routine: 'Permissives', purpose: 'Calculates one named permissive and one named reason bit for each close condition.', output: 'HMI can explain every blocked close.' },
  { order: '50', routine: 'BreakerControl', purpose: 'Arbitrates trainer and HMI requests, generates bounded command pulses and proves travel.', output: 'Commands are separate from status.' },
  { order: '60', routine: 'CapBankKirk', purpose: 'Runs four independent bank state machines, discharge timers and selected-key release indication.', output: 'No PLC bit is presented as a mechanical key guarantee.' },
  { order: '70', routine: 'Transformer', purpose: 'Combines alarm indications while preserving independent trip causes.', output: 'Transformer protection is visible without moving it into the PLC.' },
  { order: '80', routine: 'CountersAlarms', purpose: 'Counts proven operations, applies one-shots, latches alarms and handles acknowledgement/reset.', output: 'Maintenance totals and first-out record.' },
  { order: '90', routine: 'OutputMap', purpose: 'Maps internal commands and indications to physical outputs; lamp test affects lamps only.', output: 'One writer for each physical output.' },
  { order: '99', routine: 'SimulationModel', purpose: 'When enabled, turns accepted commands into delayed breaker feedback and analog scenarios.', output: 'Disabled and isolated in trainer mode.' }
];

export const PERMISSIVE_MATRIX = [
  { device: 'CB_MAIN', closeRequires: 'Safety chain and control power healthy; remote/local authority valid; 138 kV source/high-side available; transformer protection and I/O healthy; 86 reset; 4.16 kV breaker proven open', tripOrBlock: 'Imported transformer/bus/protective trip, master trip, 86 lockout, contradictory 52a/52b or module fault', plcRole: 'Training control and indication only; drawing-observed protection remains relay/hardwire-owned.' },
  { device: 'CB_CAP1 / K1', closeRequires: '4.16 kV bus energized and voltage in approved band; relay healthy; K1 at breaker; access state secured; bank breaker open; no 86 or reclose inhibit', tripOrBlock: 'K1 removed, access open, bank relay trip, bus dead, 86 or bad quality/status', plcRole: 'Supplemental interlock and sequence. Mechanical Kirk system is authoritative.' },
  { device: 'CB_CAP2 / K2', closeRequires: 'Same classes of proof as CAP-1 using independent CAP-2 tags, timer, ONS storage, counter and K2', tripOrBlock: 'Same classes of trip/block using CAP-2 inputs', plcRole: 'Independent instance; no state shared with another key.' },
  { device: 'CB_CAP3 / K3', closeRequires: 'Same classes of proof as CAP-1 using independent CAP-3 tags, timer, ONS storage, counter and K3', tripOrBlock: 'Same classes of trip/block using CAP-3 inputs', plcRole: 'Independent instance; no state shared with another key.' },
  { device: 'CB_CAP4 / K4', closeRequires: 'Same classes of proof as CAP-1 using independent CAP-4 tags, timer, ONS storage, counter and K4', tripOrBlock: 'Same classes of trip/block using CAP-4 inputs', plcRole: 'Independent instance; no state shared with another key.' },
  { device: '86_LOCKOUT reset', closeRequires: 'All active trip causes clear; breakers in reviewed state; reset request edge; reset authority valid', tripOrBlock: 'Any active or untrustworthy trip input', plcRole: 'A reset never creates a close command.' }
];

export const KIRK_STATES = [
  { state: 'ENERGIZED / READY', breaker: 'Closed or available to close', current: 'May be present', key: 'Trapped at breaker', release: 'Blocked', close: 'Allowed only with all electrical permissives' },
  { state: 'OPEN — VERIFY', breaker: '52a off and independent 52b on', current: 'Must fall below approved proof threshold', key: 'Still trapped', release: 'Blocked', close: 'Blocked while release request is active' },
  { state: 'DISCHARGE WAIT', breaker: 'Proven open', current: 'No-current indication maintained', key: 'Still trapped', release: 'Blocked until approved timer is done', close: 'Blocked' },
  { state: 'RELEASE PERMITTED', breaker: 'Proven open', current: 'No-current and wait complete', key: 'May be mechanically released', release: 'Amber indication only', close: 'Blocked by sequence latch' },
  { state: 'KEY AT BANK / ACCESS', breaker: 'Open and locked', current: 'Absence of voltage established by approved work practice, not PLC', key: 'Trapped in bank/access lock', release: 'Not applicable', close: 'Blocked because key-at-breaker is false or access is open' },
  { state: 'RETURN / RESTORE', breaker: 'Open', current: 'Safe state confirmed', key: 'Returned and trapped at breaker; access secured', release: 'Reset after request clears', close: 'Eligible after all permissives are recalculated' }
];

export const TIMER_COUNTER_PLAN = [
  { element: 'TON — breaker travel', instance: 'T_CBxxx_CloseTravel', trigger: 'Accepted close command', doneUse: 'Raises fail-to-close if 52a is not proven before the reviewed travel window', reset: '52a proves or request clears', warning: 'Preset comes from breaker/control-circuit data, not this notebook.' },
  { element: 'TON — cap discharge', instance: 'T_CAPx_Discharge', trigger: 'Breaker proven open AND no-current proof true AND key-release request latched', doneUse: 'Enables supplemental KEY RELEASE PERMITTED indication', reset: 'Any proof drops, breaker closes or sequence resets', warning: 'Use the capacitor-bank manufacturer/nameplate and approved procedure.' },
  { element: 'TON — status debounce', instance: 'T_x_StatusStable', trigger: 'Raw auxiliary state changes', doneUse: 'Accepts a stable trainer switch state where contact bounce is observed', reset: 'Raw state reverses', warning: 'Do not mask real disagreement or protection transitions with a long filter.' },
  { element: 'CTU — operations', instance: 'C_CBxxx_Operations', trigger: 'ONS of proven 52a rising edge', doneUse: 'Maintenance indication only', reset: 'Authorized maintenance reset with audit note', warning: 'Do not count close requests; count completed mechanical operations.' },
  { element: 'CTU — trips', instance: 'C_ProtectiveTrips', trigger: 'ONS of TRIP_Any', doneUse: 'Training/maintenance history', reset: 'Authorized reset', warning: 'The alarm journal remains the event record.' },
  { element: 'ONS / OSR — request', instance: 'OSR_x_Request', trigger: 'Momentary trainer or HMI request goes false-to-true', doneUse: 'Creates one accepted request per press', reset: 'Instruction storage resets when rung-in goes false', warning: 'Every event gets its own storage bit; never reuse one across branches.' },
  { element: 'ONS / OSR — first-out', instance: 'OSR_TripCapture', trigger: 'Combined trip goes false-to-true', doneUse: 'Captures a code only if no first-out is already stored', reset: 'Trip clear plus authorized 86 reset', warning: 'For simultaneous events, explicit rung order establishes priority and must be documented.' }
];

export const LOGIC_PATTERNS = [
  {
    title: 'Main-breaker close acceptance',
    why: 'A request is an event; a permissive is a continuously evaluated condition; an output is a bounded action. Keep all three separate.',
    studio: [
      'XIC(DI_PB_CBMain_Close) ONS(OSR_CBMain_CloseReq) OTL(REQ_CBMain_Close);',
      'XIC(REQ_CBMain_Close) XIC(P_CBMain_Close) XIO(T_CBMain_ClosePulse.DN) OTE(CMD_CBMain_Close);',
      'XIC(REQ_CBMain_Close) XIC(P_CBMain_Close) TON(T_CBMain_ClosePulse, PRE_CLOSE_PULSE_PLACEHOLDER);',
      'XIC(T_CBMain_ClosePulse.DN) OTU(REQ_CBMain_Close);',
      'XIC(REQ_CBMain_Close) XIO(P_CBMain_Close) OTL(ALM_CBMain_CloseRejected) OTU(REQ_CBMain_Close);'
    ],
    rslogix: 'Use OSR with a dedicated B3 storage bit, T4:x for the pulse timer and B3 bits for REQ/CMD. Verify the chosen processor instruction syntax.'
  },
  {
    title: 'Trip-dominant 86 lockout',
    why: 'Trip logic executes before close logic and drops commands in the same scan. Reset is edge-triggered and cannot issue a close.',
    studio: [
      'XIC(TRIP_Any) OTL(L_86Lockout);',
      'XIC(TRIP_Any) OTU(REQ_CBMain_Close);',
      'XIC(TRIP_Any) OTU(REQ_CAP1_Close) OTU(REQ_CAP2_Close) OTU(REQ_CAP3_Close) OTU(REQ_CAP4_Close);',
      'XIC(DI_PB_86Reset) ONS(OSR_86Reset) XIC(P_86Reset) OTU(L_86Lockout);'
    ],
    rslogix: 'Use OTL/OTU only when the reset path is explicit and tested. A real 86 device may require physical/manual reset and must not be bypassed in PLC logic.'
  },
  {
    title: 'CAP-1 key-release sequence',
    why: 'The PLC may supervise indications; it cannot replace the trapped-key hardware, grounding, discharge resistors, absence-of-voltage test or work procedure.',
    studio: [
      'XIO(CB301_52a) XIC(CB301_52b) XIC(CAP1_NoCurrent) XIC(REQ_K1Release) TON(T_CAP1_Discharge, PRE_FROM_APPROVED_DOCUMENT);',
      'XIO(DI_K1AtBreaker) XIO(T_CAP1_Discharge.DN) OTL(ALM_K1RemovedEarly);',
      'XIC(T_CAP1_Discharge.DN) XIC(DI_K1AtBreaker) XIO(DI_CAP1DisconnectOpen) OTE(IND_K1ReleasePermitted);',
      'XIO(DI_K1AtBreaker) OR XIC(DI_CAP1DisconnectOpen) OTE(BLK_CAP1_KeyAccess);'
    ],
    rslogix: 'Use an independent T4 timer and B3 bits for each bank. Do not copy bank 1 storage addresses into bank 2.'
  },
  {
    title: 'Count proven breaker operations once',
    why: 'A button press can be rejected and a close coil can fail. Count the state transition that proves the mechanism moved.',
    studio: [
      'XIC(CBMain_52a) ONS(OSR_CBMain_ClosedEdge) CTU(C_CBMain_Operations);',
      'XIC(CAP1_52a) ONS(OSR_CAP1_ClosedEdge) CTU(C_CAP1_Operations);',
      'XIC(CAP2_52a) ONS(OSR_CAP2_ClosedEdge) CTU(C_CAP2_Operations);',
      'XIC(CAP3_52a) ONS(OSR_CAP3_ClosedEdge) CTU(C_CAP3_Operations);',
      'XIC(CAP4_52a) ONS(OSR_CAP4_ClosedEdge) CTU(C_CAP4_Operations);',
      'XIC(MaintResetAuthorized) XIC(DI_PB_CountReset) ONS(OSR_CountReset) RES(C_CBMain_Operations);'
    ],
    rslogix: 'Use separate OSR storage bits and C5 counters. Save totals externally before download/reset if maintenance depends on them.'
  },
  {
    title: 'Analog input scaling and quality',
    why: 'Separate raw counts, engineering value and quality. A bad channel must not quietly become a valid zero.',
    studio: [
      'CPT(AI_SelectedCapCurrent_Pct, (AI_SelectedCapCurrentRaw - RAW_MIN) * 100.0 / (RAW_MAX - RAW_MIN));',
      'LIM(RAW_VALID_LOW, AI_SelectedCapCurrentRaw, RAW_VALID_HIGH) OTE(AI_SelectedCapCurrent_QualityGood);',
      'XIC(AI_SelectedCapCurrent_QualityGood) LES(AI_SelectedCapCurrent_Pct, CAP_NO_CURRENT_THRESHOLD_APPROVED) OTE(SelectedCAP_NoCurrentIndication);'
    ],
    rslogix: 'Use SCP where supported or compute with F8 values and explicit divide-by-zero protection. Raw limits and thresholds come from module configuration and approved design data.'
  }
];

export const HMI_SCREENS = [
  { screen: '01 — Drawing overview', includes: '138 kV source/high-side, main transformer, 4.16 kV main, feeders/motors, four cap banks, 86 and analog meters', operatorAction: 'Open faceplates; no direct output writes', acceptance: 'Every color has a text/state label; untranscribed drawing tags remain visibly flagged.' },
  { screen: '02 — Breaker faceplate', includes: '52a/52b, close/open request, permissive summary, command pulse, fail-to-open/close, local/remote', operatorAction: 'Two-step select then execute for training', acceptance: 'Close rejected reason is visible and requests self-clear in PLC.' },
  { screen: '03 — Cap bank / Kirk sequence', includes: 'Key location, breaker proof, CT no-current indication, discharge timer state, disconnect/access indication', operatorAction: 'Request release or cancel; follow mechanical procedure', acceptance: 'Banner says PLC indication is supplemental and never “safe to touch”.' },
  { screen: '04 — Alarms & first-out', includes: 'Active, unacknowledged, first-out code, timestamp from HMI historian, 86 state', operatorAction: 'Acknowledge; reset only from dedicated control', acceptance: 'Acknowledge does not clear the trip or 86.' },
  { screen: '05 — Operations & maintenance', includes: 'Breaker operation counters, trip counter, failed-travel count, last reset note', operatorAction: 'Authorized counter reset', acceptance: 'Counter reset is audited or manually logged.' },
  { screen: '06 — Simulator / trainer', includes: 'Mode, virtual relay trips, analog scenario values, trainer I/O quality', operatorAction: 'Inject only while simulation is enabled', acceptance: 'Simulation watermark is unmistakable; physical-output enable is separately controlled.' },
  { screen: '07 — Diagnostics', includes: 'Raw/conditioned I/O, module quality, controller/HMI heartbeat and bad-state alarms', operatorAction: 'Read-only', acceptance: 'No force control is exposed as an ordinary operator button.' }
];

export const WONDERWARE_STEPS = [
  'Install/configure the AVEVA communication server or OI driver that matches the selected Allen-Bradley controller. Record driver version, controller firmware and route in the notebook.',
  'Create one access name/topic for this training PLC. Prove read-only communications with SYS_Heartbeat before adding commands.',
  'Import or create HMI tags from the PLC external-access tag list. Use descriptive PLC tags in Studio 5000; for RSLogix 500, map B3/N7/F8 addresses to symbols and comments.',
  'Build a reusable breaker faceplate with status, quality, permissives, block reasons, close/open request tags and operation count. The faceplate writes request bits only.',
  'Make command scripts momentary and design PLC requests to self-clear after accept/reject. Test loss of communications while the button is pressed.',
  'Build the one-line with state plus quality. Do not rely on red/green alone: show OPEN, CLOSED, MOVING, BAD STATUS and BAD QUALITY text.',
  'Build the Kirk sequence display from proofs and state; label release as “PERMITTED” rather than “SAFE”. Do not put an HMI-only bypass around key/access inputs.',
  'Configure alarm priorities, acknowledgement, first-out text and history. Protection operation and control-system fault must be distinct alarm classes.',
  'Restrict simulator controls, counter reset and 86 reset by role. Record credentials/configuration according to the site procedure; never hard-code them in PLC comments.',
  'Run the HMI acceptance tests: stale data, PLC stopped, driver disconnected, bad analog quality, stuck request, simultaneous trips and browser/client restart.'
];

export const BUILD_PHASES = [
  {
    id: 'basis', number: '01', title: 'Freeze the training design basis', outcome: 'A signed-off scope with every unknown visible.',
    tasks: [
      'Attach the original PDF of the uploaded 138/4.16 kV one-line, plus elementary diagrams, relay list, cap-bank manual and Kirk key exchange drawing.',
      'Transcribe exact source, transformer, bus, feeder, motor, four cap-bank breaker and 86/relay tags; do not read soft characters from the screenshot.',
      'Record the CompactLogix L18ER full catalog number, firmware, Studio 5000 revision, emulator strategy and Wonderware/AVEVA version.',
      'Declare the boundary: software only, isolated low-voltage trainer, or observation of real equipment. Do not mix modes.',
      'Write an “out of scope” list: protection settings, synchronization, arc-flash calculations and live switching are not implemented here.'
    ],
    evidence: 'Design-basis sheet, marked-up one-line, document register and training boundary statement.'
  },
  {
    id: 'states', number: '02', title: 'Define devices and safe states', outcome: 'A state model that cannot confuse command with proof.',
    tasks: [
      'For every breaker, list 52a, 52b, local/remote, spring/energy charged, trip-circuit healthy, close coil and trip coil points actually available.',
      'For every relay, list healthy, alarm and trip contacts independently; identify hardwired trip paths the PLC only monitors.',
      'For XFMR_MAIN, list only indications present on the transformer/relay drawings (for example winding temperature, pressure/gas, sudden pressure or lockout) without inventing contacts.',
      'For each cap bank, document key trapped/released positions, disconnect/ground switch/access-door sequence and discharge requirement from approved documents.',
      'Create OPEN, CLOSED, MOVING, BAD STATUS and BAD QUALITY truth tables. Do not treat missing data as OPEN.'
    ],
    evidence: 'Device register, state truth tables and protection ownership matrix.'
  },
  {
    id: 'io', number: '03', title: 'Build the I/O and tag register', outcome: 'Every trainer point has one address, owner and normal state.',
    tasks: [
      'Reserve one 16-point input group for 15 maintained switches and one for 15 momentary switches; mark the spare channel in each group.',
      'Configure two analog channels to match the trainer electrical signal. Record raw endpoints from measured calibration, not assumptions.',
      'Reserve eight outputs for six green and two amber LEDs; verify output common, source/sink type and per-channel current.',
      'Create raw I/O aliases, conditioned tags, command tags, status tags and HMI tags as separate layers.',
      'Perform point-to-point continuity checks with PLC power isolated, then a low-voltage I/O checkout.'
    ],
    evidence: 'Completed I/O table, module configuration printout and signed point-to-point sheet.'
  },
  {
    id: 'project', number: '04', title: 'Create the controller project', outcome: 'A compiling shell that matches the eventual target.',
    tasks: [
      'Studio 5000: create the controller at the exact emulator/hardware catalog and revision; RSLogix 500: select an emulator-compatible processor.',
      'Create MainProgram and routines in the documented 00–99 execution order before writing equipment logic.',
      'Create controller-scoped types/tags in Studio 5000. In RSLogix 500, allocate and document B3, T4, C5, N7 and F8 files.',
      'Set task/watchdog periods from the selected controller and training response requirements; record them as project parameters.',
      'Enable external access only for HMI tags that must be read/written. Keep raw outputs and bypass bits out of the operator interface.'
    ],
    evidence: 'Version-zero ACD or RSS file, cross-reference report and clean verify/compile.'
  },
  {
    id: 'inputs', number: '05', title: 'Map and condition inputs', outcome: 'Stable, quality-aware states for logic and HMI.',
    tasks: [
      'Copy/alias hardware addresses in InputMap; equipment routines never read slot addresses directly.',
      'Scale both pots using measured raw minimum/maximum and expose raw, engineering and quality tags.',
      'Create training-only 52b complements behind a clearly named mode bit; real deployment requires the actual independent contact where specified.',
      'Add bad-state detection for 52a and 52b both true, both false beyond travel, missing module and out-of-range analog.',
      'Test each maintained and momentary input online without enabling any command output.'
    ],
    evidence: 'Live I/O checkout with expected/actual states and analog calibration record.'
  },
  {
    id: 'protection', number: '06', title: 'Implement trips and transformer supervision', outcome: 'Trip-first logic with first-out evidence.',
    tasks: [
      'Bring relay trip contacts into ProtectionTrips without adding pickup settings to the PLC.',
      'OR protective causes into TRIP_Any, but retain one bit per cause for first-out and HMI detail.',
      'Latch the training 86 model on any trip and unlatch pending close requests in the same early routine.',
      'Permit reset only when every trip cause is clear, input quality is good and reset authority is valid.',
      'Inject every trip separately and two simultaneously; verify documented first-out priority and that trip always wins.'
    ],
    evidence: 'Cause-and-effect test sheet and first-out priority record.'
  },
  {
    id: 'breaker', number: '07', title: 'Build breaker control', outcome: 'Request/permissive/command/status layers with no hidden seal-in.',
    tasks: [
      'Calculate a named close permissive and individual block-reason bits for each breaker.',
      'Use dedicated one-shots to accept each physical/HMI request once; do not share storage bits.',
      'Generate bounded close/open pulses where the control schematic requires them; never latch a physical coil indefinitely.',
      'In simulation mode only, make a breaker plant model that changes feedback after a parameterized travel delay.',
      'Test close allowed, every close rejection, fail to close, fail to open, contradictory feedback and trip during close.'
    ],
    evidence: 'Permissive matrix, rung printout and breaker FAT cases.'
  },
  {
    id: 'kirk', number: '08', title: 'Build all four cap-bank Kirk sequences', outcome: 'Independent, testable supplemental indications around a real mechanical boundary.',
    tasks: [
      'Create separate K1–K4 state tags, HMI release requests, discharge timers, selected-bank no-current proof and alarms.',
      'Require proven open, current below the approved threshold and the approved discharge wait before indicating release permitted for the selected bank.',
      'Block close whenever that bank key is not at its breaker, access is open, sequence is active or any required quality is bad.',
      'Require key return and access/disconnect restoration before the selected bank can return to READY.',
      'Walk every state and failure on all four instances: timer reset, current returns, wrong bank selected, key changes early, relay trips and power cycles.'
    ],
    evidence: 'Approved key-exchange truth table and independent CAP-1 through CAP-4 sequence FAT.'
  },
  {
    id: 'elements', number: '09', title: 'Add timers, counters, one-shots and alarms', outcome: 'Each stateful instruction has an owner, reset and power-up behavior.',
    tasks: [
      'List every TON/RTO, CTU and ONS/OSR instance with purpose, preset source, reset and retentive behavior.',
      'Count proven 52a rising edges, not button presses or command bits.',
      'Keep operation counts retentive only if controller and maintenance requirements support it; document download behavior.',
      'Use first-scan logic to clear transient requests while preserving only the states intentionally designated retentive.',
      'Verify no ONS/OSR storage bit, timer or counter is shared between equipment instances.'
    ],
    evidence: 'Stateful-instruction register and power-cycle/download test results.'
  },
  {
    id: 'hmi', number: '10', title: 'Build Wonderware / AVEVA HMI', outcome: 'An operator interface that requests, explains and records—but never owns protection.',
    tasks: [
      'Prove communications and quality using a heartbeat before building controls.',
      'Build the one-line and reusable breaker faceplate from PLC status/permissive/reason tags.',
      'Write request bits only; make PLC logic self-clear accepted/rejected requests and test a dropped connection mid-press.',
      'Build the cap-bank sequence page with an explicit “supplemental indication” warning.',
      'Configure alarm acknowledgement separately from trip/86 reset and test bad quality on every screen.'
    ],
    evidence: 'HMI tag export, screen prints, alarm list and communications-loss FAT.'
  },
  {
    id: 'trainer', number: '11', title: 'Connect the isolated physical trainer', outcome: 'A documented, current-limited low-voltage interface.',
    tasks: [
      'Verify trainer voltage, commons, source/sink conventions, channel loading, fusing and isolation against both manuals.',
      'Wire with PLC and trainer de-energized; label both ends and keep field wiring separate from network/power conductors.',
      'Use isolated signal simulation for current/voltage pots. Never connect the trainer directly to a live CT or VT circuit.',
      'Prove every input and LED in an I/O-only test routine before allowing BreakerControl to execute.',
      'Set SYS_SimMode false, disable the internal plant model and prove it cannot write over physical feedback.'
    ],
    evidence: 'Wiring drawing, continuity/megger method as appropriate to trainer, I/O checkout and mode-control test.'
  },
  {
    id: 'fat', number: '12', title: 'FAT, backup and handoff', outcome: 'A repeatable project someone else can restore and test.',
    tasks: [
      'Run normal sequences plus every single permissive failure, protective trip, bad status, bad quality and communications failure.',
      'Test first scan, controller restart, HMI restart, emulator restart, download and loss/return of trainer power.',
      'Capture controller file, HMI application, tag exports, I/O map, FAT results and software/firmware versions together.',
      'Remove forces, temporary bypasses and test code; run cross-reference searches for each force/bypass tag.',
      'Have a qualified reviewer approve the training system before any connection beyond the isolated trainer boundary.'
    ],
    evidence: 'Signed FAT, force/bypass-zero report, restore test and released backup package.'
  }
];

export const FAT_TESTS = [
  { id: 'FAT-01', test: 'Power-up / first scan', action: 'Restart controller in each mode', expected: 'No spontaneous close; transient requests clear; intentional retentive data behaves as documented.' },
  { id: 'FAT-02', test: 'Main close success', action: 'Make all CB_MAIN permissives, pulse close and prove status', expected: 'One request, bounded command, one operation count, CLOSED indication.' },
  { id: 'FAT-03', test: 'Each close block', action: 'Drop one permissive at a time', expected: 'No output; exact block reason; rejected request self-clears.' },
  { id: 'FAT-04', test: 'Trip during close', action: 'Assert master/protective trip during command', expected: 'Command drops, 86 latches, trip is first-out, closes remain blocked.' },
  { id: 'FAT-05', test: 'Aux contact disagreement', action: 'Simulate impossible 52a/52b combinations', expected: 'BAD STATUS; neither OPEN nor CLOSED claimed; close blocked.' },
  { id: 'FAT-06', test: 'CAP discharge interruption', action: 'Begin K1 release then restore current/proof loss', expected: 'Timer resets and release-permitted drops immediately.' },
  { id: 'FAT-07', test: 'Wrong key location', action: 'Remove each K1–K4 in turn, then request its bank close', expected: 'Only the matching bank close is blocked; all other bank state remains independent.' },
  { id: 'FAT-08', test: 'Four-bank independence', action: 'Operate all bank instances and inject one bank fault', expected: 'No shared timer/ONS/counter state; only intended common bus/86 effects cross over.' },
  { id: 'FAT-09', test: 'HMI communications loss', action: 'Disconnect driver while command is pressed', expected: 'No stuck request/output; quality goes bad; operator is notified.' },
  { id: 'FAT-10', test: 'Analog bad quality', action: 'Drive raw value outside configured valid range / fault module', expected: 'Bad quality, no-current proof invalid, key release blocked.' },
  { id: 'FAT-11', test: 'Counter integrity', action: 'Press close repeatedly without feedback, then complete one close', expected: 'Rejected/failed presses do not count; one proven rising edge counts once.' },
  { id: 'FAT-12', test: 'Lamp test', action: 'Hold lamp-test button in normal and trip states', expected: 'All LEDs illuminate; internal breaker/trip/permissive states remain unchanged.' },
  { id: 'FAT-13', test: '86 reset discipline', action: 'Request reset with cause active, then after clear', expected: 'Active cause prevents reset; valid reset clears 86 only and never closes equipment.' },
  { id: 'FAT-14', test: 'Mode boundary', action: 'Switch between internal simulation and trainer mode', expected: 'Transition requires all commands clear/open reviewed state; one status writer at a time.' }
];

export const PLATFORM_CROSSWALK = [
  { concept: 'Boolean storage', studio: 'Named BOOL tag', rslogix: 'B3:x/y with symbol and description', wonderware: 'Discrete I/O or memory tag linked to PLC tag/address' },
  { concept: 'Integer / code', studio: 'DINT named tag', rslogix: 'N7:x', wonderware: 'Integer tag' },
  { concept: 'Analog engineering value', studio: 'REAL named tag', rslogix: 'F8:x', wonderware: 'Real tag with units/range' },
  { concept: 'Timer', studio: 'TIMER tag; TON/RTO/RES', rslogix: 'T4:x; TON/RTO/RES', wonderware: 'Read .ACC/.DN for diagnostics; do not implement the permissive timer in HMI' },
  { concept: 'Counter', studio: 'COUNTER tag; CTU/RES', rslogix: 'C5:x; CTU/RES', wonderware: 'Read .ACC; reset through an authorized PLC request' },
  { concept: 'Rising edge', studio: 'ONS with unique BOOL storage', rslogix: 'OSR with unique B3 storage (processor dependent)', wonderware: 'HMI writes request; PLC owns edge detection' },
  { concept: 'Structured equipment', studio: 'UDT/AOI after base logic is tested', rslogix: 'Repeated documented file ranges/subroutines', wonderware: 'Reusable symbol/faceplate with instance tag references' },
  { concept: 'First scan', studio: 'S:FS', rslogix: 'Processor status first-scan bit; verify processor manual', wonderware: 'Not an HMI function' }
];

export const REFERENCE_LINKS = [
  { label: 'Rockwell Automation Literature Library', url: 'https://literature.rockwellautomation.com/', use: 'Controller, module and instruction manuals—select the exact catalog, firmware and publication revision.' },
  { label: 'CompactLogix 5370 L1 product profile (1769-PP012)', url: 'https://literature.rockwellautomation.com/idc/groups/literature/documents/pp/1769-pp012_-en-e.pdf', use: 'L18ER family embedded I/O, memory, expansion and communications starting point; verify the current revision and full catalog.' },
  { label: 'CompactLogix controller specifications (1769-TD005)', url: 'https://literature.rockwellautomation.com/idc/groups/literature/documents/td/1769-td005_-en-p.pdf', use: 'Controller and embedded-I/O technical data; use the publication revision applicable to the installed unit.' },
  { label: 'Studio 5000 Logix Designer product page', url: 'https://www.rockwellautomation.com/en-us/products/software/factorytalk/designsuite/studio-5000.html', use: 'Project environment and compatibility starting point.' },
  { label: 'AVEVA InTouch HMI', url: 'https://www.aveva.com/en/products/intouch-hmi/', use: 'HMI/communications documentation starting point; product naming varies by installed generation.' },
  { label: 'Kirk Key Interlock resources', url: 'https://www.kirkkey.com/resources/', use: 'Obtain the actual key-interlock scheme, operation/maintenance instructions and project drawing.' },
  { label: 'NFPA 70E overview', url: 'https://www.nfpa.org/codes-and-standards/nfpa-70e-standard-development/70e', use: 'Electrical safe-work-practice scope; use the adopted edition and employer procedure.' }
];

export const ALL_IO_ROWS = [
  ...TRAINER_IO.maintained.map((x) => ({ group: 'Maintained input', ...x })),
  ...TRAINER_IO.momentary.map((x) => ({ group: 'Momentary input', ...x })),
  ...TRAINER_IO.analog.map((x) => ({ group: 'Analog input', ...x })),
  ...TRAINER_IO.green.map((x) => ({ group: 'Green LED output', ...x })),
  ...TRAINER_IO.amber.map((x) => ({ group: 'Amber LED output', ...x }))
];
