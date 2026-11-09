import { writeFileSync } from 'node:fs';
import {
  PROJECT_ID, DRAWING_OBSERVATIONS, CONTROLLER_BASIS, ASSUMED_TOPOLOGY, TRAINER_IO,
  INTERNAL_TAGS, PROGRAM_ROUTINES, PERMISSIVE_MATRIX, KIRK_STATES, TIMER_COUNTER_PLAN,
  LOGIC_PATTERNS, HMI_SCREENS, WONDERWARE_STEPS, BUILD_PHASES, FAT_TESTS,
  PLATFORM_CROSSWALK, REFERENCE_LINKS
} from '../web/src/data/substationProject.js';

const esc = (value = '') => String(value ?? '').replaceAll('|', '\\|').replace(/\r?\n/g, '<br>');
const table = (columns, rows) => {
  const labels = columns.map(([, label]) => label);
  return `| ${labels.join(' | ')} |\n| ${labels.map(() => '---').join(' | ')} |\n${rows.map((row) => `| ${columns.map(([key]) => esc(row[key])).join(' | ')} |`).join('\n')}\n`;
};

let out = `# Substation PLC Simulator & Trainer — Project Notebook\n\n`;
out += `**Project ID:** ${PROJECT_ID}\n\n**Controller basis:** CompactLogix L18ER (full catalog/firmware pending confirmation)\n\n**Targets:** Studio 5000 · Wonderware / AVEVA InTouch · isolated low-voltage trainer\n\n`;
out += `> **TRAINING MODEL — NOT PROTECTION OR A SWITCHING PROCEDURE**\n>\n> Keep this project software-only or on an isolated low-voltage trainer. A standard PLC must not replace a protective relay, hardwired trip, mechanical Kirk interlock, approved discharge/grounding method, or absence-of-voltage test. Never open an energized CT secondary and never connect the trainer directly to substation CT/VT circuits.\n\n`;
out += `## Project cover sheet\n\n| Field | Project value |\n|---|---|\n| Drawing | Uploaded Duke Energy Texas 138/4.16 kV one-line screenshot |\n| Original drawing number / revision | **ADD FROM NATIVE PDF** |\n| Controller / firmware | CompactLogix L18ER — confirm full catalog and firmware |\n| Studio 5000 revision | ______________________________ |\n| Emulator and version | ______________________________ |\n| Wonderware / AVEVA version | ______________________________ |\n| Trainer voltage, commons and isolation | **VERIFY BEFORE WIRING** |\n| Prepared / reviewed | ______________________________ |\n\n`;
out += `## 1. Drawing review and design basis\n\nThe uploaded screenshot establishes the architecture and branch count but is not sharp enough for reliable device-tag, rating or protection-setting transcription. Normalized simulator names are used below until the original PDF and elementary drawings are added.\n\n`;
out += table([['area', 'Area'], ['observed', 'What is visible'], ['confidence', 'Reading status'], ['action', 'Required confirmation']], DRAWING_OBSERVATIONS) + '\n';
out += `### CompactLogix L18ER fit check\n\n${table([['item', 'Item'], ['selection', 'Current basis'], ['designEffect', 'Project effect']], CONTROLLER_BASIS)}\n`;
out += `### Normalized trainer topology\n\n${table([['tag', 'Simulator tag'], ['device', 'Drawing equipment'], ['role', 'Modeled role']], ASSUMED_TOPOLOGY)}\n`;
out += `### Control boundary\n\n- **PLC may own:** training requests, permissive display, simulator states, indications, counters, alarms and HMI handshakes.\n- **PLC may monitor:** relay trips/health, breaker auxiliaries, key position and hardwired trip status.\n- **PLC does not replace:** protective relay pickup, hardwired 86/trip circuits, trapped-key mechanics, grounding, absence-of-voltage testing or safe-work procedure.\n\n`;
out += `## 2. Step-by-step build plan\n\n`;
for (const phase of BUILD_PHASES) {
  out += `### ${phase.number}. ${phase.title}\n\n**Outcome:** ${phase.outcome}\n\n${phase.tasks.map((task) => `- [ ] ${task}`).join('\n')}\n\n**Evidence to retain:** ${phase.evidence}\n\n`;
}
out += `## 3. Physical trainer I/O\n\n**Capacity used:** 15 maintained inputs, 15 momentary inputs, 2 analog inputs, 6 green LED outputs and 2 amber LED outputs. The L18ER family fit and generated module paths must be confirmed before wiring.\n\n`;
const ioColumns = [['channel', 'Point'], ['tag', 'PLC tag / symbol'], ['studio', 'Studio 5000 example'], ['rslogix', 'RSLogix 500 example'], ['device', 'Trainer label'], ['normal', 'Normal'], ['action', 'Action'], ['engineering', 'Engineering tag'], ['note', 'Design note']];
for (const [title, rows] of [
  ['15 maintained toggles', TRAINER_IO.maintained], ['15 momentary controls', TRAINER_IO.momentary],
  ['2 analog potentiometers', TRAINER_IO.analog], ['6 green LEDs', TRAINER_IO.green], ['2 amber LEDs', TRAINER_IO.amber]
]) out += `### ${title}\n\n${table(ioColumns, rows)}\n`;
out += `### Internal / HMI tag starter set\n\n${table([['tag', 'Tag'], ['type', 'Type'], ['owner', 'Owner'], ['purpose', 'Purpose']], INTERNAL_TAGS)}\n`;
out += `## 4. Controller structure and ladder patterns\n\n### Recommended routine order\n\n${table([['order', '#'], ['routine', 'Routine'], ['purpose', 'Responsibility'], ['output', 'Review result']], PROGRAM_ROUTINES)}\n`;
out += `### Close permissive matrix\n\n${table([['device', 'Device'], ['closeRequires', 'Close requires'], ['tripOrBlock', 'Trip / block'], ['plcRole', 'PLC boundary']], PERMISSIVE_MATRIX)}\n`;
out += `### Illustrative ladder patterns\n\n> Tags are normalized/invented. All presets, thresholds, voltage bands and travel times are placeholders that must come from reviewed project documents.\n\n`;
for (const pattern of LOGIC_PATTERNS) {
  out += `#### ${pattern.title}\n\n${pattern.why}\n\n\`\`\`text\n${pattern.studio.join('\n')}\n\`\`\`\n\n**RSLogix 500 translation:** ${pattern.rslogix}\n\n`;
}
out += `### Timers, counters and one-shots\n\n${table([['element', 'Element'], ['instance', 'Example instance'], ['trigger', 'Trigger'], ['doneUse', 'Use'], ['reset', 'Reset'], ['warning', 'Design check']], TIMER_COUNTER_PLAN)}\n`;
out += `### Platform crosswalk\n\n${table([['concept', 'Concept'], ['studio', 'Studio 5000'], ['rslogix', 'RSLogix 500'], ['wonderware', 'Wonderware / AVEVA']], PLATFORM_CROSSWALK)}\n`;
out += `## 5. K1–K4 Kirk key system\n\n**Use KEY RELEASE PERMITTED, never “safe,” “de-energized,” or “safe to touch.”** A CT low-current indication is not an absence-of-voltage test. Each drawing-observed bank requires independent tags, timer, one-shot storage, counter and state.\n\n`;
out += table([['state', 'State'], ['breaker', 'Breaker proof'], ['current', 'CT/current indication'], ['key', 'Key location'], ['release', 'Release indication'], ['close', 'Close result']], KIRK_STATES) + '\n';
out += `### Sequence\n\n1. **Open:** open the selected bank breaker; trip/open always overrides close.\n2. **Prove:** require 52a/52b agreement, good quality and selected-bank no-current indication.\n3. **Wait:** run only that bank's timer using the approved manufacturer/engineering preset.\n4. **Release:** indicate release permitted; the mechanical lock controls actual key removal.\n5. **Access:** key-at-breaker drops and/or access opens, immediately blocking close.\n6. **Return:** secure access, return/trap the key, cancel the request and recalculate permissives.\n\n`;
out += `## 6. Wonderware / AVEVA HMI\n\n### Screen register\n\n${table([['screen', 'Screen'], ['includes', 'Includes'], ['operatorAction', 'Operator action'], ['acceptance', 'Acceptance']], HMI_SCREENS)}\n`;
out += `### HMI build order\n\n${WONDERWARE_STEPS.map((step, index) => `${index + 1}. ${step}`).join('\n')}\n\n`;
out += `## 7. Factory acceptance tests\n\n${table([['id', 'ID'], ['test', 'Test'], ['action', 'Method'], ['expected', 'Expected result']], FAT_TESTS)}\n`;
out += `### Handoff package\n\n- [ ] ACD source, upload/compare, firmware/catalog and module profiles\n- [ ] HMI backup, tag export, communications configuration, alarm export and roles\n- [ ] Original one-line/elementaries, I/O map, permissive matrix and cause/effect matrix\n- [ ] FAT, analog calibration, point-to-point sheets and force/bypass-zero record\n- [ ] Restore steps, installers/licenses and known-good backup location\n\n`;
out += `## 8. Studio 5000 package\n\n- [Studio 5000 package overview](studio5000/README.md)\n- [Routine-by-routine L18ER specification](studio5000/SUB_TRAIN_01_ROUTINE_SPEC.md)\n- [115-row tag design register](studio5000/SUB_TRAIN_01_TAG_REGISTER.csv)\n\n`;
out += `## Project-specific documents still required\n\n- [ ] Original one-line PDF and revision\n- [ ] Breaker elementary/control schematics\n- [ ] Relay point list, settings file and cause/effect matrix\n- [ ] Transformer protection schematic\n- [ ] Four capacitor-bank manuals and discharge requirements\n- [ ] K1–K4 key-exchange drawing and key schedule\n- [ ] L18ER/POINT I/O and trainer electrical specifications\n- [ ] Wonderware / AVEVA application and OI-driver manuals\n- [ ] Electrical safe-work, switching, LOTO and MOC procedures\n\n`;
out += `## Reference starting points\n\n${REFERENCE_LINKS.map((reference) => `- [${reference.label}](${reference.url}) — ${reference.use}`).join('\n')}\n\n`;
out += `---\n\n### Signoff\n\n| Role | Name / signature | Date |\n|---|---|---|\n| Prepared by | | |\n| Controls review | | |\n| Electrical / protection review | | |\n| Training release | | |\n`;

writeFileSync(new URL('../docs/SUBSTATION_PLC_PROJECT_NOTEBOOK.md', import.meta.url), out);
console.log(`wrote docs/SUBSTATION_PLC_PROJECT_NOTEBOOK.md (${out.length} characters)`);
