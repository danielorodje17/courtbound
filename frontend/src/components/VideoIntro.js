import { useEffect, useRef, useState } from "react";

const SESSION_KEY = "cb_intro_seen";

export default function VideoIntro({ onComplete }) {
  const videoRef  = useRef(null);
  const [visible, setVisible]   = useState(true);
  const [opacity, setOpacity]   = useState(1);
  const [progress, setProgress] = useState(0);
  const [canSkip, setCanSkip]   = useState(false);

  const finish = () => {
    if (!visible) return;
    setOpacity(0);
    setTimeout(() => {
      setVisible(false);
      sessionStorage.setItem(SESSION_KEY, "1");
      onComplete();
    }, 800);
  };

  useEffect(() => {
    // Allow skip after 2 seconds
    const t = setTimeout(() => setCanSkip(true), 2000);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const onEnded = () => finish();
    const onTime  = () => {
      if (video.duration) setProgress(video.currentTime / video.duration);
    };
    video.addEventListener("ended", onEnded);
    video.addEventListener("timeupdate", onTime);
    return () => {
      video.removeEventListener("ended", onEnded);
      video.removeEventListener("timeupdate", onTime);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!visible) return null;

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 9999,
        background: "#000",
        opacity,
        transition: "opacity 0.8s ease",
      }}
    >
      {/* Video */}
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        style={{ width: "100%", height: "100%", objectFit: "cover" }}
      >
        <source src="/videos/hero.mp4" type="video/mp4" />
      </video>

      {/* Dark gradient overlay — top + bottom */}
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none",
        background: "linear-gradient(to bottom, rgba(0,0,0,0.35) 0%, transparent 30%, transparent 65%, rgba(0,0,0,0.75) 100%)",
      }} />

      {/* Logo */}
      <div style={{
        position: "absolute", top: 32, left: 0, right: 0,
        display: "flex", justifyContent: "center",
        animation: "fadeIn 1s ease 0.3s both",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: "#f97316",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z"/>
            </svg>
          </div>
          <span style={{
            color: "#fff", fontFamily: "Barlow Condensed, sans-serif",
            fontWeight: 900, fontSize: 22, letterSpacing: "0.12em",
            textTransform: "uppercase",
          }}>
            CourtBound
          </span>
        </div>
      </div>

      {/* Tagline */}
      <div style={{
        position: "absolute", bottom: 80, left: 0, right: 0,
        textAlign: "center",
        animation: "fadeIn 1s ease 0.8s both",
      }}>
        <p style={{
          color: "rgba(255,255,255,0.9)",
          fontFamily: "Barlow Condensed, sans-serif",
          fontWeight: 900, fontSize: 28,
          textTransform: "uppercase", letterSpacing: "0.15em",
          textShadow: "0 2px 20px rgba(0,0,0,0.8)",
        }}>
          Your direct line to US college basketball
        </p>
      </div>

      {/* Progress bar */}
      <div style={{
        position: "absolute", bottom: 0, left: 0, right: 0, height: 3,
        background: "rgba(255,255,255,0.15)",
      }}>
        <div style={{
          height: "100%", background: "#f97316",
          width: `${progress * 100}%`,
          transition: "width 0.1s linear",
        }} />
      </div>

      {/* Skip button */}
      {canSkip && (
        <button
          onClick={finish}
          style={{
            position: "absolute", bottom: 24, right: 24,
            background: "rgba(255,255,255,0.12)",
            border: "1px solid rgba(255,255,255,0.25)",
            color: "rgba(255,255,255,0.8)",
            padding: "8px 20px",
            borderRadius: 8,
            cursor: "pointer",
            fontSize: 13,
            fontWeight: 700,
            letterSpacing: "0.05em",
            backdropFilter: "blur(8px)",
            transition: "background 0.2s",
            animation: "fadeIn 0.4s ease both",
          }}
          onMouseEnter={e => e.target.style.background = "rgba(255,255,255,0.22)"}
          onMouseLeave={e => e.target.style.background = "rgba(255,255,255,0.12)"}
        >
          Skip →
        </button>
      )}

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
