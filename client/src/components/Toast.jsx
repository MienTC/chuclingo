import React, { createContext, useContext, useState, useCallback } from 'react';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback((type, message, title = '') => {
    const id = Date.now() + '-' + Math.random().toString(36).substring(2, 6);
    const newToast = { id, type, message, title };
    setToasts((prev) => [...prev, newToast]);

    setTimeout(() => {
      removeToast(id);
    }, 3800);
  }, [removeToast]);

  const toast = {
    success: (msg, title = 'Thành công') => addToast('success', msg, title),
    error: (msg, title = 'Đã có lỗi') => addToast('error', msg, title),
    info: (msg, title = 'Thông báo') => addToast('info', msg, title),
    warning: (msg, title = 'Lưu ý') => addToast('warning', msg, title)
  };

  return (
    <ToastContext.Provider value={toast}>
      {children}
      {/* Toast container */}
      <div className="toast-container" aria-live="polite">
        {toasts.map((t) => {
          const typeStyles = {
            success: {
              border: '#10b981',
              bg: '#f0fdf4',
              color: '#065f46',
              iconBg: '#10b981',
              icon: '✓'
            },
            error: {
              border: '#ef4444',
              bg: '#fef2f2',
              color: '#991b1b',
              iconBg: '#ef4444',
              icon: '✕'
            },
            info: {
              border: '#0284c7',
              bg: '#f0f9ff',
              color: '#075985',
              iconBg: '#0284c7',
              icon: 'ℹ'
            },
            warning: {
              border: '#f59e0b',
              bg: '#fffbeb',
              color: '#92400e',
              iconBg: '#f59e0b',
              icon: '!'
            }
          }[t.type] || {
            border: '#64748b',
            bg: '#f8fafc',
            color: '#1e293b',
            iconBg: '#64748b',
            icon: '•'
          };

          return (
            <div
              key={t.id}
              className="toast-item"
              style={{
                backgroundColor: typeStyles.bg,
                borderColor: typeStyles.border,
                color: typeStyles.color
              }}
            >
              <div
                style={{
                  width: '26px',
                  height: '26px',
                  borderRadius: '50%',
                  backgroundColor: typeStyles.iconBg,
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: '14px',
                  flexShrink: 0
                }}
              >
                {typeStyles.icon}
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                {t.title && (
                  <div style={{ fontWeight: 700, fontSize: '13px', marginBottom: '2px' }}>
                    {t.title}
                  </div>
                )}
                <div style={{ fontSize: '13px', lineHeight: '1.4', wordBreak: 'break-word' }}>
                  {t.message}
                </div>
              </div>

              <button
                onClick={() => removeToast(t.id)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: typeStyles.color,
                  cursor: 'pointer',
                  fontSize: '18px',
                  lineHeight: '1',
                  opacity: 0.65,
                  padding: '2px 4px',
                  flexShrink: 0
                }}
                title="Đóng"
              >
                ×
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    // Return safe fallback if not wrapped
    return {
      success: (msg) => console.log('Toast success:', msg),
      error: (msg) => console.error('Toast error:', msg),
      info: (msg) => console.log('Toast info:', msg),
      warning: (msg) => console.warn('Toast warning:', msg)
    };
  }
  return context;
}
