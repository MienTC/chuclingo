import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import axios from 'axios';
import AudioModal from '../components/AudioModal';
import MobileNav from '../components/MobileNav';
import { useToast } from '../components/Toast';

export default function Admin() {
  const [searchParams] = useSearchParams();
  const editId = searchParams.get('edit');
  const toast = useToast();

  const [lessons, setLessons] = useState([]);
  const [topics, setTopics] = useState([]);
  const [audioList, setAudioList] = useState([]);

  // Form states
  const [currentEditId, setCurrentEditId] = useState('');
  const [title, setTitle] = useState('');
  const [selectedTopic, setSelectedTopic] = useState('');
  const [newTopicName, setNewTopicName] = useState('');
  const [isAddingTopic, setIsAddingTopic] = useState(false);
  const [attachedAudios, setAttachedAudios] = useState([]); // Multiple audios attached to lesson
  const [markdown, setMarkdown] = useState('');

  // Audio upload state
  const [uploadAudioFile, setUploadAudioFile] = useState(null);
  const [uploadAudioTitle, setUploadAudioTitle] = useState('');
  const [uploadLessonCategory, setUploadLessonCategory] = useState('');

  // Modals & mobile tabs
  const [isAudioModalOpen, setIsAudioModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeMobileTab, setActiveMobileTab] = useState('editor'); // 'editor' | 'lessons' | 'audio'

  useEffect(() => {
    fetchLessons();
    fetchTopics();
    fetchAudioList();
  }, []);

  useEffect(() => {
    if (editId) {
      loadLessonForEdit(editId);
      setActiveMobileTab('editor');
    }
  }, [editId]);

  // Helper for localStorage backups (protects against Vercel serverless cold restarts)
  const getLocalLessonBackups = () => {
    try {
      return JSON.parse(localStorage.getItem('chuclingo_custom_lessons') || '{}');
    } catch (e) {
      return {};
    }
  };

  const saveLocalLessonBackup = (item) => {
    if (!item || !item.id) return;
    try {
      const existing = getLocalLessonBackups();
      existing[item.id] = {
        id: item.id,
        title: item.title,
        topic: item.topic,
        audios: item.audios || [],
        markdown: item.rawContent || item.markdown || '',
        updatedAt: Date.now()
      };
      localStorage.setItem('chuclingo_custom_lessons', JSON.stringify(existing));
    } catch (e) {}
  };

  const removeLocalLessonBackup = (id) => {
    try {
      const existing = getLocalLessonBackups();
      delete existing[id];
      localStorage.setItem('chuclingo_custom_lessons', JSON.stringify(existing));
    } catch (e) {}
  };

  const fetchLessons = async () => {
    try {
      const res = await axios.get('/api/lessons');
      let serverLessons = res.data.data || [];

      // Auto re-sync from localStorage if Vercel serverless container was restarted
      const backups = getLocalLessonBackups();
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

      setLessons(serverLessons);
      if (serverLessons.length > 0 && !uploadLessonCategory) {
        setUploadLessonCategory(serverLessons[0].title);
      }
    } catch (err) {
      console.error(err);
      toast.error('Không thể tải danh sách bài: ' + (err.response?.data?.message || err.message));
    }
  };

  const fetchTopics = async () => {
    try {
      const res = await axios.get('/api/topics');
      setTopics(res.data.data);
      if (res.data.data.length > 0 && !selectedTopic) {
        setSelectedTopic(res.data.data[0]);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchAudioList = async () => {
    try {
      const res = await axios.get('/api/audio');
      setAudioList(res.data.data);
    } catch (err) {
      console.error(err);
    }
  };

  const loadLessonForEdit = async (id) => {
    try {
      setLoading(true);
      const res = await axios.get(`/api/lessons/${id}`);
      const l = res.data.data;
      setCurrentEditId(l.id);
      setTitle(l.title);
      setSelectedTopic(l.topic);
      setAttachedAudios(l.audios || (l.audio ? [{ filename: l.audio, title: l.audio, url: `/audio/${l.audio}` }] : []));
      setMarkdown(l.rawContent);
      setLoading(false);
      setActiveMobileTab('editor');
      toast.info(`Đang chỉnh sửa: ${l.title}`);
    } catch (err) {
      toast.error('Không thể tải bài học: ' + (err.response?.data?.message || err.message));
      setLoading(false);
    }
  };

  const handleCreateTopic = async (e) => {
    e.preventDefault();
    if (!newTopicName.trim()) return;

    try {
      const res = await axios.post('/api/topics', { topic: newTopicName.trim() });
      setTopics(res.data.data);
      setSelectedTopic(newTopicName.trim());
      setNewTopicName('');
      setIsAddingTopic(false);
      toast.success(`Đã tạo chủ đề "${newTopicName.trim()}" thành công!`);
    } catch (err) {
      toast.error('Lỗi khi thêm chủ đề: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    const cleanName = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');

    if (ext === '.pptx') {
      try {
        setLoading(true);
        toast.info('Đang xử lý bóc tách slide từ PowerPoint (.pptx)...');
        const formData = new FormData();
        formData.append('markdown', file);
        formData.append('title', cleanName);
        formData.append('topic', selectedTopic);

        const res = await axios.post('/api/lessons', formData);
        setMarkdown(res.data.data.rawContent || '');
        if (!title) setTitle(cleanName);
        toast.success('Chuyển đổi PowerPoint thành bài giảng thành công!');
        fetchLessons();
        setLoading(false);
      } catch (err) {
        toast.error('Lỗi khi đọc file PowerPoint: ' + (err.response?.data?.message || err.message));
        setLoading(false);
      }
    } else {
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target.result;
        setMarkdown(content);
        if (!title) {
          const match = content.match(/^#\s+(.+)$/m);
          setTitle(match ? match[1].replace(/^[0-9.]+\s*/, '').trim() : cleanName);
        }
        toast.success('Đã tải nội dung file Markdown lên trình soạn thảo');
      };
      reader.readAsText(file);
    }
  };

  const handleSaveLesson = async (e) => {
    e.preventDefault();
    if (!markdown.trim()) {
      toast.warning('Vui lòng nhập hoặc chọn file Markdown cho bài học');
      return;
    }

    let finalTitle = title.trim();
    if (!finalTitle) {
      const match = markdown.match(/^#\s+(.+)$/m);
      finalTitle = match ? match[1].replace(/^[0-9.]+\s*/, '').trim() : 'Bài học mới';
      setTitle(finalTitle);
    }

    try {
      setLoading(true);
      let savedLesson = null;
      if (currentEditId) {
        const res = await axios.put(`/api/lessons/${currentEditId}`, {
          markdown,
          title: finalTitle,
          topic: selectedTopic,
          audios: attachedAudios
        });
        savedLesson = res.data?.data;
        toast.success('Cập nhật bài học thành công!');
      } else {
        const res = await axios.post('/api/lessons', {
          title: finalTitle,
          topic: selectedTopic,
          audios: attachedAudios,
          markdown
        });
        savedLesson = res.data?.data;
        toast.success('Tạo bài học mới thành công!');
        resetForm();
      }

      // Save to localStorage backup so user never loses it even on Vercel cold restarts
      if (savedLesson) {
        saveLocalLessonBackup(savedLesson);
      } else {
        saveLocalLessonBackup({
          id: currentEditId || 'lesson_' + Date.now(),
          title: finalTitle,
          topic: selectedTopic,
          audios: attachedAudios,
          rawContent: markdown
        });
      }

      fetchLessons();
      setLoading(false);
    } catch (err) {
      toast.error('Lỗi khi lưu bài học: ' + (err.response?.data?.message || err.message));
      setLoading(false);
    }
  };

  const resetForm = () => {
    setCurrentEditId('');
    setTitle('');
    setMarkdown('');
    setAttachedAudios([]);
  };

  const handleDownloadCurrentMd = () => {
    if (!markdown.trim()) {
      toast.warning('Chưa có nội dung markdown để tải về');
      return;
    }
    const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const safeTitle = (title || 'bai_giang').toLowerCase().replace(/[^a-z0-9_-]/g, '_');
    a.download = `${safeTitle}.md`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Đã tải file markdown về máy!');
  };

  const handleDeleteLesson = async (id, lessonTitle) => {
    if (!window.confirm(`Bạn có chắc muốn xóa bài "${lessonTitle || id}"?`)) return;
    try {
      await axios.delete(`/api/lessons/${id}`);
      removeLocalLessonBackup(id);
      fetchLessons();
      if (currentEditId === id) {
        resetForm();
      }
      toast.success(`Đã xóa bài học "${lessonTitle || id}" thành công!`);
    } catch (err) {
      toast.error('Lỗi khi xóa bài học: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleAudioUpload = async (e) => {
    e.preventDefault();
    if (!uploadAudioFile) return;

    const formData = new FormData();
    formData.append('audio', uploadAudioFile);
    formData.append('title', uploadAudioTitle.trim() || uploadAudioFile.name);
    formData.append('lessonTitle', uploadLessonCategory.trim() || 'Chung');

    try {
      setLoading(true);
      const res = await axios.post('/api/audio/upload', formData);
      toast.success(`Đã tải lên audio: ${res.data.data.title}`);
      setUploadAudioFile(null);
      setUploadAudioTitle('');
      fetchAudioList();
      setLoading(false);
    } catch (err) {
      toast.error('Lỗi upload audio: ' + (err.response?.data?.message || err.message));
      setLoading(false);
    }
  };

  // Toggle attach audio to current lesson
  const handleToggleAttachAudio = (audioItem) => {
    setAttachedAudios((prev) => {
      const exists = prev.some((a) => a.filename === audioItem.filename);
      if (exists) {
        toast.info(`Đã gỡ audio "${audioItem.title || audioItem.filename}" khỏi bài`);
        return prev.filter((a) => a.filename !== audioItem.filename);
      } else {
        toast.success(`Đã gắn audio "${audioItem.title || audioItem.filename}" vào bài`);
        return [...prev, audioItem];
      }
    });
  };

  const slides = markdown
    ? markdown
        .replace(/^---[\s\S]*?---\r?\n/, '')
        .split(/\r?\n---\r?\n/)
        .map((s) => s.trim())
        .filter(Boolean)
    : [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: '#f8fafc' }}>
      {/* Mobile Top Header */}
      <MobileNav
        onOpenAudioModal={() => setIsAudioModalOpen(true)}
        rightAction={
          currentEditId ? (
            <Link
              to={`/slide/${currentEditId}`}
              className="duo-btn duo-btn-blue"
              style={{ padding: '6px 10px', fontSize: '12px', textDecoration: 'none' }}
            >
              ▶ Chiếu
            </Link>
          ) : null
        }
      />

      <div style={{ display: 'flex', flex: 1 }}>
        {/* Desktop Sidebar */}
        <aside className="duo-sidebar">
          <div style={{ padding: '0 8px 20px 8px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>🐼</span> ChucLingo
            </h2>
          </div>

          <Link to="/" className="duo-nav-item">
            📖 Bài học
          </Link>
          <Link to="/admin" className="duo-nav-item active">
            ⚙️ Quản trị bài giảng
          </Link>
          <button
            onClick={() => setIsAudioModalOpen(true)}
            className="duo-nav-item"
            style={{ width: '100%', background: 'none', border: 'none', textAlign: 'left', cursor: 'pointer' }}
          >
            🎵 Kho âm thanh ({audioList.length})
          </button>
        </aside>

        {/* Main Content Area */}
        <div className="duo-main-content">
          {/* Top Header on Desktop */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#0f172a' }}>
                Quản trị bài giảng & Kho âm thanh
              </h1>
              <p style={{ color: '#64748b', fontSize: '14px', marginTop: '4px' }}>
                Soạn thảo slide markdown và phân nhóm audio theo từng bài
              </p>
            </div>

            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <button
                onClick={() => setIsAudioModalOpen(true)}
                className="duo-btn duo-btn-secondary"
              >
                Mở kho audio ({audioList.length})
              </button>
              {currentEditId && (
                <Link
                  to={`/slide/${currentEditId}`}
                  className="duo-btn duo-btn-blue"
                  style={{ textDecoration: 'none' }}
                >
                  ▶ Trình chiếu bài này
                </Link>
              )}
            </div>
          </div>

          {/* Mobile View Switcher Tabs */}
          <div className="mobile-only-tabs" style={{ display: 'none', gap: '8px', marginBottom: '16px', overflowX: 'auto' }}>
            <button
              onClick={() => setActiveMobileTab('editor')}
              className={`duo-btn ${activeMobileTab === 'editor' ? 'duo-btn-blue' : 'duo-btn-secondary'}`}
              style={{ flex: 1, padding: '8px 12px', fontSize: '13px' }}
            >
              📝 Soạn thảo
            </button>
            <button
              onClick={() => setActiveMobileTab('lessons')}
              className={`duo-btn ${activeMobileTab === 'lessons' ? 'duo-btn-blue' : 'duo-btn-secondary'}`}
              style={{ flex: 1, padding: '8px 12px', fontSize: '13px' }}
            >
              📋 Bài ({lessons.length})
            </button>
            <button
              onClick={() => setActiveMobileTab('audio')}
              className={`duo-btn ${activeMobileTab === 'audio' ? 'duo-btn-blue' : 'duo-btn-secondary'}`}
              style={{ flex: 1, padding: '8px 12px', fontSize: '13px' }}
            >
              🎵 Tải Audio
            </button>
          </div>

          {/* Responsive Two-Column Grid */}
          <div className="admin-grid">
            {/* Left Column: Lesson list & Audio Upload */}
            <div
              className={`admin-left-col ${activeMobileTab !== 'editor' ? 'mobile-show' : 'mobile-hide'}`}
              style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}
            >
              {/* Lesson List */}
              <div
                className="duo-card"
                style={{
                  padding: '16px',
                  display: (activeMobileTab === 'lessons' || activeMobileTab === 'editor') ? 'block' : 'none'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                  <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a' }}>
                    Danh sách bài ({lessons.length})
                  </h3>
                  <button
                    onClick={() => {
                      resetForm();
                      setActiveMobileTab('editor');
                    }}
                    className="duo-btn duo-btn-blue"
                    style={{ padding: '5px 12px', fontSize: '12px' }}
                  >
                    + Soạn mới
                  </button>
                </div>

                <div style={{ maxHeight: '300px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {lessons.length === 0 ? (
                    <div style={{ padding: '16px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>
                      Chưa có bài giảng nào
                    </div>
                  ) : (
                    lessons.map((l) => (
                      <div
                        key={l.id}
                        style={{
                          background: currentEditId === l.id ? '#e0f2fe' : '#f8fafc',
                          border: '1px solid',
                          borderColor: currentEditId === l.id ? '#0284c7' : '#e2e8f0',
                          borderRadius: '8px',
                          padding: '10px 12px',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          cursor: 'pointer',
                          gap: '8px'
                        }}
                        onClick={() => loadLessonForEdit(l.id)}
                      >
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 600, fontSize: '13px', color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {l.title}
                          </div>
                          <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                            {l.topic} • {l.totalSlides} slides {l.audios && l.audios.length > 0 ? `• ${l.audios.length} audio` : ''}
                          </div>
                        </div>

                        <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }} onClick={(e) => e.stopPropagation()}>
                          <Link
                            to={`/slide/${l.id}`}
                            className="duo-btn duo-btn-secondary"
                            style={{ padding: '4px 8px', fontSize: '11px', textDecoration: 'none' }}
                            title="Chiếu thử"
                          >
                            ▶
                          </Link>
                          <button
                            onClick={() => handleDeleteLesson(l.id, l.title)}
                            style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '13px', padding: '4px' }}
                            title="Xóa bài"
                          >
                            Xóa
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Audio Upload Box */}
              <div
                className="duo-card"
                style={{
                  padding: '16px',
                  display: (activeMobileTab === 'audio' || activeMobileTab === 'editor') ? 'block' : 'none'
                }}
              >
                <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a', marginBottom: '12px' }}>
                  Tải lên Audio theo bài học
                </h3>

                <form onSubmit={handleAudioUpload} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>
                      Thuộc bài học (Bài 1, Bài 2,...):
                    </label>
                    <input
                      type="text"
                      value={uploadLessonCategory}
                      onChange={(e) => setUploadLessonCategory(e.target.value)}
                      placeholder="VD: Bài 1, Bài 2 hoặc Chung"
                      className="duo-input"
                      style={{ width: '100%', padding: '8px' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>
                      Tên mô tả file audio:
                    </label>
                    <input
                      type="text"
                      value={uploadAudioTitle}
                      onChange={(e) => setUploadAudioTitle(e.target.value)}
                      placeholder="VD: Hội thoại 1, Nghe từ mới..."
                      className="duo-input"
                      style={{ width: '100%', padding: '8px' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>
                      Chọn file âm thanh:
                    </label>
                    <input
                      type="file"
                      accept="audio/*"
                      onChange={(e) => setUploadAudioFile(e.target.files[0])}
                      style={{ fontSize: '12px', color: '#64748b', width: '100%' }}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={!uploadAudioFile || loading}
                    className="duo-btn duo-btn-blue"
                    style={{ width: '100%', padding: '8px', fontSize: '13px', opacity: !uploadAudioFile ? 0.6 : 1 }}
                  >
                    Tải lên kho audio
                  </button>
                </form>
              </div>
            </div>

            {/* Right Column: Lesson Content Editor */}
            <div
              className={`admin-right-col ${activeMobileTab === 'editor' ? 'mobile-show' : 'mobile-hide'}`}
            >
              <div className="duo-card" style={{ padding: '24px' }}>
                <form onSubmit={handleSaveLesson} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                      Tiêu đề bài học:
                    </label>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="VD: Bài 3: Từ mới - 生词 (Shēngcí)"
                      className="duo-input"
                      style={{ width: '100%' }}
                    />
                  </div>

                  {/* Topic selector */}
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                      Chủ đề bài học:
                    </label>
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <select
                        value={selectedTopic}
                        onChange={(e) => setSelectedTopic(e.target.value)}
                        className="duo-input"
                        style={{ flex: 1, cursor: 'pointer' }}
                      >
                        {topics.map((t) => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>

                      <button
                        type="button"
                        onClick={() => setIsAddingTopic(!isAddingTopic)}
                        className="duo-btn duo-btn-secondary"
                        style={{ padding: '6px 12px', fontSize: '13px', whiteSpace: 'nowrap' }}
                      >
                        + Tạo chủ đề
                      </button>
                    </div>

                    {isAddingTopic && (
                      <div style={{ marginTop: '10px', display: 'flex', gap: '8px' }}>
                        <input
                          type="text"
                          value={newTopicName}
                          onChange={(e) => setNewTopicName(e.target.value)}
                          placeholder="Nhập tên chủ đề mới..."
                          className="duo-input"
                          style={{ flex: 1 }}
                        />
                        <button
                          type="button"
                          onClick={handleCreateTopic}
                          className="duo-btn duo-btn-blue"
                          style={{ padding: '6px 14px', fontSize: '13px', whiteSpace: 'nowrap' }}
                        >
                          Lưu chủ đề
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Multiple Audio Attachment Section */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px', flexWrap: 'wrap', gap: '6px' }}>
                      <label style={{ fontSize: '13px', fontWeight: 600, color: '#334155' }}>
                        Danh sách Audio gắn vào bài ({attachedAudios.length} files):
                      </label>
                      <button
                        type="button"
                        onClick={() => setIsAudioModalOpen(true)}
                        className="duo-btn duo-btn-secondary"
                        style={{ padding: '4px 10px', fontSize: '12px' }}
                      >
                        + Chọn từ kho Audio
                      </button>
                    </div>

                    {/* List of currently attached audios */}
                    {attachedAudios.length === 0 ? (
                      <div style={{ padding: '12px', background: '#f8fafc', border: '1px dashed #cbd5e1', borderRadius: '8px', fontSize: '13px', color: '#94a3b8' }}>
                        Chưa gắn audio nào. Bấm "+ Chọn từ kho Audio" để gán file âm thanh cho bài này.
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '140px', overflowY: 'auto' }}>
                        {attachedAudios.map((a, idx) => (
                          <div
                            key={idx}
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              padding: '6px 10px',
                              background: '#f8fafc',
                              border: '1px solid #e2e8f0',
                              borderRadius: '6px',
                              fontSize: '13px'
                            }}
                          >
                            <span style={{ fontWeight: 500, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {idx + 1}. {a.title || a.filename}
                            </span>
                            <button
                              type="button"
                              onClick={() => setAttachedAudios(attachedAudios.filter((_, i) => i !== idx))}
                              style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '12px', flexShrink: 0 }}
                            >
                              Gỡ bỏ
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Upload markdown or pptx file */}
                  <div style={{
                    border: '1px dashed #cbd5e1',
                    borderRadius: '8px',
                    padding: '12px 16px',
                    background: '#f8fafc',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '6px' }}>
                      <div style={{ fontWeight: 600, fontSize: '13px', color: '#0284c7' }}>
                        Tải file Markdown (.md) hoặc PowerPoint (.pptx) lên:
                      </div>
                      <span style={{ fontSize: '11px', color: '#64748b' }}>
                        Tự động phân tách slide
                      </span>
                    </div>
                    <input
                      type="file"
                      accept=".md,.pptx,text/markdown,application/vnd.openxmlformats-officedocument.presentationml.presentation"
                      onChange={handleFileUpload}
                      style={{ fontSize: '12px', color: '#64748b', width: '100%' }}
                    />
                  </div>

                  {/* Markdown Content textarea */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <label style={{ fontSize: '13px', fontWeight: 600, color: '#334155' }}>
                        Nội dung Markdown:
                      </label>
                      <span style={{ fontSize: '12px', color: '#0284c7', fontWeight: 600 }}>
                        {slides.length} slides
                      </span>
                    </div>
                    <textarea
                      value={markdown}
                      onChange={(e) => setMarkdown(e.target.value)}
                      placeholder="Dán mã Markdown hoặc slide Marp vào đây..."
                      rows={14}
                      required
                      className="duo-input"
                      style={{
                        width: '100%',
                        fontFamily: 'Consolas, Monaco, monospace',
                        fontSize: '13px',
                        lineHeight: '1.6',
                        resize: 'vertical'
                      }}
                    />
                  </div>

                  {/* Action buttons */}
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      onClick={handleDownloadCurrentMd}
                      className="duo-btn duo-btn-secondary"
                      style={{ padding: '10px 16px', fontSize: '14px' }}
                      title="Tải file markdown về máy tính để sao lưu hoặc thêm vào git"
                    >
                      💾 Tải file .md
                    </button>
                    {currentEditId && (
                      <button
                        type="button"
                        onClick={resetForm}
                        className="duo-btn duo-btn-secondary"
                        style={{ padding: '10px 18px', fontSize: '14px' }}
                      >
                        Hủy sửa
                      </button>
                    )}
                    <button
                      type="submit"
                      disabled={loading}
                      className="duo-btn duo-btn-blue"
                      style={{ padding: '10px 24px', fontSize: '14px' }}
                    >
                      {loading ? 'Đang lưu...' : (currentEditId ? 'Cập nhật bài học' : 'Lưu bài học')}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Audio Modal with grouping and multi-selection */}
      <AudioModal
        isOpen={isAudioModalOpen}
        onClose={() => setIsAudioModalOpen(false)}
        onSelectAudio={handleToggleAttachAudio}
        currentSelectedList={attachedAudios}
      />
    </div>
  );
}
