export default function TypingIndicator({ label }) {
  return (
    <div className="typing-indicator">
      <span className="typing-waveform" aria-hidden="true">
        <i></i>
        <i></i>
        <i></i>
        <i></i>
      </span>
      <span className="typing-label">{label}</span>
    </div>
  );
}
