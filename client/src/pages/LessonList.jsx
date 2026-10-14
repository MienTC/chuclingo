import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import AudioModal from '../components/AudioModal';
import MobileNav from '../components/MobileNav';
import { useToast } from '../components/Toast';

export default function LessonList() {
  const [lessons, setLessons] = useState([]);
  const [topics, setTopics] = useState([]);
  const [selectedTopic, setSelectedTopic] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [isAudioModalOpen, setIsAudioModalOpen] = useState(false);
  const toast = useToast();

  useEffect(() => {
    fetchLessonsAndTopics();
  }, []);

  const fetchLessonsAndTopics = async () => {
    try {
      setLoading(true);
      const [lessRes, topRes] = await Promise.all([
        axios.get('/api/lessons'),
        axios.get('/api/topics')
      ]);

      let serverLessons = lessRes.data.data || [];

      // Check localStorage backups in case serverless container was recycled
      try {
        const backups = JSON.parse(localStorage.getItem('chuclingo_custom_lessons') || '{}');
        const serverIds = new Set(serverLessons.map((l) => l.id));
        for (const [id, item] of Object.entries(backups)) {
          if (!serverIds.has(id) && item.markdown) {
            try {
              const reRes = await axios.post('/api/lessons', {
                id: item.id,
                title: item.title,
                topic: item.topic,
                audios: item.audios,
                markdown: item.markdown
              });
              if (reRes.data?.data) {
                serverLessons.push(reRes.data.data);
              }
            } catch (e) {}
          }
        }
      } catch (e) {}

      setLessons(serverLessons);
      setTopics(['ALL', ...topRes.data.data]);
      setLoading(false);
    } catch (err) {
      console.error(err);
      toast.error('Lỗi khi tải danh sách bài học: ' + (err.response?.data?.message || err.message));
      setLoading(false);
    }
  };

  const filtered = selectedTopic === 'ALL'
    ? lessons
    : lessons.filter((l) => l.topic === selectedTopic);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: '#f8fafc' }}>
      {/* Mobile Top Header */}
      <MobileNav
        onOpenAudioModal={() => setIsAudioModalOpen(true)}
        rightAction={
          <Link
            to="/admin"
            className="duo-btn duo-btn-blue"
            style={{ padding: '6px 10px', fontSize: '12px', textDecoration: 'none' }}
          >
            + Soạn bài
          </Link>
        }
      />

      <div style={{ display: 'flex', flex: 1 }}>
        {/* Desktop Sidebar */}
        <aside className="duo-sidebar">
          <div style={{ padding: '0 8px 24px 8px' }}>
            <h1 style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>🐼</span> ChucLingo
            </h1>
          </div>

          <Link to="/" className="duo-nav-item active">
            📖 Bài học
          </Link>
          <Link to="/admin" className="duo-nav-item">
            ⚙️ Quản trị bài giảng
          </Link>
          <button
            onClick={() => setIsAudioModalOpen(true)}
            className="duo-nav-item"
            style={{ width: '100%', background: 'none', border: 'none', textAlign: 'left', cursor: 'pointer' }}
          >
            🎵 Kho âm thanh
          </button>
        </aside>

        {/* Main Content Feed */}
        <main className="duo-main-content">
          {/* Top Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h2 style={{ fontSize: '24px', fontWeight: 700, color: '#0f172a' }}>
                Danh sách bài giảng
              </h2>
              <p style={{ fontSize: '14px', color: '#64748b', marginTop: '4px' }}>
                Slide giảng dạy tương tác, audio đính kèm và ghi chú trực tiếp
              </p>
            </div>

            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <button
                onClick={() => setIsAudioModalOpen(true)}
                className="duo-btn duo-btn-secondary"
              >
                Kho audio
              </button>
              <Link
                to="/admin"
                className="duo-btn duo-btn-blue"
                style={{ textDecoration: 'none' }}
              >
                + Soạn bài mới
              </Link>
            </div>
          </div>

          {/* Topics Filter */}
          <div style={{
            display: 'flex',
            gap: '8px',
            marginBottom: '24px',
            overflowX: 'auto',
            paddingBottom: '6px',
            WebkitOverflowScrolling: 'touch'
          }}>
            {topics.map((t) => (
              <button
                key={t}
                onClick={() => setSelectedTopic(t)}
                className={`duo-btn ${selectedTopic === t ? 'duo-btn-blue' : 'duo-btn-secondary'}`}
                style={{ padding: '6px 14px', fontSize: '13px', whiteSpace: 'nowrap', flexShrink: 0 }}
              >
                {t === 'ALL' ? 'Tất cả chủ đề' : t}
              </button>
            ))}
          </div>

          {/* Lessons List Grid */}
          {loading ? (
            <div style={{ textAlign: 'center', padding: '60px', color: '#64748b' }}>
              Đang tải dữ liệu bài học...
            </div>
          ) : filtered.length === 0 ? (
            <div className="duo-card" style={{ textAlign: 'center', padding: '48px 20px' }}>
              <p style={{ color: '#64748b', fontSize: '15px', marginBottom: '16px' }}>
                Chưa có bài học nào trong chủ đề này.
              </p>
              <Link to="/admin" className="duo-btn duo-btn-blue" style={{ textDecoration: 'none' }}>
                + Soạn thảo bài giảng mới
              </Link>
            </div>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))',
              gap: '20px'
            }}>
              {filtered.map((lesson) => (
                <div
                  key={lesson.id}
                  className="duo-card"
                  style={{
                    padding: '20px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                      <span style={{
                        fontSize: '12px',
                        fontWeight: 600,
                        padding: '3px 10px',
                        borderRadius: '6px',
                        background: '#f1f5f9',
                        color: '#0284c7'
                      }}>
                        {lesson.topic}
                      </span>

                      <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 500 }}>
                        {lesson.totalSlides} slides
                      </span>
                    </div>

                    <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', marginBottom: '8px', lineHeight: '1.4' }}>
                      {lesson.title}
                    </h3>

                    {lesson.audios && lesson.audios.length > 0 && (
                      <div style={{ fontSize: '12px', color: '#0284c7', fontWeight: 600, marginTop: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span>🎵</span> {lesson.audios.length} file âm thanh đính kèm
                      </div>
                    )}
                  </div>

                  <div style={{ marginTop: '20px', display: 'flex', gap: '8px' }}>
                    <Link
                      to={`/slide/${lesson.id}`}
                      className="duo-btn duo-btn-blue"
                      style={{ flex: 1, textDecoration: 'none', padding: '9px 0', fontSize: '13px' }}
                    >
                      ▶ Giảng dạy
                    </Link>
                    <Link
                      to={`/admin?edit=${lesson.id}`}
                      className="duo-btn duo-btn-secondary"
                      style={{ padding: '9px 14px', textDecoration: 'none', fontSize: '13px' }}
                      title="Chỉnh sửa bài"
                    >
                      Sửa
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>

      {/* Audio Modal */}
      <AudioModal
        isOpen={isAudioModalOpen}
        onClose={() => setIsAudioModalOpen(false)}
      />
    </div>
  );
}
