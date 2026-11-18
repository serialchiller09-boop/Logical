import { useEffect, useMemo, useRef, useState } from 'react';
import { RungDiagram } from '../components/RungDiagram.jsx';
import { EDITOR_GEO } from '../lib/ladder.js';
import { useTitle } from '../lib/store.jsx';
import {
  assignInputKey,
  inputKeyAction,
  isTextEntryTarget,
  nextInputBit,
  LED_COLORS,
  OUTPUT_VIEWS,
  formatOutputBit,
  normalizeLampColor,
  normalizeOutputView,
  outputViewLabel,
  panelPointsFromRoles,
  releaseMomentaryBits,
  resolveInputSetup,
  toggledBit
} from '../lib/ioSandbox.js';
import {
  EDITOR_BRANCH_LIMIT_TEXT,
  EDITOR_RUN_INTERVAL_MS,
  EDITOR_SCAN_MS,
  addInstruction,
  addParallelBranch,
  addRung,
  applyEditorScan,
  editStepControl,
  deleteInstruction,
  deleteLeg,
  deleteRung,
  imageFromBits,
  loadProgram,
  previewEditor,
  resetStoredProgram,
  saveProgram,
  setInstructionPreset,
  setInstructionTag,
  tagRoles,
  validateProgram
} from '../lib/rungEditor.js';

const OUTPUT_KINDS = new Set(['OTE', 'OTL', 'OTU', 'TON', 'TOF', 'CTU', 'RES']);
const MOMENTARY_NOTE = `A momentary input is seen only when a scan runs while it is held: Start scans every ${EDITOR_RUN_INTERVAL_MS} ms, and with Step you hold the button and press Step.`;

function loadInitial() {
  if (typeof window === 'undefined') return loadProgram(null);
  return loadProgram(window.localStorage);
}

function selectionFor(program, selection) {
  const rung = program.rungs.find((item) => item.id === selection?.rungId) || program.rungs[0];
  if (!rung) return { rung: null, selection: null };
  if (!selection || selection.rungId !== rung.id) {
    return { rung, selection: { rungId: rung.id, elementId: null, place: 'rung', legIndex: null } };
  }
  return { rung, selection };
}

function targetLabel(program, selection) {
  const { rung, selection: sel } = selectionFor(program, selection);
  if (!rung) return 'no rung';
  const number = program.rungs.findIndex((item) => item.id === rung.id) + 1;
  if (sel.place === 'leg' && sel.legIndex != null) return `rung ${number}, leg ${sel.legIndex + 1}`;
  return `rung ${number}`;
}

export default function RungEditor({
  controlledProgram = null,
  onProgramChange = null,
  seedProgram = null,
  pinned = null,
  hideIntro = false,
  header = null,
  title = null
} = {}) {
  useTitle(title || (hideIntro ? null : 'Rung editor'));
  const controlled = typeof onProgramChange === 'function';
  const [program, setProgramState] = useState(() => controlledProgram || loadInitial());
  function setProgram(next) {
    setProgramState(next);
    if (controlled) onProgramChange(next);
  }
  const [selection, setSelection] = useState(null);
  const [mode, setMode] = useState('edit');
  const [running, setRunning] = useState(false);
  const [scans, setScans] = useState(0);
  const [opError, setOpError] = useState(null);
  const [saveNote, setSaveNote] = useState(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [pendingFocus, setPendingFocus] = useState(null);
  const [scanRev, setScanRev] = useState(0);
  const stateRef = useRef(null);
  if (!stateRef.current) stateRef.current = imageFromBits({});
  const programRef = useRef(program);
  programRef.current = program;

  const errors = useMemo(() => validateProgram(program), [program]);
  const scanControl = useMemo(() => editStepControl(errors), [errors]);
  const points = useMemo(() => panelPointsFromRoles(tagRoles(program), pinned), [program, pinned]);
  const [inputModes, setInputModes] = useState({});
  const [customKeys, setCustomKeys] = useState({});
  const [captureTag, setCaptureTag] = useState(null);
  const [outputViews, setOutputViews] = useState({});
  const [outputColors, setOutputColors] = useState({});
  const inputTags = useMemo(() => points.inputs.map((point) => point.tag), [points]);
  const inputSetup = useMemo(() => resolveInputSetup(inputTags, inputModes, customKeys), [inputTags, inputModes, customKeys]);
  const setupRef = useRef(inputSetup);
  setupRef.current = inputSetup;
  const captureRef = useRef(captureTag);
  captureRef.current = captureTag;
  const [ioOpen, setIoOpen] = useState(() => {
    if (typeof window === 'undefined') return true;
    return window.matchMedia('(min-width: 421px)').matches;
  });
  const preview = useMemo(() => previewEditor(program, stateRef.current), [program, scanRev]);
  const live = mode === 'run' && errors.length === 0;
  const target = targetLabel(program, selection);

  useEffect(() => {
    if (controlled) return;
    const result = saveProgram(program, window.localStorage);
    setSaveNote(result.ok ? null : result.message);
  }, [program, controlled]);

  useEffect(() => {
    if (!pendingFocus) return;
    const el = document.getElementById(`re-tag-${pendingFocus}`);
    el?.focus();
    setPendingFocus(null);
  }, [pendingFocus, program]);

  useEffect(() => {
    if (!running) return undefined;
    const id = setInterval(() => {
      const current = programRef.current;
      const problems = validateProgram(current);
      if (problems.length) {
        setRunning(false);
        return;
      }
      const state = stateRef.current;
      state.dt = EDITOR_SCAN_MS;
      const res = applyEditorScan(current, state);
      if (!res.ok) {
        setRunning(false);
        return;
      }
      setScanRev((n) => n + 1);
      setScans((count) => count + 1);
    }, EDITOR_RUN_INTERVAL_MS);
    return () => clearInterval(id);
  }, [running]);

  function bumpScan() {
    setScanRev((n) => n + 1);
  }

  function applyResult(result) {
    if (!result.ok) {
      setOpError(result.error.message);
      return;
    }
    setOpError(null);
    setRunning(false);
    setProgram(result.program);
    if (result.selection) setSelection(result.selection);
    if (result.focusId) setPendingFocus(result.focusId);
  }

  function chooseMode(next) {
    if (next === 'edit') setRunning(false);
    setMode(next);
    setConfirmReset(false);
  }

  function onAdd(kind) {
    const { rung, selection: sel } = selectionFor(program, selection);
    if (!rung) return;
    if (OUTPUT_KINDS.has(kind)) {
      applyResult(addInstruction(program, { rungId: rung.id, kind }));
      return;
    }
    if (sel.place === 'leg' && sel.legIndex != null) {
      applyResult(addInstruction(program, {
        rungId: rung.id,
        kind,
        place: 'leg',
        legIndex: sel.legIndex,
        afterId: sel.elementId
      }));
      return;
    }
    applyResult(addInstruction(program, {
      rungId: rung.id,
      kind,
      place: 'series',
      afterId: sel.place === 'series' ? sel.elementId : null
    }));
  }

  function onBranch() {
    const { rung, selection: sel } = selectionFor(program, selection);
    if (!rung) return;
    const branch = rung.elements.find((el) => el.kind === 'branch');
    if (branch) {
      applyResult(addParallelBranch(program, { rungId: rung.id, elementId: branch.id, addLeg: true }));
      return;
    }
    applyResult(addParallelBranch(program, {
      rungId: rung.id,
      elementId: sel.place === 'series' ? sel.elementId : null
    }));
  }

  function stepOnce() {
    if (editStepControl(errors).disabled || running) return;
    const state = stateRef.current;
    state.dt = EDITOR_SCAN_MS;
    const res = applyEditorScan(program, state);
    if (!res.ok) {
      setOpError(res.errors[0]?.message || 'This program cannot be scanned yet.');
      return;
    }
    bumpScan();
    setScans((count) => count + 1);
  }

  function setInputBit(tag, value) {
    stateRef.current.bits[tag] = value ? 1 : 0;
    bumpScan();
  }

  function toggleInput(tag) {
    setInputBit(tag, toggledBit(stateRef.current.bits, tag));
  }

  function chooseInputMode(tag, type) {
    setInputModes((current) => ({ ...current, [tag]: type === 'pb' ? 'pb' : 'switch' }));
    setInputBit(tag, 0);
  }

  useEffect(() => {
    const onKey = (event) => {
      const waiting = captureRef.current;
      if (waiting) {
        if (event.type !== 'keydown' || event.repeat) return;
        if (event.ctrlKey || event.metaKey || event.altKey || event.shiftKey) return;
        if (isTextEntryTarget(event.target)) return;
        if (event.key === 'Escape') {
          event.preventDefault();
          setCaptureTag(null);
          return;
        }
        const assigned = assignInputKey(customKeys, waiting, event.key);
        if (!assigned.ok) return;
        event.preventDefault();
        setCustomKeys(assigned.bindings);
        setCaptureTag(null);
        return;
      }
      const action = inputKeyAction(event, setupRef.current);
      if (!action) return;
      event.preventDefault();
      setInputBit(action.tag, nextInputBit(stateRef.current.bits, action));
    };
    const onBlur = () => {
      const setup = setupRef.current;
      const released = releaseMomentaryBits(stateRef.current.bits, setup.modes);
      if (released === stateRef.current.bits) return;
      stateRef.current.bits = released;
      bumpScan();
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('keyup', onKey);
    window.addEventListener('blur', onBlur);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('keyup', onKey);
      window.removeEventListener('blur', onBlur);
    };
  }, [customKeys]);

  function resetProgram() {
    setRunning(false);
    setScans(0);
    stateRef.current = imageFromBits({});
    bumpScan();
    setSelection(null);
    setOpError(null);
    setConfirmReset(false);
    setMode('edit');
    if (seedProgram) {
      setProgram(structuredClone(seedProgram));
      onReset?.();
      return;
    }
    if (controlled) {
      onReset?.();
      return;
    }
    setProgram(resetStoredProgram(window.localStorage));
  }

  const branchOnTarget = selectionFor(program, selection).rung?.elements?.some((el) => el.kind === 'branch');

  return (
    <div className="re-page">
      {header}
      {hideIntro ? (
        <p className="re-limit">{EDITOR_BRANCH_LIMIT_TEXT}</p>
      ) : (
      <header className="re-hero">
        <h1>Rung editor</h1>
        <p>
          Write rungs with XIC, XIO, OTE, OTL, OTU, TON, TOF, CTU, and RES. The drawing and the scan use the same ladder engine as the lab.
        </p>
        <p className="re-limit">{EDITOR_BRANCH_LIMIT_TEXT}</p>
        <p><a href="/exercises">Graded exercises</a> check a program by what the outputs do.</p>
      </header>
      )}

      <div className="re-modes" role="tablist" aria-label="Editor mode">
        <button type="button" className="re-mode" role="tab" id="re-tab-edit" aria-selected={mode === 'edit'} aria-controls="re-panel" onClick={() => chooseMode('edit')}>Edit</button>
        <button type="button" className="re-mode" role="tab" id="re-tab-run" aria-selected={mode === 'run'} aria-controls="re-panel" onClick={() => chooseMode('run')}>Run</button>
      </div>

      <div role="tabpanel" id="re-panel" aria-labelledby={mode === 'edit' ? 're-tab-edit' : 're-tab-run'} className="re-panel">
        <IoPanel
          points={points}
          bits={stateRef.current.bits}
          setup={inputSetup}
          captureTag={captureTag}
          onToggle={toggleInput}
          onPress={(tag) => setInputBit(tag, 1)}
          onRelease={(tag) => setInputBit(tag, 0)}
          onMode={chooseInputMode}
          onCapture={setCaptureTag}
          mode={mode}
          open={ioOpen}
          onOpenChange={setIoOpen}
          onStep={stepOnce}
          scanDisabled={scanControl.disabled}
          scanReason={scanControl.reason}
          momentaryNote={MOMENTARY_NOTE}
          outputViews={outputViews}
          outputColors={outputColors}
          onOutputView={(tag, view) => setOutputViews((current) => ({ ...current, [tag]: normalizeOutputView(view) }))}
          onOutputColor={(tag, color) => setOutputColors((current) => ({ ...current, [tag]: normalizeLampColor(color) }))}
        />
        {mode === 'edit' && (
          <div className="re-palette" role="group" aria-label="Add instructions">
            <p className="re-adding">
              Adding to {target}. Tab to a button and press Enter. Tab to an instruction and press Delete to remove it.
              {selectionFor(program, selection).selection?.place === 'leg'
                ? ' Contacts you add go on this leg. Select the rung to put the next instruction on the main line, after the branch.'
                : ' Contacts you add go on the main line. Select a leg to add a contact on that leg.'}
            </p>
            <div className="re-palette-row">
              <button type="button" className="btn" aria-label="Add XIC" onClick={() => onAdd('XIC')}>Add XIC</button>
              <button type="button" className="btn" aria-label="Add XIO" onClick={() => onAdd('XIO')}>Add XIO</button>
              <button type="button" className="btn" aria-label="Add OTE" onClick={() => onAdd('OTE')}>Add OTE</button>
              <button type="button" className="btn" aria-label="Add OTL" onClick={() => onAdd('OTL')}>Add OTL</button>
              <button type="button" className="btn" aria-label="Add OTU" onClick={() => onAdd('OTU')}>Add OTU</button>
              <button type="button" className="btn" aria-label="Add TON" onClick={() => onAdd('TON')}>Add TON</button>
              <button type="button" className="btn" aria-label="Add TOF" onClick={() => onAdd('TOF')}>Add TOF</button>
              <button type="button" className="btn" aria-label="Add CTU" onClick={() => onAdd('CTU')}>Add CTU</button>
              <button type="button" className="btn" aria-label="Add RES" onClick={() => onAdd('RES')}>Add RES</button>
              <button type="button" className="btn" aria-label={branchOnTarget ? 'Add parallel leg' : 'Add parallel branch'} onClick={onBranch}>
                {branchOnTarget ? 'Add parallel leg' : 'Add parallel branch'}
              </button>
              <button type="button" className="btn" aria-label="Add rung" onClick={() => applyResult(addRung(program, { afterRungId: selectionFor(program, selection).rung?.id }))}>Add rung</button>
            </div>
          </div>
        )}

        {mode === 'run' && (
          <div className="re-runbar">
            <div className="re-palette-row">
              <button type="button" className="btn btn-primary" aria-label="Start continuous scan" disabled={running || errors.length > 0} onClick={() => setRunning(true)}>Start</button>
              <button type="button" className="btn" aria-label="Stop continuous scan" disabled={!running} onClick={() => setRunning(false)}>Stop</button>
              <button type="button" className="btn" aria-label="Step one scan" disabled={running || errors.length > 0} onClick={stepOnce}>Step one scan</button>
            </div>
            <p className="re-scan-status" role="status">
              Scan {scans}. {running ? 'Running' : 'Stopped'}.
              {' '}Each step adds {EDITOR_SCAN_MS} ms, including while Start is running.
              {' '}1756-RM003 adds the time since a timer was last scanned. This page uses {EDITOR_SCAN_MS} ms for that elapsed time. It is not a Logix task period.
            </p>
          </div>
        )}

        {opError && <div className="callout callout-bad" role="alert">{opError}</div>}
        {saveNote && <div className="callout callout-warn" role="status">{saveNote}</div>}

        <div id="re-problems" aria-live="polite">
          {errors.length === 0 ? (
            <p className="re-ok">No problems. This program can be scanned.</p>
          ) : (
            <div className="callout callout-warn">
              <h2>Fix these before a scan</h2>
              <ul>
                {errors.map((err, index) => <li key={`${err.code}-${err.elementId || err.rungId}-${index}`}>{err.message}</li>)}
              </ul>
            </div>
          )}
        </div>

        <ol className="re-rungs">
          {program.rungs.map((rung, index) => (
            <RungCard
              key={rung.id}
              rung={rung}
              number={index + 1}
              total={program.rungs.length}
              ladder={preview.ladders[index]}
              map={preview.maps[index]}
              live={live}
              mode={mode}
              selection={selection?.rungId === rung.id ? selection : null}
              onSelect={setSelection}
              onTag={(elementId, tag) => applyResult(setInstructionTag(program, { rungId: rung.id, elementId, tag }))}
              onDelete={(elementId) => applyResult(deleteInstruction(program, { rungId: rung.id, elementId }))}
              onDeleteLeg={(branchId, legIndex) => applyResult(deleteLeg(program, { rungId: rung.id, branchId, legIndex }))}
              onDeleteRung={() => applyResult(deleteRung(program, rung.id))}
              onPreset={(elementId, pre) => applyResult(setInstructionPreset(program, { rungId: rung.id, elementId, pre }))}
              canDeleteRung={program.rungs.length > 1}
              scanState={stateRef.current}
            />
          ))}
        </ol>

        <div className="re-reset">
          {confirmReset ? (
            <div className="callout callout-warn">
              <p>Reset clears the saved rungs in this browser and the bits from the last scan.</p>
              <div className="re-palette-row">
                <button type="button" className="btn" onClick={() => setConfirmReset(false)}>Cancel</button>
                <button type="button" className="btn btn-primary" aria-label="Confirm reset program" onClick={resetProgram}>Reset program</button>
              </div>
            </div>
          ) : (
            <button type="button" className="btn" aria-label="Reset program" onClick={() => setConfirmReset(true)}>Reset</button>
          )}
        </div>

        <details className="re-rules">
          <summary>Scan rules cited from 1756-RM003, and what this page does not do</summary>
          <div className="re-rules-body">
            <p>
              XIC, XIO, and OTE on this page follow Rockwell Automation publication 1756-RM003,
              Logix 5000 Controllers General Instructions Reference Manual (1756-RM003T-EN-P, November 2018).
            </p>
            <ul>
              <li>XIC (Examine If Closed) tests a BOOL. When rung-condition-in is true, rung-condition-out is true if the bit is 1 and false if the bit is 0. When rung-condition-in is false, rung-condition-out stays false.</li>
              <li>XIO (Examine If Open) tests a BOOL. When rung-condition-in is true, rung-condition-out is true if the bit is 0 and false if the bit is 1. When rung-condition-in is false, rung-condition-out stays false.</li>
              <li>OTE (Output Energize) writes that rung-condition-in into the BOOL every time it is scanned: 1 when the rung in front of it is true, 0 when it is false. Rung-condition-out equals rung-condition-in.</li>
              <li>The same manual says unexpected operation may occur if an output tag is overwritten. This page scans rungs from the top of the list downward, and each rung from left to right. When two OTE instructions use the same tag, the lower rung’s write is the value that remains.</li>
            </ul>
            <p>
              Not simulated from that manual: OTE prescan and postscan both clear the data bit. TON and TOF postscan, and the TON/TOF flow-chart pause that forces .DN, are not simulated. Counter .OV past 2,147,483,647 is not simulated. A timer here adds {EDITOR_SCAN_MS} ms per step instead of a controller's wall-clock delta. CTU prescan is simulated: the first scan after a fresh start or Reset sets .CU true, so an input that is already on does not count until it goes false and then true.
            </p>
            <ul>
              <li>OTL (Output Latch) sets the BOOL when rung-condition-in is true and leaves it unchanged when rung-condition-in is false.</li>
              <li>OTU (Output Unlatch) clears the BOOL when rung-condition-in is true and leaves it unchanged when rung-condition-in is false.</li>
              <li>TON (Timer On Delay) accumulates while the rung is true. .DN is true when .ACC reaches .PRE. A false rung clears .ACC, .EN, .TT, and .DN. Time base is 1 ms.</li>
              <li>TOF (Timer Off Delay): a true rung sets .EN and .DN and clears .ACC and .TT. A false rung accumulates. .DN stays true until .ACC reaches .PRE, then .DN clears. Prescan sets .ACC equal to .PRE and clears .EN, .TT, and .DN.</li>
              <li>CTU (Count Up) adds one to .ACC only when the rung goes from false to true. .DN is true when .ACC is at least .PRE. Holding the rung true does not count again.</li>
              <li>RES (Reset), when the rung is true, clears a TIMER or COUNTER .ACC and its control bits. A false rung does not.</li>
              <li>XIC and XIO may read .DN, .EN, .TT, or .CU on the tag those instructions use.</li>
            </ul>
            <p>
              Editor limits, not Studio 5000 rules: {EDITOR_BRANCH_LIMIT_TEXT} Tag names are case-sensitive here. A name must start with a letter, then use letters, digits, or underscores, up to 40 characters. That spelling limit was not confirmed against Studio 5000 tag rules. 1756-RM003’s 40-character note is for JMP/LBL label names, which is a different thing.
            </p>
            <p>This is a teaching scan in the browser, not a controller, and not plant I/O.</p>
          </div>
        </details>
      </div>
    </div>
  );
}

function RungCard({
  rung,
  number,
  total,
  ladder,
  map,
  live,
  mode,
  selection,
  onSelect,
  onTag,
  onDelete,
  onDeleteLeg,
  onDeleteRung,
  onPreset,
  canDeleteRung,
  scanState
}) {
  const selectedRung = selection?.place === 'rung';
  const [confirming, setConfirming] = useState(false);
  const clearLabel = canDeleteRung ? 'Delete rung' : 'Clear rung';
  return (
    <li className="card re-rung">
      <div className="card-hd re-rung-hd">
        <h2>Rung {number}</h2>
        <span className="hd-note">{number} of {total}</span>
        <button
          type="button"
          className={`btn re-rung-select ${selectedRung ? 'btn-on' : ''}`}
          aria-pressed={!!selectedRung}
          aria-label={`Select rung ${number}`}
          onClick={() => onSelect({ rungId: rung.id, elementId: null, place: 'rung', legIndex: null })}
        >
          Select rung
        </button>
        {confirming ? (
          <>
            <button type="button" className="btn" aria-label={`Cancel ${clearLabel.toLowerCase()} ${number}`} onClick={() => setConfirming(false)}>Cancel</button>
            <button type="button" className="btn" aria-label={`Confirm ${clearLabel.toLowerCase()} ${number}`} onClick={() => { setConfirming(false); onDeleteRung(); }}>{clearLabel}</button>
          </>
        ) : (
          <button
            type="button"
            className="btn"
            aria-label={`${clearLabel} ${number}`}
            onClick={() => setConfirming(true)}
          >
            {clearLabel}
          </button>
        )}
      </div>
      <div className="card-bd">
        <div className="re-canvas">
            <RungDiagram ladder={ladder} map={live ? map : null} live={live} fit geo={EDITOR_GEO} />
          </div>
          {mode === 'run' && <Faceplate rung={rung} scanState={scanState} onPreset={onPreset} />}
        {mode === 'edit' && (
          rung.elements.length === 0 ? (
            <p className="re-empty">This rung is empty. Add an XIC, an XIO, or an OTE.</p>
          ) : (
            <ol className="re-elements">
              {rung.elements.map((el) => (
                el.kind === 'branch' ? (
                  <BranchBlock
                    key={el.id}
                    rung={rung}
                    number={number}
                    branch={el}
                    selection={selection}
                    onSelect={onSelect}
                    onTag={onTag}
                    onDelete={onDelete}
                    onDeleteLeg={onDeleteLeg}
                  />
                ) : (
                  <InstructionRow
                    key={el.id}
                    rungNumber={number}
                    instr={el}
                    selected={selection?.elementId === el.id}
                    onSelect={() => onSelect({ rungId: rung.id, elementId: el.id, place: 'series', legIndex: null })}
                    onTag={onTag}
                    onPreset={onPreset}
                    onDelete={onDelete}
                  />
                )
              ))}
            </ol>
          )
        )}
      </div>
    </li>
  );
}

function BranchBlock({ rung, number, branch, selection, onSelect, onTag, onDelete, onDeleteLeg }) {
  const selected = selection?.elementId === branch.id && selection?.place === 'series';
  return (
    <li
      className={`re-branch ${selected ? 'is-selected' : ''}`}
      tabIndex={0}
      onFocus={(event) => {
        if (event.target === event.currentTarget) {
          onSelect({ rungId: rung.id, elementId: branch.id, place: 'series', legIndex: null });
        }
      }}
      onKeyDown={(event) => onRowKey(event, () => onDelete(branch.id))}
    >
      <div className="re-branch-hd">
        <span>Parallel branch</span>
        <button type="button" className="btn" aria-label={`Delete parallel branch on rung ${number}`} onClick={() => onDelete(branch.id)}>Delete branch</button>
      </div>
      {branch.legs.map((leg, legIndex) => {
        const legSelected = selection?.place === 'leg' && selection?.legIndex === legIndex && !selection?.elementId;
        return (
          <div key={`${branch.id}-leg-${legIndex}`} className={`re-leg ${legSelected ? 'is-selected' : ''}`}>
            <div className="re-leg-hd">
              <button
                type="button"
                className={`btn re-leg-select ${legSelected ? 'btn-on' : ''}`}
                aria-pressed={legSelected}
                aria-label={`Select leg ${legIndex + 1} on rung ${number}`}
                onFocus={() => onSelect({ rungId: rung.id, elementId: null, place: 'leg', legIndex })}
                onClick={() => onSelect({ rungId: rung.id, elementId: null, place: 'leg', legIndex })}
              >
                Leg {legIndex + 1}
              </button>
              <button type="button" className="btn" aria-label={`Delete leg ${legIndex + 1} on rung ${number}`} onClick={() => onDeleteLeg(branch.id, legIndex)}>Delete leg</button>
            </div>
            {leg.length === 0 ? (
              <p className="re-empty">No contact on this leg yet. Select the leg, then add an XIC or XIO.</p>
            ) : (
              <ol className="re-elements">
                {leg.map((instr) => (
                  <InstructionRow
                    key={instr.id}
                    rungNumber={number}
                    instr={instr}
                    legIndex={legIndex}
                    selected={selection?.elementId === instr.id}
                    onSelect={() => onSelect({ rungId: rung.id, elementId: instr.id, place: 'leg', legIndex })}
                    onTag={onTag}
                    onDelete={onDelete}
                  />
                ))}
              </ol>
            )}
          </div>
        );
      })}
    </li>
  );
}

function InstructionRow({ rungNumber, instr, legIndex, selected, onSelect, onTag, onPreset, onDelete }) {
  const where = legIndex == null ? `rung ${rungNumber}` : `rung ${rungNumber}, leg ${legIndex + 1}`;
  const hasPreset = instr.kind === 'TON' || instr.kind === 'TOF' || instr.kind === 'CTU';
  const presetUnit = instr.kind === 'CTU' ? 'count' : 'ms';
  return (
    <li
      className={`re-instr ${selected ? 'is-selected' : ''}`}
      tabIndex={0}
      onFocusCapture={onSelect}
      onKeyDown={(event) => onRowKey(event, () => onDelete(instr.id))}
    >
      <span className="re-kind">{instr.kind}</span>
      <label className="re-tag">
        <span className="re-tag-name">Tag</span>
        <input
          id={`re-tag-${instr.id}`}
          type="text"
          value={instr.tag}
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          placeholder={hasPreset ? 'timer or counter tag' : 'tag'}
          aria-label={`${instr.kind} tag name on ${where}`}
          onChange={(event) => onTag(instr.id, event.target.value)}
        />
      </label>
      {hasPreset && (
        <label className="re-tag">
          <span className="re-tag-name">PRE {presetUnit}</span>
          <input
            type="number"
            min="0"
            step="1"
            inputMode="numeric"
            value={instr.pre ?? ''}
            aria-label={`${instr.kind} preset on ${where}`}
            onChange={(event) => onPreset(instr.id, event.target.value === '' ? '' : Number(event.target.value))}
          />
        </label>
      )}
      <button type="button" className="btn" aria-label={`Delete ${instr.kind} ${instr.tag || 'blank tag'} on ${where}`} onClick={() => onDelete(instr.id)}>Delete</button>
    </li>
  );
}

function Faceplate({ rung, scanState, onPreset }) {
  const blocks = (rung.elements || []).filter((el) => el.kind === 'TON' || el.kind === 'TOF' || el.kind === 'CTU');
  if (!blocks.length) return null;
  return (
    <div className="re-faceplate">
      {blocks.map((instr) => {
        const store = instr.kind === 'CTU' ? scanState?.counters?.[instr.tag] : scanState?.timers?.[instr.tag];
        const acc = store?.acc ?? 0;
        const bits = instr.kind === 'CTU'
          ? `CU ${store?.cu ? '1' : '0'} · DN ${store?.dn ? '1' : '0'}`
          : `EN ${store?.en ? '1' : '0'} · TT ${store?.running ? '1' : '0'} · DN ${store?.dn ? '1' : '0'}`;
        const unit = instr.kind === 'CTU' ? '' : ' ms';
        const text = `ACC ${acc}${unit} · ${bits}`;
        return (
          <div key={instr.id} className="re-face" role="status" aria-label={`${instr.kind} ${instr.tag || 'blank'} ${text}`}>
            <div>{instr.kind} {instr.tag || 'tag'}</div>
            <div>{text}</div>
            <label className="re-tag">
              <span className="re-tag-name">PRE {instr.kind === 'CTU' ? 'count' : 'ms'}</span>
              <input
                type="number"
                min="0"
                step="1"
                inputMode="numeric"
                value={instr.pre ?? ''}
                aria-label={`PRE for ${instr.kind} ${instr.tag || 'blank'}`}
                onChange={(event) => onPreset(instr.id, event.target.value === '' ? '' : Number(event.target.value))}
              />
            </label>
          </div>
        );
      })}
    </div>
  );
}

function onRowKey(event, onDelete) {
  if (event.target !== event.currentTarget) return;
  if (event.key === 'Delete' || event.key === 'Backspace') {
    event.preventDefault();
    onDelete();
  }
}

function InputCell({ tag, on, kind, binding, capturing, onToggle, onPress, onRelease, onMode, onCapture }) {
  const momentary = kind === 'pb';
  const keyText = binding || 'none';
  const hold = (event) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    event.preventDefault();
    try { event.currentTarget.setPointerCapture(event.pointerId); } catch { /* already released */ }
    onPress(tag);
  };
  const drop = () => onRelease(tag);
  return (
    <div className="re-io-cell">
      <div className="re-io-tag">{tag}</div>
      <div className="re-io-kinds" role="group" aria-label={`${tag} input type`}>
        <button
          type="button"
          className={`btn ${momentary ? '' : 'btn-on'}`}
          aria-pressed={!momentary}
          aria-label={`${tag} maintained switch`}
          onClick={() => onMode(tag, 'switch')}
        >
          Switch
        </button>
        <button
          type="button"
          className={`btn ${momentary ? 'btn-on' : ''}`}
          aria-pressed={momentary}
          aria-label={`${tag} momentary pushbutton`}
          onClick={() => onMode(tag, 'pb')}
        >
          PB
        </button>
      </div>
      {momentary ? (
        <button
          type="button"
          className={`re-toggle re-pb ${on ? 'is-on' : ''}`}
          aria-pressed={on}
          aria-label={`${tag} momentary pushbutton, key ${keyText}, ${on ? 'on' : 'off'}`}
          onPointerDown={hold}
          onPointerUp={drop}
          onPointerCancel={drop}
          onPointerLeave={drop}
          onKeyDown={(event) => {
            if (event.repeat) return;
            if (event.key !== ' ' && event.key !== 'Enter') return;
            event.preventDefault();
            onPress(tag);
          }}
          onKeyUp={(event) => {
            if (event.key !== ' ' && event.key !== 'Enter') return;
            event.preventDefault();
            onRelease(tag);
          }}
        >
          <span className="re-toggle-knob" aria-hidden="true" />
          <span>{on ? 'On' : 'Off'}</span>
          <span className="re-keycap" aria-hidden="true">{keyText}</span>
        </button>
      ) : (
        <button
          type="button"
          className={`re-toggle ${on ? 'is-on' : ''}`}
          aria-pressed={on}
          aria-label={`${tag} maintained switch, key ${keyText}, ${on ? 'on' : 'off'}`}
          onClick={() => onToggle(tag)}
        >
          <span className="re-toggle-knob" aria-hidden="true" />
          <span>{on ? 'On' : 'Off'}</span>
          <span className="re-keycap" aria-hidden="true">{keyText}</span>
        </button>
      )}
      <button
        type="button"
        className="btn"
        aria-label={capturing ? `Press a letter or digit for ${tag}` : `Key ${keyText} for ${tag}. Change key.`}
        aria-pressed={capturing}
        onClick={() => onCapture(capturing ? null : tag)}
      >
        {capturing ? 'Press a key' : `Key ${keyText}`}
      </button>
    </div>
  );
}

function OutputCell({ tag, bit, view, color, onView, onColor }) {
  const shown = formatOutputBit(bit, view);
  const lamp = shown.view === 'lamp';
  return (
    <div className="re-io-cell">
      <div className="re-io-tag">{tag}</div>
      <div className="re-io-kinds" role="group" aria-label={`${tag} output view`}>
        {OUTPUT_VIEWS.map((id) => (
          <button
            key={id}
            type="button"
            className={`btn ${shown.view === id ? 'btn-on' : ''}`}
            aria-pressed={shown.view === id}
            aria-label={`${tag} ${outputViewLabel(id)} view`}
            onClick={() => onView(tag, id)}
          >
            {outputViewLabel(id)}
          </button>
        ))}
      </div>
      {lamp && (
        <div className="re-io-kinds" role="group" aria-label={`${tag} lamp color`}>
          {LED_COLORS.map((name) => (
            <button
              key={name}
              type="button"
              className={`btn ${color === name ? 'btn-on' : ''}`}
              aria-pressed={color === name}
              aria-label={`${tag} lamp color ${name}`}
              onClick={() => onColor(tag, name)}
            >
              {name}
            </button>
          ))}
        </div>
      )}
      <div
        className={`re-lamp ${lamp && bit ? `is-${color}` : ''}`}
        role="status"
        aria-label={lamp ? `${tag} lamp ${color}, ${shown.text}` : `${tag} ${outputViewLabel(shown.view)} ${shown.text}`}
      >
        {lamp && <span className={`re-led is-${color} ${bit ? 'is-on' : ''}`} aria-hidden="true" />}
        <span className="re-out-value">{shown.text}</span>
        {!lamp && <span className="re-out-style">{outputViewLabel(shown.view)}</span>}
      </div>
    </div>
  );
}

function IoPanel({
  points, bits, setup, captureTag, onToggle, onPress, onRelease, onMode, onCapture,
  mode, open, onOpenChange, onStep, scanDisabled, scanReason, momentaryNote,
  outputViews, outputColors, onOutputView, onOutputColor
}) {
  const bitOn = (tag) => !!bits[tag];
  const inputNote = mode === 'run'
    ? 'Press Step one scan, or Start, on this tab. The input itself does not scan.'
    : 'Press Step one scan, beside the switches, to update the lamps. The input itself does not scan.';
  return (
    <details className="card re-io-card" open={open} onToggle={(event) => onOpenChange(event.currentTarget.open)}>
      <summary className="card-hd">
        <h2>Inputs and outputs</h2>
      </summary>
      <div className="card-bd">
        <h3>Inputs</h3>
        <p className="re-io-note">{inputNote}</p>
        <p className="re-io-note">{momentaryNote}</p>
        <div className="re-io-row">
          {points.inputs.length === 0 ? <p className="re-empty">No input tags yet.</p> : (
            <div className="re-io">
              {points.inputs.map((point) => (
                <InputCell
                  key={point.tag}
                  tag={point.tag}
                  on={bitOn(point.tag)}
                  kind={setup.modes[point.tag] === 'pb' ? 'pb' : 'switch'}
                  binding={setup.bindings[point.tag] || ''}
                  capturing={captureTag === point.tag}
                  onToggle={onToggle}
                  onPress={onPress}
                  onRelease={onRelease}
                  onMode={onMode}
                  onCapture={onCapture}
                />
              ))}
            </div>
          )}
          {mode === 'edit' && (
            <div className="re-io-step">
              <button
                type="button"
                className="btn"
                aria-label="Step one scan"
                aria-describedby={scanDisabled ? 're-edit-step-reason' : undefined}
                disabled={scanDisabled}
                onClick={onStep}
              >
                Step one scan
              </button>
              {scanDisabled && <p id="re-edit-step-reason" className="re-io-reason" role="status">{scanReason}</p>}
            </div>
          )}
        </div>
        <h3>Outputs</h3>
        <p className="re-io-note">
          Indicator for a tag an output writes. Lamp, decimal, hex, and binary show the same BOOL, 0 or 1. A seal-in stays here and is not a switch. This is not a Logix DINT or REAL display.
        </p>
        {points.duplicateOutputs.length > 0 && (
          <p className="callout callout-warn">
            {points.duplicateOutputs.join(', ')} {points.duplicateOutputs.length === 1 ? 'is' : 'are'} written by more than one output.
            1756-RM003 says unexpected operation may occur if an output tag is overwritten. This page keeps the write from the lower rung.
          </p>
        )}
        {points.outputs.length === 0 ? <p className="re-empty">No output tags yet.</p> : (
          <div className="re-io">
            {points.outputs.map((point) => (
              <OutputCell
                key={point.tag}
                tag={point.tag}
                bit={bitOn(point.tag)}
                view={outputViews[point.tag]}
                color={normalizeLampColor(outputColors[point.tag])}
                onView={onOutputView}
                onColor={onOutputColor}
              />
            ))}
          </div>
        )}
      </div>
    </details>
  );
}
