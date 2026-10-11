import React, { useState, useEffect } from 'react';
import axios from 'axios';

export default function AudioModal({ isOpen, onClose, onSelectAudio, currentSelectedList = [] }) {
  const [audioList, setAudioList] = useState([]);
  const [playingFile, setPlayingFile] = useState(null);
  const [audioElem, setAudioElem] = useState(null);
  const [activeGroup, setActiveGroup] = useState('ALL');

  useEffect(() => {
    if (isOpen) {
      fetchAudioList();
    } else {
      if (audioElem) {
        audioElem.pause();
      }
      setPlayingFile(null);
    }
  }, [isOpen]);

  const fetchAudioList = async () => {
    try {
      const res = await axios.get('/api/audio');
      setAudioList(res.data.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handlePlayToggle = (file) => {
    if (playingFile === file.filename) {
      if (audioElem) {
        audioElem.pause();
      }
      setPlayingFile(null);
    } else {
      if (audioElem) {
        audioElem.pause();
      }
      const newAudio = new Audio(file.url);
      newAudio.play().catch(e => console.error(e));
      newAudio.onended = () => setPlayingFile(null);
      setAudioElem(newAudio);
      setPlayingFile(file.filename);
    }
  };

  // Group audios by lessonTitle or lessonId
  const groups = ['ALL', ...new Set(audioList.map((a) => a.lessonTitle || 'Chung'))];

  const filtered = activeGroup === 'ALL'
    ? audioList
    : audioList.filter((a) => (a.lessonTitle || 'Chung') === activeGroup);

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(15, 23, 42, 0.6)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999
    }}>
      <div style={{
        background: '#ffffff',
        borderRadius: '12px',
        width: '90%',
        maxWidth: '700px',
        maxHeight: '85vh',
        boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        border: '1px solid #cbd5e1'
      }}>
        {/* Modal Header */}
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>
              Kho file âm thanh
            </h3>
            <p style={{ fontSize: '13px', color: '#64748b' }}>
              Quản lý và chọn audio theo từng bài học
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '6px',
              background: '#f1f5f9',
              border: 'none',
              fontSize: '14px',
              color: '#64748b',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            ✕
          </button>
        </div>

        {/* Group Filter Tabs (Bài 1, Bài 2, v.v.) */}
        <div style={{
          display: 'flex',
          gap: '8px',
          padding: '12px 20px',
          background: '#f8fafc',
          borderBottom: '1px solid #e2e8f0',
          overflowX: 'auto'
        }}>
          {groups.map((grp) => (
            <button
              key={grp}
              onClick={() => setActiveGroup(grp)}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                border: '1px solid',
                borderColor: activeGroup === grp ? '#0284c7' : '#cbd5e1',
                background: activeGroup === grp ? '#0284c7' : '#ffffff',
                color: activeGroup === grp ? '#ffffff' : '#475569',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                whiteSpace: 'nowrap'
              }}
            >
              {grp === 'ALL' ? 'Tất cả' : grp}
            </button>
          ))}
        </div>

        {/* List of Audio files */}
        <div style={{ padding: '16px 20px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '36px 0', color: '#94a3b8' }}>
              Chưa có file âm thanh trong mục này.
            </div>
          ) : (
            filtered.map((a) => {
              const isSelected = currentSelectedList.some(item => (typeof item === 'string' ? item : item.filename) === a.filename);
              const isPlaying = playingFile === a.filename;

              return (
                <div
                  key={a.filename}
                  style={{
                    background: isSelected ? '#f0f9ff' : '#ffffff',
                    border: '1px solid',
                    borderColor: isSelected ? '#38bdf8' : '#e2e8f0',
                    borderRadius: '8px',
                    padding: '10px 14px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '12px'
                  }}
                >
                  <button
                    onClick={() => handlePlayToggle(a)}
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '50%',
                      background: isPlaying ? '#ef4444' : '#0284c7',
                      border: 'none',
                      color: '#fff',
                      fontSize: '14px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      flexShrink: 0
                    }}
                  >
                    {isPlaying ? '⏸' : '▶'}
                  </button>

                  <div style={{ flex: 1, overflow: 'hidden' }}>
                    <div style={{ fontWeight: 600, fontSize: '14px', color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {a.title || a.filename}
                    </div>
                    <div style={{ fontSize: '12px', color: '#64748b' }}>
                      Mục: <span style={{ fontWeight: 600, color: '#0284c7' }}>{a.lessonTitle || 'Chung'}</span> • {(a.size / 1024).toFixed(0)} KB
                    </div>
                  </div>

                  {onSelectAudio && (
                    <button
                      onClick={() => onSelectAudio(a)}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '6px',
                        background: isSelected ? '#ef444415' : '#0284c7',
                        border: isSelected ? '1px solid #ef4444' : 'none',
                        color: isSelected ? '#ef4444' : '#ffffff',
                        fontWeight: 600,
                        fontSize: '12px',
                        cursor: 'pointer'
                      }}
                    >
                      {isSelected ? 'Bỏ chọn' : '+ Thêm vào bài'}
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '12px 20px',
          borderTop: '1px solid #e2e8f0',
          display: 'flex',
          justifyContent: 'flex-end',
          background: '#f8fafc'
        }}>
          <button
            onClick={onClose}
            className="duo-btn duo-btn-secondary"
            style={{ padding: '6px 16px' }}
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
