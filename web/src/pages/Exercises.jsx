import { Link } from 'react-router-dom';
import { useTitle } from '../lib/store.jsx';
import { EXERCISES, loadProgress } from '../lib/exercises.js';
import { useState } from 'react';

export default function Exercises() {
  useTitle('Exercises');
  const [progress] = useState(() => loadProgress(window.localStorage));
  const passed = EXERCISES.filter((item) => progress.done?.[item.id]).length;
  return (
    <div className="ex-page">
      <header className="re-hero">
        <h1>Exercises</h1>
        <p>
          Read the task, build it in the rung editor, then press Check. A pass means the outputs did the right thing.
          The drawing is not compared to a hidden answer.
        </p>
        <p className="ex-score" role="status">{passed} of {EXERCISES.length} passed. Saved in this browser.</p>
      </header>
      <ol className="ex-list" aria-label="Graded exercises">
        {EXERCISES.map((item, index) => {
          const done = !!progress.done?.[item.id];
          return (
            <li key={item.id}>
              <Link className={`ex-card ${done ? 'is-done' : ''}`} to={`/exercises/${item.id}`}>
                <span className="ex-num">{index + 1}</span>
                <span className="ex-card-copy">
                  <span className="ex-card-title">{item.title}</span>
                  <span className="ex-card-state">{done ? 'Passed' : 'Not passed yet'}</span>
                </span>
              </Link>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
