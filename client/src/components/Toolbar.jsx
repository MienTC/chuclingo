import React from 'react';

const COLORS = [
  '#ef4444', // Red
  '#f59e0b', // Yellow
  '#10b981', // Green
  '#3b82f6', // Blue
  '#8b5cf6', // Purple
  '#ffffff', // White
];

export default function Toolbar({
  isDrawingMode,
  setIsDrawingMode,
  tool,
  setTool,
  color,
  setColor,
  lineWidth,
  setLineWidth,
  onClear,
  onSaveDrawings,
  hasDrawing
}) {
  return (
    <div style={{
      position: 'fixed',
      bottom: '24px',
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 50,
      background: 'rgba(15, 23, 42, 0.9)',
      backdropFilter: 'blur(12px)',
      border: '1px solid #334155',
      borderRadius: '20px',
      padding: '8px 18px',
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      boxShadow: '0 10px 30px rgba(0,0,0,0.5)'
    }}>
      {/* Toggle Drawing Mode */}
      <button
        onClick={() => setIsDrawingMode(!isDrawingMode)}
        style={{
          padding: '8px 14px',
          borderRadius: '10px',
          background: isDrawingMode ? '#3b82f6' : '#1e293b',
          color: '#fff',
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          gap: '6px'
        }}
      >
        <span>✏️</span> {isDrawingMode ? 'Đang bật vẽ' : 'Bật viết/vẽ'}
      </button>

      {isDrawingMode && (
        <>
          <div style={{ height: '24px', width: '1px', background: '#334155' }} />

          {/* Tool: Pen vs Eraser */}
          <div style={{ display: 'flex', gap: '4px' }}>
            <button
              onClick={() => setTool('pencil')}
              style={{
                padding: '6px 12px',
                borderRadius: '8px',
                background: tool === 'pencil' ? '#2563eb' : '#1e293b',
                color: '#fff',
                fontSize: '13px'
              }}
            >
              Bút chì
            </button>
            <button
              onClick={() => setTool('eraser')}
              style={{
                padding: '6px 12px',
                borderRadius: '8px',
                background: tool === 'eraser' ? '#2563eb' : '#1e293b',
                color: '#fff',
                fontSize: '13px'
              }}
            >
              Tẩy 🧽
            </button>
          </div>

          {/* Color palette */}
          {tool === 'pencil' && (
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
              {COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  style={{
                    width: '22px',
                    height: '22px',
                    borderRadius: '50%',
                    backgroundColor: c,
                    border: color === c ? '2px solid #fff' : '2px solid transparent',
                    boxShadow: color === c ? '0 0 8px ' + c : 'none',
                    transform: color === c ? 'scale(1.2)' : 'scale(1)',
                    transition: 'all 0.15s ease'
                  }}
                />
              ))}
            </div>
          )}

          {/* Line width slider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '12px', color: '#94a3b8' }}>Cỡ:</span>
            <input
              type="range"
              min="2"
              max="16"
              value={lineWidth}
              onChange={(e) => setLineWidth(Number(e.target.value))}
              style={{ width: '60px', accentColor: '#3b82f6' }}
            />
          </div>

          <div style={{ height: '24px', width: '1px', background: '#334155' }} />

          {/* Clear & Save */}
          <button
            onClick={onClear}
            style={{
              padding: '6px 10px',
              borderRadius: '8px',
              background: '#ef444420',
              color: '#ef4444',
              border: '1px solid #ef444450',
              fontSize: '13px'
            }}
            title="Xóa trắng nét vẽ slide này"
          >
            🗑️ Xóa hết
          </button>

          <button
            onClick={onSaveDrawings}
            style={{
              padding: '6px 12px',
              borderRadius: '8px',
              background: '#10b981',
              color: '#fff',
              fontWeight: 600,
              fontSize: '13px'
            }}
          >
            💾 Lưu nét vẽ
          </button>
        </>
      )}
    </div>
  );
}
