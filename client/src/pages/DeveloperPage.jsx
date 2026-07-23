import { useState } from "react";
import { Link } from "react-router-dom";

const SKILL_GROUPS = [
  {
    title: "Frontend",
    skills: ["HTML", "CSS", "JavaScript", "React JS", "Responsive UI Design"],
  },
  {
    title: "Backend",
    skills: ["Node JS", "Express JS", "Python (basics)", "Java (basics)"],
  },
  {
    title: "Databases",
    skills: ["MongoDB", "SQL (basics)"],
  },
  {
    title: "Tools & Version Control",
    skills: ["Git", "GitHub"],
  },
  {
    title: "Programming",
    skills: ["C Language"],
  },
  {
    title: "Creative",
    skills: ["Video Editing", "YouTube Content Creation", "UI/UX Design"],
  },
];

const PROJECTS = [
  {
    name: "Relay — Real-Time Chat App",
    stack: "React · Node.js · Express · Socket.IO · MongoDB",
    description: "The real-time chat application you're using right now.",
    href: null,
  },
  {
    name: "Modern E-Commerce Website",
    stack: "PHP · MySQL · HTML · CSS · JavaScript",
    description: "A responsive storefront with payments, products, and order management.",
    href: "https://ujjwal.page.gd/",
  },
  {
    name: "Portfolio Website",
    stack: "HTML · CSS · JavaScript",
    description: "A fully responsive personal portfolio with smooth animations.",
    href: "https://ujjwalsiteco.netlify.app/",
  },
  {
    name: "Personal AI Assistant",
    stack: "HTML · CSS · JavaScript",
    description: "A browser assistant that can search, open, and browse on command.",
    href: "https://ujjwalai.netlify.app/",
  },
  {
    name: "2048 Game",
    stack: "HTML · CSS · JavaScript",
    description: "The classic sliding-tile puzzle, built from scratch.",
    href: "https://ujjwal2048.netlify.app/",
  },
];

const SOCIALS = [
  { label: "Portfolio", href: "https://ujjwalsiteco.netlify.app" },
  { label: "YouTube", href: "https://www.youtube.com/@Ujjwalmehta1" },
  { label: "Instagram", href: "https://www.instagram.com/its_ujjwal.x/" },
  { label: "Telegram", href: "https://t.me/ujjwal_mehta_1" },
  { label: "Email", href: "mailto:ujjwalcse07@gmail.com" },
];

export default function DeveloperPage() {
  const [imgFailed, setImgFailed] = useState(false);

  return (
    <div className="landing developer-page">
      <header className="landing-nav">
        <Link to="/" className="brand-mark">
          <span className="signal-bars" aria-hidden="true">
            <i></i>
            <i></i>
            <i></i>
            <i></i>
          </span>
          <span className="brand-name">Relay</span>
        </Link>
        <Link to="/" className="nav-link">
          ← Back to app
        </Link>
      </header>

      <section className="dev-hero">
        {!imgFailed ? (
          <img
            src="https://ujjwalsiteco.netlify.app/1727445839976.jpg"
            alt="Ujjwal"
            className="dev-avatar"
            onError={() => setImgFailed(true)}
          />
        ) : (
          <span className="conversation-avatar avatar-xl dev-avatar-fallback">U</span>
        )}
        <h1>Ujjwal</h1>
        <p className="dev-tagline">Developer · Creator · Editor</p>
        <p className="landing-subtitle dev-bio">
          A student developer from India who builds web apps, experiments with
          design, and shares the process on YouTube. Relay — this chat app —
          was built end-to-end as a full-stack project: real-time messaging,
          authentication, file/voice sharing, and a fully custom design
          system.
        </p>
        <div className="landing-cta">
          {SOCIALS.map((s) => (
            <a key={s.label} href={s.href} target="_blank" rel="noreferrer" className="btn-secondary btn-compact">
              {s.label}
            </a>
          ))}
        </div>
      </section>

      <section className="dev-section">
        <h2>Skills</h2>
        <div className="skill-groups">
          {SKILL_GROUPS.map((group) => (
            <div key={group.title} className="skill-group">
              <h3>{group.title}</h3>
              <div className="skill-pills">
                {group.skills.map((skill) => (
                  <span key={skill} className="skill-pill">
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="dev-section">
        <h2>Projects</h2>
        <div className="landing-features">
          {PROJECTS.map((p) => (
            <div className="feature-card" key={p.name}>
              <h3>{p.name}</h3>
              <p className="project-stack">{p.stack}</p>
              <p>{p.description}</p>
              {p.href && (
                <a href={p.href} target="_blank" rel="noreferrer" className="link-btn">
                  View live →
                </a>
              )}
            </div>
          ))}
        </div>
      </section>

      <footer className="landing-footer">
        <p>Based in Bihar, India · Built with React, Socket.IO &amp; MongoDB</p>
      </footer>
    </div>
  );
}
