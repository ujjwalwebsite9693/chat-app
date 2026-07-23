import { Link } from "react-router-dom";

const FEATURES = [
  {
    icon: "⚡",
    title: "Instant delivery",
    body: "Messages arrive the moment they're sent — no refresh, no delay.",
  },
  {
    icon: "👥",
    title: "Private & group chats",
    body: "One-on-one conversations or full groups with admin controls.",
  },
  {
    icon: "🟢",
    title: "Live presence",
    body: "See who's online, watch typing indicators, get read receipts.",
  },
  {
    icon: "🎨",
    title: "Make it yours",
    body: "Light or dark, six accent colors, and custom chat wallpapers.",
  },
  {
    icon: "😊",
    title: "Emoji, stickers & GIFs",
    body: "Say more than text — react, send stickers, search GIFs in-chat.",
  },
  {
    icon: "📌",
    title: "Saved Messages",
    body: "A private note-to-self space for links, files, and reminders.",
  },
];

export default function Landing() {
  return (
    <div className="landing">
      <header className="landing-nav">
        <div className="brand-mark">
          <span className="signal-bars" aria-hidden="true">
            <i></i>
            <i></i>
            <i></i>
            <i></i>
          </span>
          <span className="brand-name">Relay</span>
        </div>
        <div className="landing-nav-actions">
          <Link to="/login" className="nav-link">
            Log in
          </Link>
          <Link to="/register" className="btn-primary btn-compact">
            Get started
          </Link>
        </div>
      </header>

      <section className="landing-hero">
        <h1>
          Messages, delivered the
          <br />
          instant they're sent.
        </h1>
        <p className="landing-subtitle">
          Relay is a real-time chat app with group conversations, live
          presence, file &amp; voice sharing, and a look that's entirely
          yours to customize.
        </p>
        <div className="landing-cta">
          <Link to="/register" className="btn-primary">
            Create a free account
          </Link>
          <Link to="/login" className="btn-secondary">
            I already have one
          </Link>
        </div>
      </section>

      <section className="landing-features">
        {FEATURES.map((f) => (
          <div className="feature-card" key={f.title}>
            <span className="feature-icon">{f.icon}</span>
            <h3>{f.title}</h3>
            <p>{f.body}</p>
          </div>
        ))}
      </section>

      <footer className="landing-footer">
        <p>
          Built with React, Socket.IO, and MongoDB. <Link to="/developer" className="link-btn">About the developer →</Link>
        </p>
      </footer>
    </div>
  );
}
