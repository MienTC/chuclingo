import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import axios from 'axios';
import AudioModal from '../components/AudioModal';

export default function Admin() {
  const [searchParams] = useSearchParams();
  const editId = searchParams.get('edit');

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

  // Audio upload state with title & lesson category (Bài 1, Bài 2...)
  const [uploadAudioFile, setUploadAudioFile] = useState(null);
  const [uploadAudioTitle, setUploadAudioTitle] = useState('');
  const [uploadLessonCategory, setUploadLessonCategory] = useState('');

  // Modals & feedback
  const [isAudioModalOpen, setIsAudioModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchLessons();
    fetchTopics();
    fetchAudioList();
  }, []);

  useEffect(() => {
    if (editId) {
      loadLessonForEdit(editId);
    }
  }, [editId]);

  const fetchLessons = async () => {
    try {
      const res = await axios.get('/api/lessons');
      setLessons(res.data.data);
      if (res.data.data.length > 0 && !uploadLessonCategory) {
        setUploadLessonCategory(res.data.data[0].title);
      }
    } catch (err) {
      console.error(err);
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
    } catch (err) {
      setMessage('Không thể tải bài học: ' + err.message);
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
      setMessage('Đã tạo thêm chủ đề mới');
    } catch (err) {
      setMessage('Lỗi khi thêm chủ đề: ' + err.message);
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
        setMessage('Đang xử lý và bóc tách slide từ file PowerPoint (.pptx)...');
        const formData = new FormData();
        formData.append('markdown', file);
        formData.append('title', cleanName);
        formData.append('topic', selectedTopic);

        const res = await axios.post('/api/lessons', formData);
        setMarkdown(res.data.data.rawContent || '');
        if (!title) setTitle(cleanName);
        setMessage('Đã chuyển đổi thành công slide PowerPoint (.pptx) thành bài giảng!');
        fetchLessons();
        setLoading(false);
      } catch (err) {
        setMessage('Lỗi khi đọc file PowerPoint: ' + (err.response?.data?.message || err.message));
        setLoading(false);
      }
    } else {
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target.result;
        setMarkdown(content);
        if (!title) setTitle(cleanName);
      };
      reader.readAsText(file);
    }
  };

  const handleSaveLesson = async (e) => {
    e.preventDefault();
    if (!markdown.trim()) {
      setMessage('Vui lòng nhập hoặc ném file Markdown vào');
      return;
    }

    try {
      setLoading(true);
      if (currentEditId) {
        await axios.put(`/api/lessons/${currentEditId}`, {
          markdown,
          title,
          topic: selectedTopic,
          audios: attachedAudios
        });
        setMessage('Cập nhật bài học thành công');
      } else {
        await axios.post('/api/lessons', {
          title,
          topic: selectedTopic,
          audios: attachedAudios,
          markdown
        });
        setMessage('Tạo mới bài học thành công');
        resetForm();
      }
      fetchLessons();
      setLoading(false);
    } catch (err) {
      setMessage('Lỗi: ' + (err.response?.data?.message || err.message));
      setLoading(false);
    }
  };

  const resetForm = () => {
    setCurrentEditId('');
    setTitle('');
    setMarkdown('');
    setAttachedAudios([]);
  };

  const handleDeleteLesson = async (id) => {
    if (!window.confirm(`Bạn có chắc muốn xóa bài học này?`)) return;
    try {
      await axios.delete(`/api/lessons/${id}`);
      fetchLessons();
      if (currentEditId === id) {
        resetForm();
      }
      setMessage('Đã xóa bài học');
    } catch (err) {
      setMessage('Lỗi khi xóa: ' + err.message);
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
      setMessage(`Đã tải lên audio: ${res.data.data.title}`);
      setUploadAudioFile(null);
      setUploadAudioTitle('');
      fetchAudioList();
      setLoading(false);
    } catch (err) {
      setMessage('Lỗi upload audio: ' + err.message);
      setLoading(false);
    }
  };

  // Toggle attach audio to current lesson
  const handleToggleAttachAudio = (audioItem) => {
    setAttachedAudios((prev) => {
      const exists = prev.some((a) => a.filename === audioItem.filename);
      if (exists) {
        return prev.filter((a) => a.filename !== audioItem.filename);
      } else {
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
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f8fafc' }}>
      {/* Clean Sidebar */}
      <aside className="duo-sidebar">
        <div style={{ padding: '0 8px 20px 8px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#0f172a' }}>
            ChucLingo
          </h2>
        </div>

        <Link to="/" className="duo-nav-item">
          Bài học
        </Link>
        <Link to="/admin" className="duo-nav-item active">
          Quản trị bài giảng
        </Link>
        <button
          onClick={() => setIsAudioModalOpen(true)}
          className="duo-nav-item"
          style={{ width: '100%', background: 'none', border: 'none', textAlign: 'left', cursor: 'pointer' }}
        >
          Kho âm thanh ({audioList.length})
        </button>
      </aside>

      {/* Main Content Area */}
      <div style={{ marginLeft: '240px', flex: 1, padding: '32px 40px', maxWidth: '1200px' }}>
        {/* Top Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <div>
            <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#0f172a' }}>
              Quản trị bài giảng & Kho âm thanh
            </h1>
            <p style={{ color: '#64748b', fontSize: '14px', marginTop: '4px' }}>
              Soạn thảo slide markdown và phân nhóm audio theo từng bài
            </p>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={() => setIsAudioModalOpen(true)}
              className="duo-btn duo-btn-secondary"
            >
              Mở kho audio
            </button>
            {currentEditId && (
              <Link
                to={`/slide/${currentEditId}`}
                className="duo-btn duo-btn-blue"
                style={{ textDecoration: 'none' }}
              >
                Trình chiếu bài này
              </Link>
            )}
          </div>
        </div>

        {/* Message Alert */}
        {message && (
          <div style={{
            background: '#ffffff',
            border: '1px solid #cbd5e1',
            color: '#0f172a',
            padding: '10px 16px',
            borderRadius: '8px',
            marginBottom: '20px',
            fontSize: '14px',
            fontWeight: 500
          }}>
            {message}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr', gap: '24px' }}>
          {/* Left Column: Lesson list & Audio Upload Grouped */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Lesson List */}
            <div className="duo-card" style={{ padding: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a' }}>
                  Danh sách bài ({lessons.length})
                </h3>
                <button
                  onClick={resetForm}
                  className="duo-btn duo-btn-blue"
                  style={{ padding: '4px 10px', fontSize: '12px' }}
                >
                  + Soạn mới
                </button>
              </div>

              <div style={{ maxHeight: '280px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {lessons.map((l) => (
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
                      cursor: 'pointer'
                    }}
                    onClick={() => loadLessonForEdit(l.id)}
                  >
                    <div style={{ flex: 1, overflow: 'hidden' }}>
                      <div style={{ fontWeight: 600, fontSize: '13px', color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {l.title}
                      </div>
                      <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                        {l.topic} • {l.totalSlides} slides {l.audios && l.audios.length > 0 ? `• ${l.audios.length} audio` : ''}
                      </div>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteLesson(l.id);
                      }}
                      style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '14px' }}
                      title="Xóa bài"
                    >
                      Xóa
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Audio Upload Box Grouped by Lesson */}
            <div className="duo-card" style={{ padding: '16px' }}>
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
                    placeholder="VD: Hội thoại 1, Nghe bài tập 2..."
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
                    style={{ fontSize: '12px', color: '#64748b' }}
                  />
                </div>

                <button
                  type="submit"
                  disabled={!uploadAudioFile}
                  className="duo-btn duo-btn-blue"
                  style={{ width: '100%', padding: '8px', fontSize: '13px', opacity: !uploadAudioFile ? 0.6 : 1 }}
                >
                  Tải lên kho
                </button>
              </form>
            </div>
          </div>

          {/* Right Column: Lesson Content Editor */}
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
                  placeholder="VD: Bài 1: Giao tiếp chào hỏi và giới thiệu"
                  required
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
                    style={{ padding: '6px 12px', fontSize: '13px' }}
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
                      style={{ padding: '6px 14px', fontSize: '13px' }}
                    >
                      Lưu chủ đề
                    </button>
                  </div>
                )}
              </div>

              {/* Multiple Audio Attachment Section */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
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
                    Chưa gắn audio nào vào bài. Bấm "Chọn từ kho Audio" để gán 1 hoặc nhiều file audio vào bài học này.
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
                        <span style={{ fontWeight: 500, color: '#0f172a' }}>
                          {idx + 1}. {a.title || a.filename}
                        </span>
                        <button
                          type="button"
                          onClick={() => setAttachedAudios(attachedAudios.filter((_, i) => i !== idx))}
                          style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '12px' }}
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
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '13px', color: '#0284c7' }}>
                    Tải file Markdown (.md) hoặc PowerPoint (.pptx) lên:
                  </div>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>
                    Hệ thống tự động phân tách slide và bóc tách nội dung
                  </div>
                </div>
                <input
                  type="file"
                  accept=".md,.pptx,text/markdown,application/vnd.openxmlformats-officedocument.presentationml.presentation"
                  onChange={handleFileUpload}
                  style={{ fontSize: '12px', color: '#64748b' }}
                />
              </div>

              {/* Markdown Content textarea */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label style={{ fontSize: '13px', fontWeight: 600, color: '#334155' }}>
                    Nội dung Markdown:
                  </label>
                  <span style={{ fontSize: '12px', color: '#64748b' }}>
                    {slides.length} slides
                  </span>
                </div>
                <textarea
                  value={markdown}
                  onChange={(e) => setMarkdown(e.target.value)}
                  placeholder="Dán mã markdown vào đây..."
                  rows={13}
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
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
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
