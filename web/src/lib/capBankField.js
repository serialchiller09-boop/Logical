/** Field devices for disconnect 891A. The ladder reads these inputs; it does not write them. */

export const DI_891A_CLOSED = 'DI_891A_Closed';
export const DI_891A_OPEN = 'DI_891A_Open';
export const DI_KEY_A = 'DI_KeyA_At891A_LO';
export const P_891A_OPERATE = 'P_891A_Operate';

function on(bits, tag) {
  return !!bits?.[tag];
}

/** While 891A is closed, key A stays on the lock. */
export function settle891A(bits) {
  if (!bits) return bits;
  if (on(bits, DI_891A_CLOSED)) {
    bits[DI_891A_CLOSED] = 1;
    bits[DI_891A_OPEN] = 0;
    bits[DI_KEY_A] = 1;
  } else if (on(bits, DI_891A_OPEN)) {
    bits[DI_891A_OPEN] = 1;
    bits[DI_891A_CLOSED] = 0;
  }
  return bits;
}

/**
 * Hand operation of 891A and key A.
 * Open and close run when P_891A_Operate is true.
 * The lock frees key A when 891A is open, the key is on the lock, and operate is true.
 * While key A is away, a close leaves 891A open.
 * Returning the key puts it back on the open lock.
 */
export function apply891AField(bits, action) {
  if (!bits) return bits;
  const operate = on(bits, P_891A_OPERATE);
  const closed = on(bits, DI_891A_CLOSED);
  const open = on(bits, DI_891A_OPEN);
  const keyHome = on(bits, DI_KEY_A);

  if (action === 'open' && operate && closed) {
    bits[DI_891A_CLOSED] = 0;
    bits[DI_891A_OPEN] = 1;
  } else if (action === 'close' && operate && open && keyHome) {
    bits[DI_891A_CLOSED] = 1;
    bits[DI_891A_OPEN] = 0;
  } else if (action === 'lock' && operate && open && keyHome) {
    bits[DI_KEY_A] = 0;
  } else if (action === 'return' && open && !keyHome) {
    bits[DI_KEY_A] = 1;
  }
  return settle891A(bits);
}
