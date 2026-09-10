/**
 * UNITS, DEFINITIONS AND CONVERSION CONSTANTS for gas measurement.
 * Every number here is definitional (a unit definition) or a published standard reference condition.
 * Nothing in this file is a process design value.
 */
export const UNIT_DEFS = [
  { id: 'u-scf', unit: 'scf', name: 'Standard cubic foot', definition: 'Volume of gas reduced to declared reference conditions. NOT an absolute quantity: state the reference.', reference: 'US gas industry practice: 60 F (15.56 C) and 14.696 psia (1 atm). ISO and many other standards use 15 C and 101.325 kPa; some use 0 C.', status: 'standard' },
  { id: 'u-mcf', unit: 'Mcf / MMcf / Bcf', name: 'Thousand / million / billion standard cubic feet', definition: '1 Mcf = 1,000 scf; 1 MMcf = 1,000,000 scf; 1 Bcf = 1,000 MMcf.', status: 'standard' },
  { id: 'u-btu', unit: 'Btu', name: 'British thermal unit', definition: 'Heat to raise 1 lb of water 1 F. Multiple "BTU" definitions exist (IT, thermochemical); the difference is ~0.1% and matters in reconciliation, not in operations.', status: 'standard' },
  { id: 'u-mmbtu', unit: 'MMBtu / Dth / therm', name: 'Energy', definition: '1 MMBtu = 1,000,000 Btu = 1 dekatherm (Dth). 1 therm = 100,000 Btu, so 1 Dth = 10 therms.', status: 'standard' },
  { id: 'u-ghv', unit: 'Btu/scf (GHV, HHV)', name: 'Gross (higher) heating value per standard volume', definition: 'Energy content per unit volume at the reference conditions. Typical range for treated natural gas is around 1,000-1,100 Btu/scf; pipeline specs set both a minimum and often a maximum.', status: 'standard' },
  { id: 'u-wobbe', unit: 'Wobbe index', name: 'Heating value / sqrt(relative density)', definition: 'Interchangeability measure for combustion: two gases with the same Wobbe deliver the same thermal power through the same burner orifice at the same pressure. It is NOT a volume-to-energy conversion.', formula: 'W = GHV / sqrt(SG)', status: 'standard' },
  { id: 'u-sg', unit: 'Relative density (SG)', name: 'Density of gas / density of air, same conditions', definition: 'Air = 1.000. Methane ~0.554. Rises with NGL content, CO2 and N2 (N2 raises it; heavies raise it more).', status: 'standard' },
  { id: 'u-psig', unit: 'psig / psia', name: 'Gauge vs absolute pressure', definition: 'psia = psig + atmospheric (14.696 psi at sea level, 14.7 rounded). At elevation the offset changes, which matters when a transmitter is calibrated as sealed-gauge.', status: 'standard' },
  { id: 'u-ma', unit: '4-20 mA', name: 'Analog current loop', definition: '4 mA = 0% of the calibrated range; 20 mA = 100%. Live zero, so <4 mA and >20 mA carry meaning.', status: 'standard' },
  { id: 'u-h2s-gr', unit: 'gr/100 scf', name: 'Grains of H2S per 100 standard cubic feet', definition: 'Legacy sulfur spec unit. 1 grain = 64.79891 mg. Pipeline H2S limits are commonly expressed as 0.25 gr/100 scf (with ppm used alongside) - the value is a contract term, so read the tariff.', status: 'standard' },
  { id: 'u-mmstbd', unit: 'bbl / MMbbl', name: 'Liquid volume', definition: '1 bbl = 42 US gallons = 0.158987 m3.', status: 'standard' },
  { id: 'u-lng', unit: 'LNG volume ratio', name: 'Liquid to gas expansion', definition: 'Industry shorthand: LNG expands by roughly 600:1 on vaporization. A rule of thumb for hazard distance and vent design, not a precise property at every temperature.', status: 'practice' },
  { id: 'u-dpa', unit: 'Dew point depression (DPD)', name: 'Inlet minus outlet water dew point', definition: 'The figure of merit for a dehydration unit. Quote it with the pressure at which the dew point was measured; the same moisture content is a different dew point at 1,000 psig than at atmospheric.', status: 'standard' }
];

export const CONVERSIONS = [
  { id: 'c-psi-kpa', from: 'psi', to: 'kPa', factor: 6.894757, note: 'exact-ish definitional factor' },
  { id: 'c-kpa-bar', from: 'kPa', to: 'bar', factor: 0.01, note: '1 bar = 100 kPa by definition' },
  { id: 'c-atm', from: 'atm', to: 'psia', factor: 14.6959, note: '1 atm = 101.325 kPa' },
  { id: 'c-inwc-psi', from: 'inch H2O (60 F)', to: 'psi', factor: 0.036091, note: 'common in low-DP and orifice work' },
  { id: 'c-mbar', from: 'mbar', to: 'kPa', factor: 0.1, note: '' },
  { id: 'c-scf-m3', from: 'scf', to: 'm3', factor: 0.0283168, note: 'volume only; the standard-condition basis must already match' },
  { id: 'c-btu-j', from: 'Btu (IT)', to: 'J', factor: 1055.05585, note: '' },
  { id: 'c-kwh-mj', from: 'kWh', to: 'MJ', factor: 3.6, note: 'exact by definition' },
  { id: 'c-mmbtu-gj', from: 'MMBtu', to: 'GJ', factor: 1.055056, note: '' },
  { id: 'c-lb-kg', from: 'lb', to: 'kg', factor: 0.45359237, note: 'exact' },
  { id: 'c-bbl-m3', from: 'bbl (42 gal)', to: 'm3', factor: 0.15898729, note: '' },
  { id: 'c-hp-kw', from: 'hp (mechanical)', to: 'kW', factor: 0.7457, note: 'brake hp rating of a driver is the shaft power' },
  { id: 'c-psia-offset', from: 'psig', to: 'psia', add: 14.696, note: 'at sea level; adjust for site elevation and for the transmitter reference type' }
];

/** Worked relations that are arithmetic, not modelling - safe to compute in the app. */
export const DERIVED_RELATIONS = [
  {
    id: 'r-energy', name: 'Volume to energy (and back)',
    formula: 'MMBtu/d = Mcf/d * (Btu/scf) / 1000',
    basis: 'Definition: energy per standard volume times volume per day. Requires the heating value and the volume to be on the SAME reference conditions.',
    example: '100 Mcf/d at 1,050 Btu/scf = 100 * 1050 / 1000 = 105 MMBtu/d = 105 dekatherms/d.'
  },
  {
    id: 'r-ma', name: '4-20 mA to engineering units',
    formula: 'EU = EU_lo + ((mA - 4) / 16) * (EU_hi - EU_lo)',
    basis: 'Linear definition of the signal range.',
    example: 'A 0-1,500 psig transmitter at 12 mA reads (12-4)/16 = 50% = 750 psig.'
  },
  {
    id: 'r-ma-reverse', name: 'Engineering units to mA (for an output)',
    formula: 'mA = 4 + 16 * (EU - EU_lo) / (EU_hi - EU_lo)',
    basis: 'Same definition, inverted. Used when you write a percent or a position into an AO.',
    example: 'A valve demand of 45% on a 4-20 mA output = 4 + 16*0.45 = 11.2 mA.'
  },
  {
    id: 'r-dpflow', name: 'DP-type flow element: flow vs differential',
    formula: 'Q2 / Q1 = sqrt(dP2 / dP1)  ->  dP is proportional to Q squared',
    basis: 'Bernoulli-based: this is why a DP flow meter has poor resolution at low flow and why rangeability is limited.',
    example: 'At 50% of design flow the DP is 25% of design DP. At 30% flow it is 9% - already close to where zero error and trim matter.'
  },
  {
    id: 'r-kcpb', name: 'Proportional band to controller gain',
    formula: 'Kc = 100 / PB(%)   and   PB(%) = 100 / Kc',
    basis: 'Definition of proportional band as the input change in percent that drives a 100% output change.',
    example: 'PB = 50% -> Kc = 2.0. Kc = 0.5 -> PB = 200%.'
  },
  {
    id: 'r-cv', name: 'Control valve Cv (liquid, non-choked)',
    formula: 'Cv = Q_gpm * sqrt(SG / dP_psi)',
    basis: 'Definition of Cv as US gpm of 60 F water at 1 psi differential. For gas or vapor the sizing equation is different (compressible, with an expansion factor and a choked-flow limit).',
    example: '100 gpm of SG 0.8 liquid at 25 psi drop: Cv = 100 * sqrt(0.8/25) = 17.9.'
  },
  {
    id: 'r-residence', name: 'Vessel residence time',
    formula: 't = V_liquid / Q_liquid',
    basis: 'Definition; the reason a slug catcher works, and the reason an undersized separator carries liquid over.',
    example: 'A vessel holding 60 bbl with a 40 bbl/h draw has 1.5 h of residence for the slug to arrive in.'
  },
  {
    id: 'r-h2s-ppm', name: 'H2S: grains per 100 scf to ppm',
    formula: 'ppm = (mg/m3) * Vm / MW  with Vm = molar volume at the stated reference; MW(H2S) = 34.08 g/mol',
    basis: 'Ideal-gas conversion at the declared reference conditions. 1 gr/100 scf = 64.79891 mg / 2.83168 m3 = 22.88 mg/m3; at 60 F and 14.696 psia (Vm ~23.65 L/mol) that is about 15.9 ppm.',
    example: 'A 0.25 gr/100 scf specification is therefore roughly 4 ppm - the "ppm" figure commonly quoted next to it. Compute both numbers from the reference conditions in the spec, not from a remembered pair.',
    caution: 'The ppm figure depends on the temperature and pressure basis and on treating the gas as ideal. For contract work use the method named in the specification.'
  },
  {
    id: 'r-mcf-day', name: 'Flow rate averaging',
    formula: 'Average daily volume = total volume / days ; instantaneous rate * 86,400 s/d must agree with it',
    basis: 'Arithmetic. Worth checking: a rate-to-total mismatch after a plant change is nearly always a lost pulse, a reset totalizer, or a units basis - not the process.',
    example: '58.8 scf/s * 86,400 s = 5.08 MMcf/d.'
  }
];

export const REFERENCE_CONDITIONS = [
  { id: 'rc-us', name: 'US customary', temp: '60 F (15.56 C)', press: '14.696 psia (1 atm)', where: 'Most US volume and heating-value work; API MPMS and AGA reports.' },
  { id: 'rc-iso', name: 'ISO / SI', temp: '15 C (59 F)', press: '101.325 kPa', where: 'ISO 12213 and much international gas trade.' },
  { id: 'rc-0c', name: 'Metric "normal"', temp: '0 C', press: '101.325 kPa', where: 'Nm3 conventions, mostly European and equipment datasheets.' },
  { id: 'rc-note', name: 'Why this table exists', temp: '-', press: '-', where: 'A volume expressed at 0 C is about 5% smaller than the same gas expressed at 60 F, before any pressure basis differences. Two correct numbers, an argument, and a reconciliation nobody can close. Always state the basis next to the value.' }
];
