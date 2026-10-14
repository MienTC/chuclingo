import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import DrawingCanvas from '../components/DrawingCanvas';
import AudioBar from '../components/AudioBar';
import AudioModal from '../components/AudioModal';
import { useToast } from '../components/Toast';

const COLORS = [
  '#ef4444', // Red
  '#f59e0b', // Orange/Yellow
  '#10b981', // Green
  '#0284c7', // Blue
  '#8b5cf6', // Purple
  '#0f172a'  // Dark
];

export default function SlideViewer() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();

  const [lesson, setLesson] = useState(null);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Drawing state
  const [isDrawingMode, setIsDrawingMode] = useState(false);
  const [tool, setTool] = useState('pencil'); // 'pencil' | 'eraser'
  const [color, setColor] = useState('#ef4444');
  const [lineWidth, setLineWidth] = useState(4);
  const [annotations, setAnnotations] = useState({});
  const [currentSlideDrawing, setCurrentSlideDrawing] = useState(null);

  // Audio list & mobile toolbar toggle
  const [isAudioModalOpen, setIsAudioModalOpen] = useState(false);
  const [currentAudios, setCurrentAudios] = useState([]);
  const [showMobileTools, setShowMobileTools] = useState(false);

  // Touch gesture tracking
  const touchStartX = useRef(0);
  const canvasRef = useRef(null);

  useEffect(() => {
    fetchLessonData();
  }, [id]);

  const fetchLessonData = async () => {
    try {
      setLoading(true);
      const [lessonRes, annotRes] = await Promise.all([
        axios.get(`/api/lessons/${id}`),
        axios.get(`/api/annotations/${id}`)
      ]);

      const l = lessonRes.data.data;
      setLesson(l);
      if (annotRes.data.data) {
        setAnnotations(annotRes.data.data);
      }

      const list = l.audios && l.audios.length > 0 ? l.audios : (l.audio ? [{ filename: l.audio, title: l.audio, url: `/audio/${l.audio}` }] : []);
      setCurrentAudios(list);

      setLoading(false);
    } catch (err) {
      setError(err.response?.data?.message || 'Lỗi khi tải bài học');
      toast.error('Lỗi khi tải bài học: ' + (err.response?.data?.message || err.message));
      setLoading(false);
    }
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (e.key === 'ArrowRight' || e.key === 'Space') {
        goToNextSlide();
      } else if (e.key === 'ArrowLeft') {
        goToPrevSlide();
      } else if (e.key.toLowerCase() === 'p') {
        setIsDrawingMode((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lesson, currentSlideIndex]);

  const goToNextSlide = () => {
    if (!lesson) return;
    if (currentSlideIndex < lesson.slides.length - 1) {
      setCurrentSlideIndex((prev) => prev + 1);
    }
  };

  const goToPrevSlide = () => {
    if (currentSlideIndex > 0) {
      setCurrentSlideIndex((prev) => prev - 1);
    }
  };

  // Touch swipe handlers
  const handleTouchStart = (e) => {
    if (isDrawingMode) return;
    touchStartX.current = e.targetTouches[0].clientX;
  };

  const handleTouchEnd = (e) => {
    if (isDrawingMode) return;
    const touchEndX = e.changedTouches[0].clientX;
    const diff = touchStartX.current - touchEndX;
    if (diff > 50) {
      goToNextSlide(); // Swipe left -> Next
    } else if (diff < -50) {
      goToPrevSlide(); // Swipe right -> Prev
    }
  };

  const handleCanvasSave = (dataUrl) => {
    setCurrentSlideDrawing(dataUrl);
    setAnnotations((prev) => ({
      ...prev,
      [currentSlideIndex]: dataUrl
    }));
  };

  const persistDrawingToBackend = async () => {
    let drawingData = annotations[currentSlideIndex] || currentSlideDrawing;
    if (canvasRef.current && canvasRef.current.getDataURL) {
      const activeData = canvasRef.current.getDataURL();
      if (activeData) drawingData = activeData;
    }

    if (!drawingData) {
      toast.warning('Chưa có nét vẽ để lưu');
      return;
    }

    try {
      await axios.post(`/api/annotations/${id}`, {
        slideIndex: currentSlideIndex,
        drawingData
      });
      setAnnotations((prev) => ({
        ...prev,
        [currentSlideIndex]: drawingData
      }));
      toast.success('Đã lưu nét vẽ slide thành công!');
    } catch (err) {
      console.error(err);
      toast.error('Lỗi khi lưu nét vẽ: ' + (err.response?.data?.message || err.message));
    }
  };

  const clearCurrentSlideDrawing = async () => {
    try {
      await axios.delete(`/api/annotations/${id}/${currentSlideIndex}`);
      setAnnotations((prev) => {
        const updated = { ...prev };
        delete updated[currentSlideIndex];
        return updated;
      });
      setCurrentSlideDrawing(null);
      if (canvasRef.current && canvasRef.current.clear) {
        canvasRef.current.clear();
      }
      toast.info('Đã xóa nét vẽ trên slide này');
    } catch (err) {
      console.error(err);
      toast.error('Lỗi khi xóa nét vẽ');
    }
  };

  // Download Markdown (.md)
  const downloadMarkdown = () => {
    if (!lesson || !lesson.rawContent) return;
    const blob = new Blob([lesson.rawContent], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${lesson.id || 'slide'}.md`;
    a.click();
    URL.revokeObjectURL(url);
    toast.info('Đang tải file bài giảng (.md)...');
  };

  // Print to PDF
  const handlePrintPDF = () => {
    window.print();
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', color: '#64748b', fontWeight: 600 }}>
        Đang tải bài học...
      </div>
    );
  }

  if (error || !lesson) {
    return (
      <div style={{ textAlign: 'center', paddingTop: '100px', paddingLeft: '20px', paddingRight: '20px' }}>
        <h2 style={{ color: '#ef4444' }}>{error || 'Không tìm thấy bài học'}</h2>
        <Link to="/" className="duo-btn duo-btn-blue" style={{ marginTop: '16px', display: 'inline-block' }}>
          Quay lại danh sách
        </Link>
      </div>
    );
  }

  const currentSlide = lesson.slides[currentSlideIndex] || { content: '' };
  const progressPercent = Math.round(((currentSlideIndex + 1) / lesson.slides.length) * 100);

  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      background: '#f8fafc',
      overflow: 'hidden',
      position: 'relative'
    }}>
      {/* Top Header */}
      <header className="no-print" style={{
        minHeight: '56px',
        padding: '0 12px',
        background: '#ffffff',
        borderBottom: '1px solid #e2e8f0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        zIndex: 50,
        gap: '8px'
      }}>
        {/* Left: Exit & Title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
          <button
            onClick={() => navigate('/')}
            className="duo-btn duo-btn-secondary"
            style={{ padding: '6px 10px', fontSize: '12px', flexShrink: 0 }}
          >
            ← Thoát
          </button>

          <div style={{ minWidth: 0, overflow: 'hidden' }}>
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {lesson.title}
            </div>
            <div style={{ fontSize: '11px', color: '#64748b' }}>
              {lesson.topic}
            </div>
          </div>
        </div>

        {/* Center: Slide Progress Indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
          <div style={{
            width: '80px',
            height: '6px',
            background: '#e2e8f0',
            borderRadius: '999px',
            overflow: 'hidden'
          }}>
            <div style={{
              width: `${progressPercent}%`,
              height: '100%',
              background: '#0284c7',
              borderRadius: '999px',
              transition: 'width 0.2s ease'
            }} />
          </div>
          <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', whiteSpace: 'nowrap' }}>
            {currentSlideIndex + 1}/{lesson.slides.length}
          </span>
        </div>

        {/* Right Section Desktop Tools */}
        <div className="desktop-tools" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* Audio Bar */}
          <AudioBar
            audioList={currentAudios}
            onOpenModal={() => setIsAudioModalOpen(true)}
          />

          {/* Download & Export */}
          <div style={{ display: 'flex', gap: '4px' }}>
            <button
              onClick={downloadMarkdown}
              className="duo-btn duo-btn-secondary"
              style={{ padding: '5px 8px', fontSize: '12px' }}
              title="Tải file Markdown bài giảng"
            >
              .MD
            </button>
            <button
              onClick={handlePrintPDF}
              className="duo-btn duo-btn-secondary"
              style={{ padding: '5px 8px', fontSize: '12px' }}
              title="Xuất slide ra PDF (In slide)"
            >
              PDF
            </button>
          </div>

          {/* Desktop Drawing Tools */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            background: '#f8fafc',
            padding: '3px 8px',
            borderRadius: '8px',
            border: '1px solid #e2e8f0'
          }}>
            <button
              onClick={() => setIsDrawingMode(!isDrawingMode)}
              className={`duo-btn ${isDrawingMode ? 'duo-btn-blue' : 'duo-btn-secondary'}`}
              style={{ padding: '5px 10px', fontSize: '12px' }}
            >
              {isDrawingMode ? '✏️ Bật vẽ' : '✏️ Vẽ'}
            </button>

            {isDrawingMode && (
              <>
                <button
                  onClick={() => setTool(tool === 'pencil' ? 'eraser' : 'pencil')}
                  style={{
                    padding: '5px 8px',
                    borderRadius: '6px',
                    background: tool === 'eraser' ? '#f59e0b' : '#ffffff',
                    color: tool === 'eraser' ? '#fff' : '#334155',
                    border: '1px solid #cbd5e1',
                    fontWeight: 600,
                    fontSize: '12px',
                    cursor: 'pointer'
                  }}
                  title={tool === 'pencil' ? 'Chuyển sang tẩy' : 'Chuyển sang bút'}
                >
                  {tool === 'pencil' ? 'Bút' : 'Tẩy'}
                </button>

                {tool === 'pencil' && (
                  <div style={{ display: 'flex', gap: '4px' }}>
                    {COLORS.map((c) => (
                      <button
                        key={c}
                        onClick={() => setColor(c)}
                        style={{
                          width: '18px',
                          height: '18px',
                          borderRadius: '50%',
                          backgroundColor: c,
                          border: color === c ? '2px solid #0f172a' : '1px solid #cbd5e1',
                          cursor: 'pointer'
                        }}
                      />
                    ))}
                  </div>
                )}

                <button
                  onClick={clearCurrentSlideDrawing}
                  style={{
                    padding: '4px 8px',
                    borderRadius: '6px',
                    background: '#ffffff',
                    border: '1px solid #ef4444',
                    color: '#ef4444',
                    fontSize: '11px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                  title="Xóa hết nét vẽ trên slide này"
                >
                  Xóa
                </button>

                <button
                  onClick={persistDrawingToBackend}
                  style={{
                    padding: '4px 8px',
                    borderRadius: '6px',
                    background: '#10b981',
                    border: 'none',
                    color: '#ffffff',
                    fontSize: '11px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Lưu
                </button>
              </>
            )}
          </div>
        </div>

        {/* Mobile Tools Toggle Button */}
        <div className="mobile-tools-toggle" style={{ display: 'none' }}>
          <button
            onClick={() => setShowMobileTools(!showMobileTools)}
            className={`duo-btn ${showMobileTools ? 'duo-btn-blue' : 'duo-btn-secondary'}`}
            style={{ padding: '6px 10px', fontSize: '12px' }}
          >
            🛠️ Menu
          </button>
        </div>
      </header>

      {/* Mobile Expandable Tools Bar */}
      {showMobileTools && (
        <div className="no-print mobile-tools-drawer" style={{
          background: '#ffffff',
          borderBottom: '1px solid #cbd5e1',
          padding: '8px 12px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          zIndex: 45
        }}>
          {/* Audio bar row */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <AudioBar
              audioList={currentAudios}
              onOpenModal={() => setIsAudioModalOpen(true)}
            />
            <div style={{ display: 'flex', gap: '4px' }}>
              <button
                onClick={downloadMarkdown}
                className="duo-btn duo-btn-secondary"
                style={{ padding: '5px 8px', fontSize: '11px' }}
              >
                .MD
              </button>
              <button
                onClick={handlePrintPDF}
                className="duo-btn duo-btn-secondary"
                style={{ padding: '5px 8px', fontSize: '11px' }}
              >
                PDF
              </button>
            </div>
          </div>

          {/* Drawing row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            <button
              onClick={() => setIsDrawingMode(!isDrawingMode)}
              className={`duo-btn ${isDrawingMode ? 'duo-btn-blue' : 'duo-btn-secondary'}`}
              style={{ padding: '4px 10px', fontSize: '12px' }}
            >
              {isDrawingMode ? '✏️ Đang vẽ' : '✏️ Vẽ màn hình'}
            </button>

            {isDrawingMode && (
              <>
                <button
                  onClick={() => setTool(tool === 'pencil' ? 'eraser' : 'pencil')}
                  className="duo-btn duo-btn-secondary"
                  style={{ padding: '4px 8px', fontSize: '11px' }}
                >
                  {tool === 'pencil' ? 'Bút' : 'Tẩy'}
                </button>

                {tool === 'pencil' && (
                  <div style={{ display: 'flex', gap: '4px' }}>
                    {COLORS.map((c) => (
                      <button
                        key={c}
                        onClick={() => setColor(c)}
                        style={{
                          width: '18px',
                          height: '18px',
                          borderRadius: '50%',
                          backgroundColor: c,
                          border: color === c ? '2px solid #0f172a' : '1px solid #cbd5e1'
                        }}
                      />
                    ))}
                  </div>
                )}

                <button
                  onClick={clearCurrentSlideDrawing}
                  className="duo-btn duo-btn-danger"
                  style={{ padding: '4px 8px', fontSize: '11px' }}
                >
                  Xóa nét
                </button>

                <button
                  onClick={persistDrawingToBackend}
                  className="duo-btn duo-btn-green"
                  style={{ padding: '4px 8px', fontSize: '11px' }}
                >
                  Lưu nét
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Main Slide Presentation Stage */}
      <main
        style={{
          flex: 1,
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '12px',
          overflow: 'hidden'
        }}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <div style={{
          width: '100%',
          maxWidth: '1280px',
          height: '84vh',
          background: '#ffffff',
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: '0 4px 15px rgba(0,0,0,0.04)'
        }} className="slide-card-container">
          {/* Slide Markdown Content */}
          <div
            style={{
              padding: '36px 54px',
              flex: 1,
              overflowY: 'auto'
            }}
            className="slide-content-area"
          >
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              rehypePlugins={[rehypeRaw]}
              components={{
                h1: ({ node, ...props }) => <h1 style={{ fontSize: '2.2rem', fontWeight: 700, marginBottom: '18px', color: '#0284c7', borderBottom: '2px solid #e2e8f0', paddingBottom: '10px' }} {...props} />,
                h2: ({ node, ...props }) => <h2 style={{ fontSize: '1.6rem', fontWeight: 700, marginTop: '18px', marginBottom: '12px', color: '#d97706' }} {...props} />,
                h3: ({ node, ...props }) => <h3 style={{ fontSize: '1.3rem', fontWeight: 600, marginTop: '12px', marginBottom: '8px', color: '#059669' }} {...props} />,
                p: ({ node, ...props }) => <p style={{ marginBottom: '12px', color: '#334155' }} {...props} />,
                ul: ({ node, ...props }) => <ul style={{ paddingLeft: '24px', marginBottom: '12px' }} {...props} />,
                ol: ({ node, ...props }) => <ol style={{ paddingLeft: '24px', marginBottom: '12px' }} {...props} />,
                li: ({ node, ...props }) => <li style={{ marginBottom: '6px' }} {...props} />,
                table: ({ node, ...props }) => (
                  <div style={{ overflowX: 'auto', margin: '18px 0' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #e2e8f0', borderRadius: '8px' }} {...props} />
                  </div>
                ),
                th: ({ node, ...props }) => (
                  <th style={{ background: '#f8fafc', padding: '10px 14px', border: '1px solid #e2e8f0', textAlign: 'left', color: '#0284c7', fontWeight: 600 }} {...props} />
                ),
                td: ({ node, ...props }) => (
                  <td style={{ padding: '10px 14px', border: '1px solid #e2e8f0', color: '#334155' }} {...props} />
                ),
                blockquote: ({ node, ...props }) => (
                  <blockquote style={{ borderLeft: '4px solid #0284c7', paddingLeft: '14px', margin: '14px 0', background: '#f0f9ff', padding: '10px 14px', borderRadius: '0 8px 8px 0', color: '#334155' }} {...props} />
                ),
                code: ({ node, inline, ...props }) => (
                  inline ? (
                    <code style={{ background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px', color: '#dc2626', fontWeight: 600 }} {...props} />
                  ) : (
                    <code style={{ display: 'block', background: '#f8fafc', padding: '14px', borderRadius: '8px', border: '1px solid #e2e8f0', overflowX: 'auto', margin: '12px 0' }} {...props} />
                  )
                )
              }}
            >
              {currentSlide.content}
            </ReactMarkdown>
          </div>

          {/* Interactive Drawing Layer Overlay */}
          <DrawingCanvas
            ref={canvasRef}
            isDrawingMode={isDrawingMode}
            color={color}
            lineWidth={lineWidth}
            tool={tool}
            savedData={annotations[currentSlideIndex] || null}
            onSave={handleCanvasSave}
          />
        </div>
      </main>

      {/* Footer Navigation Bar */}
      <footer className="no-print" style={{
        height: '56px',
        background: '#ffffff',
        borderTop: '1px solid #e2e8f0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 20px',
        zIndex: 40
      }}>
        <button
          onClick={goToPrevSlide}
          disabled={currentSlideIndex === 0}
          className="duo-btn duo-btn-secondary"
          style={{ opacity: currentSlideIndex === 0 ? 0.4 : 1, cursor: currentSlideIndex === 0 ? 'not-allowed' : 'pointer', padding: '6px 14px', fontSize: '13px' }}
        >
          ← Trước
        </button>

        {/* Desktop Dots Navigation */}
        <div className="slide-dots-desktop" style={{ display: 'flex', gap: '6px', maxWidth: '50vw', overflowX: 'auto', padding: '4px' }}>
          {lesson.slides.map((_, idx) => (
            <div
              key={idx}
              onClick={() => setCurrentSlideIndex(idx)}
              style={{
                width: currentSlideIndex === idx ? '16px' : '8px',
                height: '8px',
                borderRadius: '4px',
                background: currentSlideIndex === idx ? '#0284c7' : '#cbd5e1',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                flexShrink: 0
              }}
              title={`Slide ${idx + 1}`}
            />
          ))}
        </div>

        {/* Mobile Slide Counter */}
        <div className="slide-counter-mobile" style={{ display: 'none', fontSize: '13px', fontWeight: 600, color: '#0f172a' }}>
          {currentSlideIndex + 1} / {lesson.slides.length}
        </div>

        <button
          onClick={goToNextSlide}
          disabled={currentSlideIndex === lesson.slides.length - 1}
          className="duo-btn duo-btn-blue"
          style={{ opacity: currentSlideIndex === lesson.slides.length - 1 ? 0.4 : 1, cursor: currentSlideIndex === lesson.slides.length - 1 ? 'not-allowed' : 'pointer', padding: '6px 14px', fontSize: '13px' }}
        >
          Tiếp theo →
        </button>
      </footer>

      {/* Audio Modal */}
      <AudioModal
        isOpen={isAudioModalOpen}
        onClose={() => setIsAudioModalOpen(false)}
        onSelectAudio={(selected) => {
          if (!currentAudios.some(a => a.filename === selected.filename)) {
            setCurrentAudios(prev => [...prev, selected]);
            toast.success(`Đã thêm audio: ${selected.title}`);
          }
        }}
        currentSelectedList={currentAudios}
      />
    </div>
  );
}
