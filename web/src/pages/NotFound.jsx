import { Link } from 'react-router-dom';
import { useTitle } from '../lib/store.jsx';

export default function NotFound() {
  useTitle('Page not found');
  return (
    <section className="hero" style={{ maxWidth: 560, margin: '40px auto' }}>
      <p className="mini" style={{ margin: 0 }}>404</p>
      <h1 style={{ marginTop: 6 }}>Page not found</h1>
      <p className="hero-lead">
        That address is not in this reference. Check the link, or go back to the home page and search from there.
      </p>
      <div className="hero-meta">
        <Link className="btn btn-primary" to="/">Home</Link>
        <Link className="btn" to="/s/rungs">Ladder lab</Link>
      </div>
    </section>
  );
}
