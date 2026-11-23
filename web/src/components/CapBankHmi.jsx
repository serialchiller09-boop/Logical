export const HMI_891A_REASON = '52C1 must be open to operate 891A.';

function bitOn(bits, tag) {
  return bits?.[tag] ? 1 : 0;
}

/**
 * Training one-line for the fictional capacitor bank.
 * 891A is ahead of 52C1. Key A is drawn on the 891A lock when it is home,
 * and in hand when it is free. Dashed key lines reach 891A, TDKR, and 891G.
 */
export default function CapBankHmi({ bits = {}, onRequest }) {
  const closed = bitOn(bits, 'DI_891A_Closed');
  const open = bitOn(bits, 'DI_891A_Open');
  const keyHome = bitOn(bits, 'DI_KeyA_At891A_LO');
  const breakerClosed = bitOn(bits, 'DI_52C1_52a');
  const reason = bitOn(bits, 'IND_891A_Need52C1');
  const position = closed ? 'Closed' : (open ? 'Open' : 'In place');
  const ask = (tag) => onRequest?.(tag);

  return (
    <section className="cap-hmi" aria-label="891A and 52C1 one-line">
      <div className="cap-hmi-scroll">
        <svg className="cap-hmi-line" viewBox="0 0 760 280" role="img" aria-label="Power path from 891A to 52C1, with key A">
          <line className="cap-power" x1="36" y1="86" x2="150" y2="86" />
          <SwitchGlyph x={188} closed={!!closed} />
          <line className="cap-power" x1="226" y1="86" x2="330" y2="86" />
          <BreakerGlyph x={368} closed={!!breakerClosed} />
          <line className="cap-power" x1="406" y1="86" x2="520" y2="86" />
          <rect className="cap-bank" x="520" y="60" width="86" height="52" rx="6" />
          <text className="cap-label" x="563" y="90" textAnchor="middle">Bank</text>

          <text className="cap-name" x="188" y="28" textAnchor="middle">891A</text>
          <text className="cap-state" x="188" y="124" textAnchor="middle">{position}</text>
          <text className="cap-name" x="368" y="28" textAnchor="middle">52C1</text>
          <text className="cap-state" x="368" y="124" textAnchor="middle">{breakerClosed ? 'Closed' : 'Open'}</text>

          <path className="cap-keyline" d="M188 146 V190 H620" />
          <path className="cap-keyline" d="M320 190 V170" />
          <path className="cap-keyline" d="M620 190 V210" />
          <rect className="cap-box" x="268" y="158" width="104" height="28" rx="4" />
          <text className="cap-label" x="320" y="177" textAnchor="middle">TDKR</text>
          <GroundGlyph x={620} y={210} />
          <text className="cap-name" x="620" y="258" textAnchor="middle">891G</text>

          {keyHome ? <KeyGlyph x={150} y={150} /> : <KeyGlyph x={70} y={200} />}
          <text className="cap-keyname" x={keyHome ? 150 : 70} y={keyHome ? 178 : 238} textAnchor="middle">
            {keyHome ? 'A on lock' : 'A in hand'}
          </text>
        </svg>
      </div>

      <p className="cap-hmi-status" role="status">
        {closed ? '891A is closed. Key A is on the lock.' : (keyHome ? '891A is open. Key A is on the lock.' : '891A is open. Key A is in hand.')}
      </p>
      {reason ? <p className="cap-hmi-reason" role="status">{HMI_891A_REASON}</p> : null}

      <div className="cap-hmi-actions">
        <button type="button" className="btn btn-sm" onClick={() => ask('CMD_891A_Open')}>Open 891A</button>
        <button type="button" className="btn btn-sm" onClick={() => ask('CMD_891A_Close')}>Close 891A</button>
        <button type="button" className="btn btn-sm" onClick={() => ask('CMD_891A_LockOpen')}>Lock open</button>
        <button type="button" className="btn btn-sm" onClick={() => ask('CMD_KeyA_Return')}>Return key A</button>
      </div>
    </section>
  );
}

function SwitchGlyph({ x, closed }) {
  return (
    <g>
      <line className="cap-power" x1={x - 38} y1="86" x2={x - 16} y2="86" />
      <line className="cap-power" x1={x + 16} y1="86" x2={x + 38} y2="86" />
      <circle className="cap-jaw" cx={x - 16} cy="86" r="4" />
      <circle className="cap-jaw" cx={x + 16} cy="86" r="4" />
      <line className="cap-blade" x1={x - 14} y1="86" x2={closed ? x + 14 : x + 2} y2={closed ? 86 : 52} />
    </g>
  );
}

function BreakerGlyph({ x, closed }) {
  return (
    <g>
      <rect className={`cap-breaker ${closed ? 'is-closed' : 'is-open'}`} x={x - 22} y="66" width="44" height="40" rx="4" />
      <text className="cap-label" x={x} y="90" textAnchor="middle">{closed ? '52a' : '52b'}</text>
    </g>
  );
}

function GroundGlyph({ x, y }) {
  return (
    <g>
      <line className="cap-power" x1={x} y1={y - 28} x2={x} y2={y} />
      <line className="cap-power" x1={x - 16} y1={y} x2={x + 16} y2={y} />
      <line className="cap-power" x1={x - 10} y1={y + 7} x2={x + 10} y2={y + 7} />
      <line className="cap-power" x1={x - 4} y1={y + 14} x2={x + 4} y2={y + 14} />
    </g>
  );
}

function KeyGlyph({ x, y }) {
  return (
    <g className="cap-key" transform={`translate(${x} ${y})`}>
      <circle cx="0" cy="0" r="8" />
      <text className="cap-keyletter" x="0" y="3.5" textAnchor="middle">A</text>
      <line x1="8" y1="0" x2="22" y2="0" />
      <line x1="16" y1="0" x2="16" y2="5" />
      <line x1="22" y1="0" x2="22" y2="5" />
    </g>
  );
}
