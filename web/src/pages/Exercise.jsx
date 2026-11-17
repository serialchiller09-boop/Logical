import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import RungEditor from './RungEditor.jsx';
import { useTitle } from '../lib/store.jsx';
import {
  EXERCISES,
  exerciseById,
  gradeExercise,
  loadProgress,
  saveProgress,
  starterProgram
} from '../lib/exercises.js';

function bitWord(value) {
  return value ? 'on' : 'off';
}

export default function Exercise() {
  const { id } = useParams();
  const exercise = exerciseById(id);
  useTitle(exercise ? exercise.title : 'Exercise');
  const starter = useMemo(() => (exercise ? starterProgram(exercise) : null), [exercise]);
  const [progress, setProgress] = useState(() => loadProgress(window.localStorage));
  const [result, setResult] = useState(null);
  if (!exercise || !starter) {
    return (
      <div className="ex-page">
        <h1>Exercise not found</h1>
        <Link className="btn" to="/exercises">Back to exercises</Link>
      </div>
    );
  }
  const index = EXERCISES.findIndex((item) => item.id === exercise.id);
  const program = progress.programs?.[exercise.id] || starter;
  const done = !!progress.done?.[exercise.id];

  function write(next) {
    setProgress(next);
    saveProgress(next, window.localStorage);
  }

  function onProgramChange(nextProgram) {
    write({ ...progress, programs: { ...progress.programs, [exercise.id]: nextProgram } });
  }

  function onCheck() {
    const graded = gradeExercise(program, exercise);
    setResult(graded);
    write({
      ...progress,
      programs: { ...progress.programs, [exercise.id]: program },
      done: { ...progress.done, [exercise.id]: graded.ok }
    });
  }

  function onReset() {
    const fresh = starterProgram(exercise);
    setResult(null);
    write({
      ...progress,
      programs: { ...progress.programs, [exercise.id]: fresh },
      done: { ...progress.done, [exercise.id]: false }
    });
  }

  return (
    <div className="ex-page">
      <p className="ex-kicker"><Link to="/exercises">Exercises</Link> · {index + 1} of {EXERCISES.length}{done ? ' · Passed' : ''}</p>
      <h1>{exercise.title}</h1>
      <div className="ex-task">
        {exercise.task.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
        <p className="ex-hint">{exercise.hint}</p>
      </div>
      <aside className="ex-ref" aria-label="Rockwell reference">
        <h2>Rockwell reference</h2>
        <p>{exercise.reference}</p>
      </aside>
      <p className="ex-tags">
        Inputs: {exercise.inputs.join(', ')}. Output: {exercise.outputs.join(', ')}.
        The output tag is already on the rung. Add the conditions.
      </p>
      <div className="re-palette-row">
        <button type="button" className="btn btn-primary" aria-label="Check this exercise" onClick={onCheck}>Check</button>
      </div>
      {result && (
        <div className={`callout ${result.ok ? 'callout-ok' : 'callout-bad'}`} role={result.ok ? 'status' : 'alert'}>
          <p>{result.message}</p>
          {result.expected && (
            <ul className="ex-compare">
              {Object.keys(result.expected).map((tag) => (
                <li key={tag}>Expected {tag} {bitWord(result.expected[tag])}. Actual {tag} {bitWord(result.actual[tag])}.</li>
              ))}
            </ul>
          )}
        </div>
      )}
      <RungEditor
        key={exercise.id}
        controlledProgram={program}
        onProgramChange={onProgramChange}
        seedProgram={starter}
        pinned={{ inputs: exercise.inputs, outputs: exercise.outputs }}
        hideIntro
        title={exercise.title}
        onReset={onReset}
      />
    </div>
  );
}
