import { useRef, useState } from "react";

function formatDuration(seconds) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function VoiceRecorderButton({ onRecorded, disabled }) {
  const [isRecording, setIsRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const streamRef = useRef(null);
  const timerRef = useRef(null);

  async function startRecording() {
    if (!navigator.mediaDevices?.getUserMedia) {
      alert("Voice messages need microphone access, which this browser doesn't support.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];

      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
        const finalDuration = seconds;
        streamRef.current?.getTracks().forEach((track) => track.stop());
        setIsRecording(false);
        setSeconds(0);
        clearInterval(timerRef.current);
        if (finalDuration > 0) onRecorded(blob, finalDuration);
      };

      recorder.start();
      setIsRecording(true);
      setSeconds(0);
      timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
    } catch (err) {
      alert("Microphone access was denied, so the voice message couldn't be recorded.");
    }
  }

  function stopRecording() {
    mediaRecorderRef.current?.stop();
  }

  function cancelRecording() {
    if (mediaRecorderRef.current) {
      // Prevent onstop from sending anything
      chunksRef.current = [];
      setSeconds(0);
      mediaRecorderRef.current.onstop = () => {
        streamRef.current?.getTracks().forEach((track) => track.stop());
        setIsRecording(false);
      };
      mediaRecorderRef.current.stop();
    }
    clearInterval(timerRef.current);
  }

  if (isRecording) {
    return (
      <div className="voice-recording">
        <span className="voice-recording-dot" aria-hidden="true"></span>
        <span className="voice-recording-time">{formatDuration(seconds)}</span>
        <button type="button" className="icon-btn" onClick={cancelRecording} title="Discard">
          🗑️
        </button>
        <button type="button" className="attach-btn" onClick={stopRecording} title="Send">
          ✅
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      className="attach-btn"
      onClick={startRecording}
      title="Record a voice message"
      disabled={disabled}
    >
      🎤
    </button>
  );
}
