import React, { useState } from 'react';

const PINYIN_CHARS = [
  'ā', 'á', 'ǎ', 'à',
  'ē', 'é', 'ě', 'è',
  'ī', 'í', 'ǐ', 'ì',
  'ō', 'ó', 'ǒ', 'ò',
  'ū', 'ú', 'ǔ', 'ù',
  'ǖ', 'ǘ', 'ǚ', 'ǜ', 'ü'
];

const PUNCTUATIONS = ['，', '。', '？', '！', '、', '：', '“', '”', '《', '》'];

export default function VirtualKeyboard({ isOpen, onClose, onInsertChar }) {
  const [tab, setTab] = useState('pinyin'); // 'pinyin' | 'punct'

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      bottom: '70px',
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 1000,
      background: '#ffffff',
      border: '1px solid #cbd5e1',
      borderRadius: '12px',
      boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
      padding: '12px 16px',
      maxWidth: '520px',
      width: '95%'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => setTab('pinyin')}
            style={{
              padding: '4px 10px',
              borderRadius: '6px',
              border: '1px solid',
              borderColor: tab === 'pinyin' ? '#0284c7' : '#cbd5e1',
              background: tab === 'pinyin' ? '#0284c7' : '#ffffff',
              color: tab === 'pinyin' ? '#ffffff' : '#475569',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Pinyin (Ký tự phiên âm)
          </button>
          <button
            onClick={() => setTab('punct')}
            style={{
              padding: '4px 10px',
              borderRadius: '6px',
              border: '1px solid',
              borderColor: tab === 'punct' ? '#0284c7' : '#cbd5e1',
              background: tab === 'punct' ? '#0284c7' : '#ffffff',
              color: tab === 'punct' ? '#ffffff' : '#475569',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Dấu câu tiếng Trung
          </button>
        </div>

        <button
          onClick={onClose}
          style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '14px', fontWeight: 700 }}
        >
          ✕
        </button>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(38px, 1fr))',
        gap: '6px'
      }}>
        {(tab === 'pinyin' ? PINYIN_CHARS : PUNCTUATIONS).map((char) => (
          <button
            key={char}
            onClick={() => onInsertChar && onInsertChar(char)}
            style={{
              height: '36px',
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '6px',
              fontSize: '15px',
              fontWeight: 600,
              color: '#0f172a',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              userSelect: 'none'
            }}
            onMouseDown={(e) => e.preventDefault()} // prevent blur
          >
            {char}
          </button>
        ))}
      </div>
    </div>
  );
}
