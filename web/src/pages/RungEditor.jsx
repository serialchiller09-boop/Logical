import { useEffect, useMemo, useRef, useState } from 'react';
import { RungDiagram } from '../components/RungDiagram.jsx';
import { EDITOR_GEO } from '../lib/ladder.js';
import { useTitle } from '../lib/store.jsx';
import {
  EDITOR_BRANCH_LIMIT_TEXT,
  addInstruction,
  addParallelBranch,
  addRung,
  applyEditorScan,
  deleteInstruction,
  deleteLeg,
  deleteRung,
  imageFromBits,
  loadProgram,
  previewEditor,
  resetStoredProgram,
  saveProgram,
  setInstructionTag,
  tagRoles,
  validateProgram
} from '../lib/rungEditor.js';

const SCAN_MS = 500;

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

export default function RungEditor() {
  useTitle('Rung editor');
  const [program, setProgram] = useState(loadInitial);
  const [selection, setSelection] = useState(null);
  const [mode, setMode] = useState('edit');
  const [running, setRunning] = useState(false);
  const [scans, setScans] = useState(0);
  const [bits, setBits] = useState({});
  const [opError, setOpError] = useState(null);
  const [saveNote, setSaveNote] = useState(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [pendingFocus, setPendingFocus] = useState(null);
  const bitsRef = useRef(bits);
  const programRef = useRef(program);
  bitsRef.current = bits;
  programRef.current = program;

  const errors = useMemo(() => validateProgram(program), [program]);
  const roles = useMemo(() => tagRoles(program), [program]);
  const preview = useMemo(() => previewEditor(program, bits), [program, bits]);
  const live = mode === 'run' && errors.length === 0;
  const target = targetLabel(program, selection);

  useEffect(() => {
    const result = saveProgram(program, window.localStorage);
    setSaveNote(result.ok ? null : result.message);
  }, [program]);

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
      const state = imageFromBits(bitsRef.current);
      const res = applyEditorScan(current, state);
      if (!res.ok) {
        setRunning(false);
        return;
      }
      const nextBits = { ...state.bits };
      bitsRef.current = nextBits;
      setBits(nextBits);
      setScans((count) => count + 1);
    }, SCAN_MS);
    return () => clearInterval(id);
  }, [running]);

  function commitBits(next) {
    bitsRef.current = next;
    setBits(next);
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
    if (kind === 'OTE') {
      applyResult(addInstruction(program, { rungId: rung.id, kind: 'OTE' }));
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
    if (errors.length || running) return;
    const state = imageFromBits(bitsRef.current);
    const res = applyEditorScan(program, state);
    if (!res.ok) {
      setOpError(res.errors[0]?.message || 'This program cannot be scanned yet.');
      return;
    }
    commitBits({ ...state.bits });
    setScans((count) => count + 1);
  }

  function toggleInput(tag) {
    const next = { ...bitsRef.current, [tag]: bitsRef.current[tag] ? 0 : 1 };
    commitBits(next);
  }

  function resetProgram() {
    setRunning(false);
    setScans(0);
    commitBits({});
    setSelection(null);
    setOpError(null);
    setConfirmReset(false);
    setMode('edit');
    setProgram(resetStoredProgram(window.localStorage));
  }

  const branchOnTarget = selectionFor(program, selection).rung?.elements?.some((el) => el.kind === 'branch');

  return (
    <div className="re-page">
      <header className="re-hero">
        <h1>Rung editor</h1>
        <p>
          Write your own rungs with XIC, XIO, and OTE. The drawing and the scan use the same ladder engine as the lab.
          BOOL tags only.
        </p>
        <p className="re-limit">{EDITOR_BRANCH_LIMIT_TEXT}</p>
      </header>

      <div className="re-modes" role="tablist" aria-label="Editor mode">
        <button type="button" className="re-mode" role="tab" id="re-tab-edit" aria-selected={mode === 'edit'} aria-controls="re-panel" onClick={() => chooseMode('edit')}>Edit</button>
        <button type="button" className="re-mode" role="tab" id="re-tab-run" aria-selected={mode === 'run'} aria-controls="re-panel" onClick={() => chooseMode('run')}>Run</button>
      </div>

      <div role="tabpanel" id="re-panel" aria-labelledby={mode === 'edit' ? 're-tab-edit' : 're-tab-run'} className="re-panel">
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
              {' '}Continuous scan steps about twice a second in this browser. That is not a Logix task rate.
              Outputs change when you step or while Start is running. Orange wires show whether each rung would conduct with the bits as they are now.
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
              canDeleteRung={program.rungs.length > 1}
            />
          ))}
        </ol>

        {mode === 'run' && (
          <IoPanel
            roles={roles}
            bits={bits}
            onToggle={toggleInput}
          />
        )}

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
              Not simulated from that manual: OTE prescan and postscan both clear the data bit. This page leaves a bit where the last scan put it until you step again or press Reset.
            </p>
            <p>
              Editor limits, not Studio 5000 rules: {EDITOR_BRANCH_LIMIT_TEXT} Tag names are case-sensitive here. A name must start with a letter, then use letters, digits, or underscores, up to 40 characters. That spelling limit was not confirmed against Studio 5000 tag rules. 1756-RM003’s 40-character note is for JMP/LBL label names, which is a different thing. Timers, counters, and latches are not on this page.
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
  canDeleteRung
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

function InstructionRow({ rungNumber, instr, legIndex, selected, onSelect, onTag, onDelete }) {
  const where = legIndex == null ? `rung ${rungNumber}` : `rung ${rungNumber}, leg ${legIndex + 1}`;
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
          placeholder="BOOL tag"
          aria-label={`${instr.kind} tag name on ${where}`}
          onChange={(event) => onTag(instr.id, event.target.value)}
        />
      </label>
      <button type="button" className="btn" aria-label={`Delete ${instr.kind} ${instr.tag || 'blank tag'} on ${where}`} onClick={() => onDelete(instr.id)}>Delete</button>
    </li>
  );
}

function onRowKey(event, onDelete) {
  if (event.target !== event.currentTarget) return;
  if (event.key === 'Delete' || event.key === 'Backspace') {
    event.preventDefault();
    onDelete();
  }
}

function IoPanel({ roles, bits, onToggle }) {
  const bitOn = (tag) => !!bits[tag];
  return (
    <section className="card re-io-card" aria-label="Inputs and outputs">
      <div className="card-hd"><h2>Inputs and outputs</h2></div>
      <div className="card-bd">
        <h3>Inputs</h3>
        <p className="re-io-note">Tags an XIC or XIO reads, and no OTE writes. These switches are the only bits you force.</p>
        {roles.inputs.length === 0 ? <p className="re-empty">No input tags yet.</p> : (
          <div className="re-io">
            {roles.inputs.map((tag) => {
              const on = bitOn(tag);
              return (
                <div key={tag} className="re-io-cell">
                  <div className="re-io-tag">{tag}</div>
                  <button
                    type="button"
                    className={`re-toggle ${on ? 'is-on' : ''}`}
                    aria-pressed={on}
                    aria-label={`${tag} input, ${on ? 'on' : 'off'}`}
                    onClick={() => onToggle(tag)}
                  >
                    <span className="re-toggle-knob" aria-hidden="true" />
                    <span>{on ? 'On' : 'Off'}</span>
                  </button>
                </div>
              );
            })}
          </div>
        )}
        <h3>Outputs</h3>
        <p className="re-io-note">Written by OTE. A tag that is also read, such as a seal-in, stays here and is not a switch.</p>
        {roles.duplicateOutputs.length > 0 && (
          <p className="callout callout-warn">
            {roles.duplicateOutputs.join(', ')} {roles.duplicateOutputs.length === 1 ? 'is' : 'are'} written by more than one OTE.
            1756-RM003 says unexpected operation may occur if an output tag is overwritten. This page keeps the write from the lower rung.
          </p>
        )}
        {roles.outputs.length === 0 ? <p className="re-empty">No output tags yet.</p> : (
          <div className="re-io">
            {roles.outputs.map((tag) => {
              const on = bitOn(tag);
              return (
                <div key={tag} className="re-io-cell">
                  <div className="re-io-tag">{tag}</div>
                  <div className="re-lamp" role="status" aria-label={`${tag} output ${on ? 'on' : 'off'}`}>
                    <span className={`re-led ${on ? 'is-on' : ''}`} aria-hidden="true" />
                    <span>{on ? 'On' : 'Off'}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
