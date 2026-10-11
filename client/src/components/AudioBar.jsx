import React, { useRef, useState, useEffect } from 'react';

export default function AudioBar({ audioList = [], onOpenModal }) {
  const audioRef = useRef(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);

  // Normalize list
  const validList = Array.isArray(audioList) ? audioList : [];
  const currentAudio = validList[currentIndex] || null;
  const audioSrc = currentAudio ? currentAudio.url : null;
  const audioTitle = currentAudio ? currentAudio.title : '';

  useEffect(() => {
    setIsPlaying(false);
    setCurrentTime(0);
    if (audioRef.current) {
      audioRef.current.load();
    }
  }, [currentIndex, audioSrc]);

  const togglePlay = () => {
    if (!audioRef.current || !audioSrc) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().catch(e => console.error(e));
      setIsPlaying(true);
    }
  };

  const handleNextAudio = () => {
    if (validList.length > 1) {
      setCurrentIndex((prev) => (prev + 1) % validList.length);
    }
  };

  const handlePrevAudio = () => {
    if (validList.length > 1) {
      setCurrentIndex((prev) => (prev - 1 + validList.length) % validList.length);
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
      setDuration(audioRef.current.duration || 0);
    }
  };

  const handleSeek = (e) => {
    const time = Number(e.target.value);
    setCurrentTime(time);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
    }
  };

  const handleRateChange = (rate) => {
    setPlaybackRate(rate);
    if (audioRef.current) {
      audioRef.current.playbackRate = rate;
    }
  };

  const formatTime = (secs) => {
    if (isNaN(secs)) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div style={{
      background: '#ffffff',
      border: '1px solid #cbd5e1',
      borderRadius: '8px',
      padding: '4px 10px',
      display: 'flex',
      alignItems: 'center',
      gap: '8px'
    }}>
      {audioSrc && (
        <audio
          ref={audioRef}
          src={audioSrc}
          onTimeUpdate={handleTimeUpdate}
          onEnded={() => {
            setIsPlaying(false);
            if (currentIndex < validList.length - 1) {
              handleNextAudio();
            }
          }}
        />
      )}

      {/* Play/Pause */}
      <button
        onClick={togglePlay}
        disabled={!audioSrc}
        style={{
          width: '32px',
          height: '32px',
          borderRadius: '50%',
          background: isPlaying ? '#ef4444' : '#0284c7',
          border: 'none',
          color: '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '13px',
          cursor: audioSrc ? 'pointer' : 'not-allowed',
          opacity: audioSrc ? 1 : 0.4
        }}
        title={isPlaying ? "Tạm dừng" : "Phát audio"}
      >
        {isPlaying ? '⏸' : '▶'}
      </button>

      {/* Playlist Select Dropdown if multiple audios */}
      {validList.length > 0 ? (
        <select
          value={currentIndex}
          onChange={(e) => setCurrentIndex(Number(e.target.value))}
          style={{
            maxWidth: '180px',
            padding: '4px 6px',
            fontSize: '13px',
            fontWeight: 600,
            color: '#1e293b',
            background: '#f8fafc',
            border: '1px solid #cbd5e1',
            borderRadius: '6px',
            outline: 'none',
            cursor: 'pointer'
          }}
        >
          {validList.map((item, idx) => (
            <option key={idx} value={idx}>
              {idx + 1}. {item.title || item.filename}
            </option>
          ))}
        </select>
      ) : (
        <span style={{ fontSize: '13px', color: '#94a3b8' }}>
          Chưa gắn audio
        </span>
      )}

      {/* Previous / Next buttons if more than 1 audio */}
      {validList.length > 1 && (
        <div style={{ display: 'flex', gap: '2px' }}>
          <button
            onClick={handlePrevAudio}
            style={{ padding: '2px 6px', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '4px', cursor: 'pointer', fontSize: '11px' }}
            title="Audio trước"
          >
            ⏮
          </button>
          <button
            onClick={handleNextAudio}
            style={{ padding: '2px 6px', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '4px', cursor: 'pointer', fontSize: '11px' }}
            title="Audio sau"
          >
            ⏭
          </button>
        </div>
      )}

      {/* Progress & Speed */}
      {audioSrc && (
        <>
          <span style={{ fontSize: '12px', color: '#64748b', minWidth: '28px' }}>
            {formatTime(currentTime)}
          </span>

          <input
            type="range"
            min={0}
            max={duration || 100}
            value={currentTime}
            onChange={handleSeek}
            style={{
              width: '75px',
              accentColor: '#0284c7',
              cursor: 'pointer'
            }}
          />

          <button
            onClick={() => handleRateChange(playbackRate === 1 ? 0.75 : playbackRate === 0.75 ? 1.25 : 1)}
            style={{
              padding: '2px 6px',
              fontSize: '11px',
              fontWeight: 600,
              borderRadius: '4px',
              background: '#f8fafc',
              color: '#0284c7',
              border: '1px solid #cbd5e1',
              cursor: 'pointer'
            }}
          >
            {playbackRate}x
          </button>
        </>
      )}

      {/* Open Audio Modal */}
      <button
        onClick={onOpenModal}
        style={{
          padding: '4px 10px',
          borderRadius: '6px',
          background: '#f8fafc',
          color: '#475569',
          border: '1px solid #cbd5e1',
          fontSize: '12px',
          fontWeight: 600,
          cursor: 'pointer'
        }}
        title="Mở kho audio"
      >
        Kho audio
      </button>
    </div>
  );
}
