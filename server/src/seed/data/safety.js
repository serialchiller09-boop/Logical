/**
 * SAFETY SYSTEMS, INTERLOCKS, AND THE RULES THAT KEEP LOGIC HONEST.
 */
export const SAFETY_PRINCIPLES = [
  {
    id: 'sp-independent', title: 'Independence of protection layers',
    body: 'A protection layer counts only if it is functionally, physically, and logically separate from the cause it protects against. A transmitter shared with the control loop is not independent. A trip implemented in the same controller, on the same power supply, on the same card, using the same input - is not a second layer, it is a second line of code.',
    consequence: 'The practical tests: does the trip still work if the BPCS faults? If the I/O card fails? If the network dies? If the last download was wrong? If the answer is no for any of them, it is not an SIS function.',
    status: 'standard'
  },
  {
    id: 'sp-safestate', title: 'Define the safe state before the logic',
    body: 'For each SIF: which position is safe, and that means for the vessel, the machine, the people nearby, AND the downstream system. Gas plants have examples of all three being different answers - an SDV that protects a separator by isolating it, but over-pressures a downstream vessel that was relying on the flow continuing.',
    consequence: 'Every safety requirement specification entry should say: initiating cause, action, destination of the relief/blowdown, restart conditions, and bypass rules.',
    status: 'standard'
  },
  {
    id: 'sp-deenergize', title: 'De-energize to trip',
    body: 'Protective outputs are normally energized while healthy so that loss of power, a broken wire, or a failed output card produces a trip rather than a false sense of security. The trade-off is spurious shutdowns; the alternative trade-off is failing to shut down.',
    consequence: 'Where you choose energize-to-trip (because a spurious shutdown is worse than none), it must be a documented decision with the reason written next to it. "That is how it is programmed" is not a reason.',
    status: 'standard'
  },
  {
    id: 'sp-voting', title: 'Voting architecture: sensitivity vs availability',
    body: '1oo1 is simplest and trips on one fault (low availability, maximum sensitivity). 1oo2 raises sensitivity further but doubles spurious trips. 2oo2 does the same for spurious trips as 1oo2 but halves sensitivity to detection. 2oo3 gives both decent availability and decent sensitivity, at the cost of three instruments and a degraded-mode annunciation. 1oo2D gets part of the way there from one intelligent transmitter plus its diagnostics.',
    consequence: 'The choice comes from LOPA and the spurious-trip cost model - and both must be true in the same document. A SIL target and a "we do not want to shut down" preference are not automatically compatible.',
    status: 'standard'
  },
  {
    id: 'sp-bypass', title: 'Bypass management',
    body: 'A bypass defeats a protection function, and every bypass in force is a period when the plant is less safe than its SIL documentation claims. Therefore: an authorization, an entry in a log, an expiry or a shift review, an alarm on the HMI showing the function as defeated, and a compensating measure if the exposure is long.',
    consequence: 'Audit question that ends careers: "how many SIS inputs were in bypass last month, and who signed each one?" If nobody can answer, the safety case is fiction.',
    status: 'standard'
  },
  {
    id: 'sp-proof', title: 'Proof testing, partial stroke testing, and the interval',
    body: 'A SIF is only as reliable as its last full-function test. Proof test interval directly enters the PFDavg calculation: doubling the interval roughly doubles the probability of failure on demand. Partial stroke testing detects the dominant failure (a stuck valve) without a full isolation, and does not substitute for a full test.',
    consequence: 'A trip test that only energizes the solenoid and checks a light on the panel proves nothing about the seat. Test the loop the way it fails.',
    status: 'standard'
  },
  {
    id: 'sp-response', title: 'Response time is a specification, not an accident',
    body: 'For each function: sensor response + logic solver scan + output energize + solenoid + fluid travel + stem + seat. Total has to be inside the process window, and the process window has to be estimated, not assumed.',
    consequence: 'If the process needs 200 ms and the general-purpose PLC scans at 100 ms with a 1.5 s pneumatic stroke, the machine is protected by the valve spring and hope. Anti-surge and detonation-type functions belong in faster hardware.',
    status: 'standard'
  },
  {
    id: 'sp-firstout', title: 'Sequence of events and first-out',
    body: 'A unit trip produces a burst of alarms from one cause. Without sub-cycle or millisecond-resolution time stamping and a synchronized clock, the operator and the investigator cannot tell cause from consequence.',
    consequence: 'Put SOE-capable inputs on the trip points; synchronize every cabinet and the SIS to the same source; and check it works - before an incident, not after.',
    status: 'practice'
  },
  {
    id: 'sp-alarm', title: 'Alarm philosophy and rationalization (ISA-18.2 / IEC 62682)',
    body: 'Each alarm needs: a defined consequence, a required operator action, a priority, a deadband, and delays. Rationalization removes alarms that have no action; that is why a rationalized plant has fewer alarms and better response - and why an unrationalized one trains operators to dismiss everything.',
    consequence: 'Metrics that matter: alarms per operator per hour, top-10 offending tags, standing (stale) alarms, chattering alarms, and the fraction of alarms with no documented action.',
    status: 'standard'
  },
  {
    id: 'sp-moc', title: 'Logic and setpoint changes are MOC items',
    body: 'Under a process safety management regime, changing a trip delay, an alarm limit, a deadband, a bypass route, or a rung is a management-of-change event: technical review, safety review, documentation update, and test afterwards. It is not a programming preference.',
    consequence: 'The version-control discipline in this app (every entry carries a source and a status) is the same idea applied to knowledge: if it is not traceable, it is not verifiable.',
    status: 'standard'
  },
  {
    id: 'sp-hazarea', title: 'Hazardous area classification drives equipment choice',
    body: 'Zone/Division classification determines what may be installed where: NEC Class I Division 1/2, or IEC Zone 0/1/2, with equipment types of protection (Ex d flameproof, Ex i intrinsic safety, Ex p pressurization, Ex e increased safety, Ex n non-sparking) and a temperature class below the auto-ignition temperature of the gas present.',
    consequence: 'A panel installed in a Division 2 area with a Division 1 rating is fine; a non-certified tablet, radio, or "temporary" light in the same space is an ignition source. The most common violation is temporary equipment, and it is the one that ends in a report.',
    status: 'standard'
  },
  {
    id: 'sp-tuning', title: 'Never tune a safety function',
    body: 'Adding a delay to stop a nuisance trip converts a trip into a delayed trip and, on many loops, into no trip. It is sometimes a legitimate, analyzed decision; it is never a field adjustment.',
    consequence: 'If a trip is chattering, fix the instrument, the impulse line, the limit, or the process - and if a delay is genuinely correct, it appears in the cause-and-effect matrix with the reason.',
    status: 'standard'
  },
  {
    id: 'sp-single', title: 'Beware the shared common cause',
    body: 'Three transmitters on one manifold, three pressure switches fed from one impulse line, redundant power supplies on one bus, redundant controllers with identical firmware and one bad library function. Redundancy buys independence only when the failure modes are genuinely separate.',
    consequence: 'Common-cause failure is why SIL verification has a beta factor and why "diverse as to design" matters more than "bought separately".',
    status: 'standard'
  },
  {
    id: 'sp-secure', title: 'Control system access and network separation',
    body: 'Engineering access, remote vendor support, and any path from a business network into a control or safety network are safety-relevant, because writing to a controller can change a protection function. Segregate, authenticate, log, and never rely on "nobody knows the IP".',
    consequence: 'The incident to design for is not a hack; it is a well-meaning contractor with an engineering laptop and no MOC. That is why write-access and download rights are managed like SIS bypasses.',
    status: 'practice'
  }
];

export const ESD_LEVELS = [
  {
    id: 'esd-typical', title: 'Shutdown level structure (illustrative, NOT universal)',
    warning: 'The scope of "ESD-1", "ESD-2", "ESD-3" is a plant design decision and the numbering convention itself is not standard. Some plants number from the most severe downward, others upward, and the same label can mean a unit shutdown in one facility and a total plant blowdown in another. Read your cause-and-effect matrix, not this page.',
    typicalPattern: [
      { level: 'Level 1 (most severe, often called ESD-1)', action: 'Shut in the well/flow, close the SDVs on the process, initiate blowdown of the depressurized sections, isolate the fuel gas and utilities to the affected area, start the F&G notification sequence.' },
      { level: 'Level 2', action: 'Unit or train shutdown: stop the affected compressors and treating units, isolate that train, leave the rest of the plant running.' },
      { level: 'Level 3', action: 'Selective or equipment-level shutdown: trip one machine or one skid, keep the plant at reduced rate; often the "equipment protection" level rather than the "safety" level.' },
      { level: 'Shutdown of utilities (separate)', action: 'Loss of instrument air, N2, cooling water, or power usually has its own logic because it does not correspond to a safety level at all - and it is where uncoordinated trips concentrate.' }
    ],
    status: 'site-specific'
  },
  {
    id: 'esd-blowdown', title: 'Blowdown and isolation sequencing',
    body: 'The order of operations in a shutdown: (1) stop the source, (2) isolate the section, (3) depressure the section, (4) only then is it safe to open for maintenance or to rely on the next barrier. Reversing steps 2 and 3 blows the section down through an open path into a system that is not rated for it.',
    how: 'Implemented as sequence logic with proven valve positions between each step, not as a single output energizing several solenoids at once.',
    status: 'practice'
  }
];

export const TRIP_TESTING = [
  { id: 'tt-loopcheck', test: 'Loop check / freak-out', what: 'Point-to-point: apply a known input at the device, confirm the value at the HMI and at the historian, confirm the alarm at the limit, confirm the output direction to the final element.', when: 'Commissioning, after any I/O or wiring change, after a device replacement.' },
  { id: 'tt-trip', test: 'Trip / logic test', what: 'Exercise the entire function per the cause-and-effect matrix, from simulated process condition to the actual final element moving (or a documented proxy), with timing recorded.', when: 'Commissioning; after any logic change; then per the test interval in the safety requirements specification.' },
  { id: 'tt-pst', test: 'Partial stroke test', what: 'Drives the valve part way (typically 10-30%) to detect sticking and to time the movement, using the positioner or a dedicated test valve arrangement.', when: 'Online, at intervals between proof tests. Detects the common failure; does not verify the seat or the full trip path.' },
  { id: 'tt-trans', test: 'Transmitter calibration / as-found-as-left', what: 'Compare against a reference at 0/50/100%, record as-found before adjustment.', when: 'Per the proof test interval, or after a drift complaint.' },
  { id: 'tt-soe', test: 'Timing / response test', what: 'Measure the actual time from the process condition to the final element being proven, with SOE or a high-speed logger.', when: 'Whenever the safety case asserts a response time, and after any change to a delay, the valve air path, or the scan configuration.' },
  { id: 'tt-bypass', test: 'Bypass audit', what: 'Report every input and output in bypass, who authorized it, when it was applied, and whether it is still needed.', when: 'Continuously - and it is the test most plants have never run.' }
];
