import { useMemo, useState } from 'react';

/* Only definitional arithmetic lives here. No plant numbers, no setpoints, no "typical" values. */

function Num({ label, value, onChange, unit, step = 'any', hint }) {
  return (
    <label className="field">
      <span className="label">{label}{unit ? ` (${unit})` : ''}</span>
      <input className="search-input" style={{ maxWidth: 190 }} type="number" step={step} value={value}
        onChange={(e) => onChange(e.target.value)} />
      {hint && <span className="tiny muted">{hint}</span>}
    </label>
  );
}

export function Readout({ label, value, sub, mono = true }) {
  return (
    <div className="io-cell" style={{ display: 'block', padding: '10px 12px' }}>
      <div className="io-addr">{label}</div>
      <div className={mono ? 'mono big' : 'big'} style={{ fontSize: 22, fontWeight: 700, color: 'var(--accent)', lineHeight: 1.25 }}>{value}</div>
      {sub && <div className="tiny muted">{sub}</div>}
    </div>
  );
}

function CalcShell({ title, status = 'standard', formula, caveat, children, results }) {
  return (
    <div className="card">
      <div className="card-hd">
        <h3>{title}</h3>
        <span className={`st st-${status}`} title={status === 'standard' ? 'Definitional arithmetic only' : 'Assumptions apply — read the note'}>
          {status === 'standard' ? 'definitional' : 'assumptions'}
        </span>
      </div>
      <div className="card-bd">
        <div className="calc-grid">
          <div className="stack" style={{ gap: 10 }}>{children}</div>
          <div className="stack" style={{ gap: 10 }}>
            <div className="row" style={{ flexWrap: 'wrap', gap: 9 }}>{results}</div>
            {formula && <div className="formula">{formula}</div>}
            {caveat && <div className="tiny muted" style={{ margin: 0 }}>{caveat}</div>}
          </div>
        </div>
      </div>
    </div>
  );
}

const n = (v) => { const x = Number(v); return Number.isFinite(x) ? x : NaN; };
const f = (x, d = 3) => (Number.isFinite(x) ? x.toFixed(d).replace(/\.?0+$/, '') : '—');

/* ------------------------------------------------------------------ 4-20 mA */
export function MaCalc() {
  const [lo, setLo] = useState('0');
  const [hi, setHi] = useState('100');
  const [mA, setmA] = useState('12');
  const [eu, setEu] = useState('');
  const span = n(hi) - n(lo);

  const fromCurrent = useMemo(() => {
    const x = n(mA);
    if (!Number.isFinite(x) || !Number.isFinite(span) || span === 0) return null;
    const pct = ((x - 4) / 16) * 100;
    return { pct, value: n(lo) + (pct / 100) * span };
  }, [mA, lo, hi, span]);

  const fromValue = useMemo(() => {
    const y = n(eu);
    if (!Number.isFinite(y) || !Number.isFinite(span) || span === 0) return null;
    const pct = ((y - n(lo)) / span) * 100;
    return { pct, mA: 4 + (pct / 100) * 16 };
  }, [eu, lo, hi, span]);

  return (
    <CalcShell title="4-20 mA ↔ engineering value" status="standard"
      formula={"% of span = (mA − 4 mA) / 16 mA × 100\nvalue = LRV + (% / 100) × (URV − LRV)\nmA = 4 + (value − LRV)/(URV − LRV) × 16"}
      caveat="4-20 mA is the definitional mapping (0 %=4 mA, 100 %=20 mA). The zero/live-zero behaviour and any fault band are device-specific: many transmitters are commonly cited around 3.6-3.8 mA and above about 21 mA, but that number comes from the device spec, not from this app. Range codes (LRV/URV), damping and unit are configuration, not measurement."
      results={<>
        {fromCurrent && <Readout label="value from current" sub={`at ${f(n(mA), 2)} mA`} value={f(fromCurrent.value, 4)} />}
        {fromCurrent && <Readout label="% of span" value={`${f(fromCurrent.pct, 2)} %`} />}
        {fromValue && <Readout label="current for value" sub={`at ${f(n(eu), 4)}`} value={`${f(fromValue.mA, 3)} mA`} />}
      </>}
    >
      <Num label="Lower range value" value={lo} onChange={setLo} />
      <Num label="Upper range value" value={hi} onChange={setHi} />
      <Num label="Measured current" value={mA} onChange={setmA} unit="mA" />
      <Num label="Engineering value" value={eu} onChange={setEu} hint="leave the mA box alone to go the other way" />
      <div className="tiny muted">
        {fromCurrent && (n(mA) < 3.2 || n(mA) > 21) && <span style={{ color: 'var(--bad)' }}>Current outside 3.2-21 mA: the mapping still computes, but a real loop in that region is a broken-wire / over-range condition to diagnose, not a reading to trust.</span>}
        {fromCurrent && n(mA) === 0 && <span style={{ color: 'var(--bad)' }}>0 mA = open loop or no power, not a measurement.</span>}
      </div>
    </CalcShell>
  );
}

/* ------------------------------------------------------------------ pressure */
const P_UNITS = { psia: 6894.757293168, psig: 6894.757293168, kPa: 1000, bar: 100000, MPa: 1e6, Pa: 1 };
export function PressureCalc() {
  const [v, setV] = useState('500');
  const [u, setU] = useState('psig');
  const [atm, setAtm] = useState('14.696');
  const pasc = n(v) * P_UNITS[u];
  const gaugeOffset = n(atm) * P_UNITS.psig;
  const to = (unit) => {
    if (!Number.isFinite(pasc)) return '—';
    let p = pasc;
    if (unit === 'psig' || unit === 'psia') p = (u === 'psig' ? pasc + gaugeOffset : pasc - gaugeOffset) / P_UNITS[unit];
    else p = pasc / P_UNITS[unit];
    return f(p, 5);
  };
  return (
    <CalcShell title="Pressure: absolute ↔ gauge" status="standard"
      formula="psia = psig + atmospheric pressure\n1 psi = 6.894757293168 kPa (from lbf = 4.4482216152605 N, in = 25.4 mm)\n1 bar = 100 kPa exactly"
      caveat="The only non-definitional number here is the atmospheric offset: 14.696 psi is the standard atmosphere at sea level. Actual site barometric pressure differs (and at elevation it differs a lot), so for custody-transfer or relief work use the site/barometer value - enter it above. Never mix psia and psig in one equation; most relief and process data sheets state the basis explicitly."
      results={<>
        {['psia', 'psig', 'kPa', 'bar', 'MPa'].map((unit) => (
          <Readout key={unit} label={unit} value={to(unit)} sub={unit === 'psia' || unit === 'psig' ? `offset ${f(n(atm), 3)} psi` : undefined} />
        ))}
      </>}
    >
      <Num label="Value" value={v} onChange={setV} />
      <label className="field">
        <span className="label">Unit</span>
        <select className="search-input" style={{ maxWidth: 190 }} value={u} onChange={(e) => setU(e.target.value)}>
          {Object.keys(P_UNITS).filter((k) => k !== 'Pa').map((k) => <option key={k} value={k}>{k}</option>)}
        </select>
      </label>
      <Num label="Atmospheric offset" value={atm} onChange={setAtm} unit="psi" hint="site barometric pressure; 14.696 is the standard atmosphere" />
    </CalcShell>
  );
}

/* ------------------------------------------------------------------ gas volume ↔ energy */
export function EnergyCalc() {
  const [mcf, setMcf] = useState('100');
  const [btu, setBtu] = useState('1050');
  const val = (n(mcf) * n(btu)) / 1000;
  return (
    <CalcShell title="Gas volume ↔ energy" status="standard"
      formula="MMBtu/d = Mcf/d × Btu/scf ÷ 1000\n(the 1000 comes from 'Mcf' = 1000 scf, nothing else)"
      caveat="The Btu content is a measured/allocated number from your gas analysis or the pipeline's allocation - it is not a constant, it changes with composition and heating value basis (standard vs saturated). The 6,000 scf/MMBtu relation is the same arithmetic read the other way for 1000 Btu/scf gas only. This calculator does arithmetic, it does not supply a heating value."
      results={<>
        <Readout label="MMBtu/d" value={f(val, 4)} sub={`${f(n(mcf), 2)} Mcf/d at ${f(n(btu), 1)} Btu/scf`} />
        <Readout label="scf per MMBtu" value={f(n(btu) ? 1e6 / n(btu) : NaN, 1)} />
        <Readout label="Btu/h" value={f(val * 1e6 / 24, 1)} sub="assuming a steady 24 h day" />
      </>}
    >
      <Num label="Volume flow" value={mcf} onChange={setMcf} unit="Mcf/d" />
      <Num label="Heating value (you supply this)" value={btu} onChange={setBtu} unit="Btu/scf" hint="from your gas analysis or allocation statement" />
    </CalcShell>
  );
}

/* ------------------------------------------------------------------ PID scale */
export function LoopCalc() {
  const [pb, setPb] = useState('100');
  const [ti, setTi] = useState('');
  const [td, setTd] = useState('');
  const Kc = 100 / n(pb);
  const unit = (x) => (Number.isFinite(n(x)) ? `${f(n(x) * 60, 4)} min · ${f(n(x), 3)} s` : '—');
  return (
    <CalcShell title="Proportional band ↔ gain; Ti/Td units" status="standard"
      formula="Kc = 100 / PB%   ·   PB% = 100 / Kc × 100\nTi and Td are the same integral/derivative time expressed in different units"
      caveat="Only the Kc/PB relation is definitional, and even that assumes PB is quoted as the reciprocal of gain (the usual convention) - some vendors quote PB differently, so confirm in your function-block manual. Entering a Kc here does not make it right for your loop: see the tuning entries, and treat every published rule-of-thumb as a starting point that requires a live-plant test."
      results={<>
        <Readout label="Kc from PB" value={f(Kc, 4)} sub={`PB = ${f(n(pb), 2)} %`} />
        <Readout label="Ti" value={unit(ti)} />
        <Readout label="Td" value={unit(td)} />
      </>}
    >
      <Num label="Proportional band" value={pb} onChange={setPb} unit="%" />
      <Num label="Ti (seconds)" value={ti} onChange={setTi} hint="many blocks take minutes - both shown" />
      <Num label="Td (seconds)" value={td} onChange={setTd} />
    </CalcShell>
  );
}

/* ------------------------------------------------------------------ time helpers */
export function TimeCalc() {
  const [ms, setMs] = useState('1500');
  const [scan, setScan] = useState('50');
  const [preset, setPreset] = useState('5');
  const [pUnit, setPUnit] = useState('s');
  const factor = { ms: 1, s: 1000, min: 60000, h: 3600000 }[pUnit];
  const presetMs = n(preset) * factor;
  const scans = presetMs / n(scan);
  const t = n(ms);
  return (
    <CalcShell title="Timers, scan time and stroke time" status="practice"
      formula={`elapsed ${f(t, 0)} ms = ${f(t / 1000, 3)} s = ${f(t / 60000, 4)} min\nscans to reach a preset = preset / scan period (integer part + 1, in practice)`}
      caveat="A ladder timer only advances once per scan (the model in this app steps it by the scan period), so the real elapsed time is quantised: a preset of 5 s with a 250 ms scan can fire anywhere from 5.0 to 5.25 s. For stroke-time tests, record the measured time against the valve's own position feedback, not against the timer. Never size a protection function from this page."
      results={<>
        <Readout label="elapsed" value={`${f(t / 1000, 3)} s`} />
        <Readout label="scans to reach preset" value={f(Math.floor(scans) + 1, 0)} sub={`preset ${f(presetMs, 0)} ms ÷ scan ${f(n(scan), 1)} ms — worst-case overshoot ${f(n(scan), 0)} ms`} />
      </>}
    >
      <Num label="Elapsed time" value={ms} onChange={setMs} unit="ms" />
      <Num label="Controller scan period" value={scan} onChange={setScan} unit="ms" hint="from your controller diagnostics, not from here" />
      <div className="row">
        <Num label="Timer preset" value={preset} onChange={setPreset} />
        <select className="search-input" style={{ maxWidth: 90, alignSelf: 'flex-end' }} value={pUnit} onChange={(e) => setPUnit(e.target.value)}>
          {['ms', 's', 'min', 'h'].map((u) => <option key={u} value={u}>{u}</option>)}
        </select>
      </div>
    </CalcShell>
  );
}
