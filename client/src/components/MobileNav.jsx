import React from 'react';
import { Link, useLocation } from 'react-router-dom';

export default function MobileNav({ onOpenAudioModal, rightAction }) {
  const location = useLocation();
  const currentPath = location.pathname;

  return (
    <>
      {/* Mobile Top Header */}
      <header className="duo-mobile-header">
        <Link to="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '20px' }}>🐼</span>
          <span style={{ fontSize: '18px', fontWeight: 800, color: '#0284c7', letterSpacing: '-0.5px' }}>
            ChucLingo
          </span>
        </Link>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {rightAction}
          <button
            onClick={onOpenAudioModal}
            className="duo-btn duo-btn-secondary"
            style={{ padding: '6px 10px', fontSize: '12px' }}
          >
            🎵 Audio
          </button>
        </div>
      </header>

      {/* Mobile Bottom Fixed Navigation */}
      <nav className="duo-mobile-bottom-nav">
        <Link
          to="/"
          className={`duo-mobile-nav-btn ${currentPath === '/' ? 'active' : ''}`}
        >
          <span className="nav-icon">📖</span>
          <span>Bài học</span>
        </Link>

        <Link
          to="/admin"
          className={`duo-mobile-nav-btn ${currentPath === '/admin' ? 'active' : ''}`}
        >
          <span className="nav-icon">⚙️</span>
          <span>Quản trị</span>
        </Link>

        <button
          type="button"
          onClick={onOpenAudioModal}
          className="duo-mobile-nav-btn"
        >
          <span className="nav-icon">🎵</span>
          <span>Kho Audio</span>
        </button>
      </nav>
    </>
  );
}
