import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import DrawingCanvas from '../components/DrawingCanvas';
import AudioBar from '../components/AudioBar';
import AudioModal from '../components/AudioModal';

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
  const [saveToast, setSaveToast] = useState('');

  // Audio list
  const [isAudioModalOpen, setIsAudioModalOpen] = useState(false);
  const [currentAudios, setCurrentAudios] = useState([]);

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

  const handleCanvasSave = (dataUrl) => {
    setCurrentSlideDrawing(dataUrl);
    setAnnotations((prev) => ({
      ...prev,
      [currentSlideIndex]: dataUrl
    }));
  };

  const canvasRef = React.useRef(null);

  const persistDrawingToBackend = async () => {
    let drawingData = annotations[currentSlideIndex] || currentSlideDrawing;
    if (canvasRef.current && canvasRef.current.getDataURL) {
      const activeData = canvasRef.current.getDataURL();
      if (activeData) drawingData = activeData;
    }

    if (!drawingData) {
      showToast('Chưa có nét vẽ để lưu');
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
      showToast('Đã lưu nét vẽ thành công');
    } catch (err) {
      console.error(err);
      showToast('Lỗi khi lưu nét vẽ: ' + (err.response?.data?.message || err.message));
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
      showToast('Đã xóa nét vẽ');
    } catch (err) {
      console.error(err);
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
    showToast('Đang tải file bài giảng (.md)...');
  };

  // Print to PDF
  const handlePrintPDF = () => {
    window.print();
  };

  const showToast = (msg) => {
    setSaveToast(msg);
    setTimeout(() => setSaveToast(''), 2500);
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
      <div style={{ textAlign: 'center', paddingTop: '100px' }}>
        <h2 style={{ color: '#ef4444' }}>{error || 'Không tìm thấy bài học'}</h2>
        <Link to="/" className="duo-btn duo-btn-blue" style={{ marginTop: '16px' }}>
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
        height: '60px',
        padding: '0 16px',
        background: '#ffffff',
        borderBottom: '1px solid #e2e8f0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        zIndex: 50,
        gap: '12px'
      }}>
        {/* Left: Exit & Title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            onClick={() => navigate('/')}
            className="duo-btn duo-btn-secondary"
            style={{ padding: '6px 12px', fontSize: '13px' }}
          >
            Thoát
          </button>

          <div>
            <div style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a', maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {lesson.title}
            </div>
            <div style={{ fontSize: '12px', color: '#64748b' }}>
              {lesson.topic}
            </div>
          </div>
        </div>

        {/* Center: Slide Progress Bar */}
        <div style={{ flex: 1, maxWidth: '240px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            flex: 1,
            height: '8px',
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
          <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748b' }}>
            {currentSlideIndex + 1}/{lesson.slides.length}
          </span>
        </div>

        {/* Right Section: Multi Audio Bar, Keyboard, Download & Drawing Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* Multi Audio Bar */}
          <AudioBar
            audioList={currentAudios}
            onOpenModal={() => setIsAudioModalOpen(true)}
          />

          {/* Download Slide Dropdown/Buttons */}
          <div style={{ display: 'flex', gap: '4px' }}>
            <button
              onClick={downloadMarkdown}
              className="duo-btn duo-btn-secondary"
              style={{ padding: '5px 8px', fontSize: '12px' }}
              title="Tải file Markdown bài giảng"
            >
              Tải .MD
            </button>
            <button
              onClick={handlePrintPDF}
              className="duo-btn duo-btn-secondary"
              style={{ padding: '5px 8px', fontSize: '12px' }}
              title="Xuất slide ra PDF (In slide)"
            >
              Xuất PDF
            </button>
          </div>

          {/* Clean Drawing Tools in Header */}
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
              {isDrawingMode ? 'Đang vẽ' : 'Vẽ'}
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
                  title={tool === 'pencil' ? 'Chuyển sang tẩy nét vẽ' : 'Chuyển sang bút vẽ'}
                >
                  {tool === 'pencil' ? 'Bút' : 'Tẩy nét'}
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
                  Xóa hết
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
      </header>

      {/* Main Slide Presentation Stage */}
      <main style={{
        flex: 1,
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        overflow: 'hidden'
      }}>
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
                  <table style={{ width: '100%', borderCollapse: 'collapse', margin: '18px 0', border: '1px solid #e2e8f0', borderRadius: '8px' }} {...props} />
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
        height: '64px',
        background: '#ffffff',
        borderTop: '1px solid #e2e8f0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 32px',
        zIndex: 40
      }}>
        <button
          onClick={goToPrevSlide}
          disabled={currentSlideIndex === 0}
          className="duo-btn duo-btn-secondary"
          style={{ opacity: currentSlideIndex === 0 ? 0.4 : 1, cursor: currentSlideIndex === 0 ? 'not-allowed' : 'pointer' }}
        >
          Trước
        </button>

        <div style={{ display: 'flex', gap: '6px' }}>
          {lesson.slides.map((_, idx) => (
            <div
              key={idx}
              onClick={() => setCurrentSlideIndex(idx)}
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: currentSlideIndex === idx ? '#0284c7' : '#cbd5e1',
                cursor: 'pointer'
              }}
            />
          ))}
        </div>

        <button
          onClick={goToNextSlide}
          disabled={currentSlideIndex === lesson.slides.length - 1}
          className="duo-btn duo-btn-blue"
          style={{ opacity: currentSlideIndex === lesson.slides.length - 1 ? 0.4 : 1, cursor: currentSlideIndex === lesson.slides.length - 1 ? 'not-allowed' : 'pointer' }}
        >
          Tiếp theo
        </button>
      </footer>

      {/* Audio Modal */}
      <AudioModal
        isOpen={isAudioModalOpen}
        onClose={() => setIsAudioModalOpen(false)}
        onSelectAudio={(selected) => {
          if (!currentAudios.some(a => a.filename === selected.filename)) {
            setCurrentAudios(prev => [...prev, selected]);
          }
        }}
        currentSelectedList={currentAudios}
      />

      {/* Toast Notification */}
      {saveToast && (
        <div style={{
          position: 'fixed',
          top: '75px',
          right: '20px',
          background: '#0284c7',
          color: '#ffffff',
          padding: '8px 16px',
          borderRadius: '8px',
          fontWeight: 600,
          fontSize: '13px',
          zIndex: 999
        }}>
          {saveToast}
        </div>
      )}
    </div>
  );
}
