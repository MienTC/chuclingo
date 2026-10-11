const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const matter = require('gray-matter');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Directories
const DATA_DIR = path.join(__dirname, 'data');
const LESSONS_DIR = path.join(DATA_DIR, 'lessons');
const AUDIO_DIR = path.join(DATA_DIR, 'audio');
const ANNOTATIONS_DIR = path.join(DATA_DIR, 'annotations');
const METADATA_FILE = path.join(DATA_DIR, 'audio_metadata.json');
const TOPICS_FILE = path.join(DATA_DIR, 'topics.json');

[DATA_DIR, LESSONS_DIR, AUDIO_DIR, ANNOTATIONS_DIR].forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Initialize topics if not existing
if (!fs.existsSync(TOPICS_FILE)) {
  fs.writeFileSync(TOPICS_FILE, JSON.stringify(['Giao tiếp tiếng Trung', 'Từ vựng HSK', 'Phản xạ giao tiếp', 'Tiếng Trung thương mại'], null, 2), 'utf-8');
}

// Initialize audio metadata if not existing
if (!fs.existsSync(METADATA_FILE)) {
  fs.writeFileSync(METADATA_FILE, JSON.stringify({}, null, 2), 'utf-8');
}

function getAudioMetadata() {
  try {
    if (fs.existsSync(METADATA_FILE)) {
      return JSON.parse(fs.readFileSync(METADATA_FILE, 'utf-8'));
    }
  } catch (e) {}
  return {};
}

function saveAudioMetadata(meta) {
  try {
    fs.writeFileSync(METADATA_FILE, JSON.stringify(meta, null, 2), 'utf-8');
  } catch (e) {}
}

function getTopics() {
  try {
    if (fs.existsSync(TOPICS_FILE)) {
      return JSON.parse(fs.readFileSync(TOPICS_FILE, 'utf-8'));
    }
  } catch (e) {}
  return ['Giao tiếp tiếng Trung'];
}

function saveTopics(topics) {
  try {
    fs.writeFileSync(TOPICS_FILE, JSON.stringify(topics, null, 2), 'utf-8');
  } catch (e) {}
}

// Static files for audio
app.use('/audio', express.static(AUDIO_DIR));

// Configure Multer for audio & markdown upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (file.fieldname === 'audio') {
      cb(null, AUDIO_DIR);
    } else if (file.fieldname === 'markdown') {
      cb(null, LESSONS_DIR);
    } else {
      cb(null, DATA_DIR);
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e6);
    const ext = path.extname(file.originalname);
    const baseName = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_-]/g, '_');
    cb(null, `${baseName}-${uniqueSuffix}${ext}`);
  }
});
const upload = multer({ storage });

// Helper to normalize audios: can be single string or array of strings or objects {title, url/filename}
function normalizeAudios(rawAudio, rawAudios, metadata) {
  let list = [];
  if (Array.isArray(rawAudios)) {
    list = [...rawAudios];
  } else if (typeof rawAudios === 'string' && rawAudios.trim()) {
    try {
      const parsed = JSON.parse(rawAudios);
      if (Array.isArray(parsed)) list = parsed;
    } catch (e) {
      list = [rawAudios];
    }
  }

  if (rawAudio) {
    if (typeof rawAudio === 'string' && !list.includes(rawAudio)) {
      list.unshift(rawAudio);
    } else if (Array.isArray(rawAudio)) {
      rawAudio.forEach((a) => {
        if (!list.includes(a)) list.push(a);
      });
    }
  }

  return list.map((item) => {
    if (typeof item === 'object' && item !== null) {
      return {
        filename: item.filename || item.url || '',
        title: item.title || item.filename || 'Audio',
        url: item.url || (item.filename ? `/audio/${item.filename}` : '')
      };
    }
    const filename = String(item);
    const info = metadata[filename] || {};
    return {
      filename,
      title: info.title || filename,
      url: filename.startsWith('http') || filename.startsWith('/') ? filename : `/audio/${filename}`
    };
  });
}

// Helper to split markdown into slides
function parseLessonMarkdown(content, filename) {
  const parsed = matter(content);
  const data = parsed.data || {};
  let rawBody = parsed.content;
  const meta = getAudioMetadata();

  const rawSlides = rawBody
    .split(/\r?\n---\r?\n/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  const id = filename.replace(/\.md$/, '');
  const audios = normalizeAudios(data.audio, data.audios, meta);

  return {
    id,
    filename,
    title: data.title || id.replace(/[-_]/g, ' '),
    topic: data.topic || 'Giao tiếp tiếng Trung',
    description: data.description || '',
    audio: audios.length > 0 ? audios[0].filename : null,
    audios: audios,
    order: data.order || 999,
    totalSlides: rawSlides.length,
    slides: rawSlides.map((slideMarkdown, index) => {
      let slideAudio = null;
      const audioMatch = slideMarkdown.match(/<!--\s*audio:\s*(.*?)\s*-->/i);
      if (audioMatch) {
        slideAudio = audioMatch[1].trim();
      }
      return {
        slideIndex: index,
        content: slideMarkdown,
        audio: slideAudio
      };
    })
  };
}

// 1. GET /api/topics - List topics
app.get('/api/topics', (req, res) => {
  res.json({ success: true, data: getTopics() });
});

// POST /api/topics - Create topic
app.post('/api/topics', (req, res) => {
  const { topic } = req.body;
  if (!topic || !topic.trim()) {
    return res.status(400).json({ success: false, message: 'Tên chủ đề không được để trống' });
  }
  const current = getTopics();
  if (!current.includes(topic.trim())) {
    current.push(topic.trim());
    saveTopics(current);
  }
  res.json({ success: true, data: current });
});

// 2. GET /api/lessons - List all lessons
app.get('/api/lessons', (req, res) => {
  try {
    const files = fs.readdirSync(LESSONS_DIR).filter((f) => f.endsWith('.md'));
    const meta = getAudioMetadata();
    const lessons = files.map((file) => {
      const fullPath = path.join(LESSONS_DIR, file);
      const content = fs.readFileSync(fullPath, 'utf-8');
      const parsed = matter(content);
      const id = file.replace(/\.md$/, '');
      const rawSlides = parsed.content.split(/\r?\n---\r?\n/).map((s) => s.trim()).filter(Boolean);
      const audios = normalizeAudios(parsed.data.audio, parsed.data.audios, meta);

      return {
        id,
        filename: file,
        title: parsed.data.title || id.replace(/[-_]/g, ' '),
        topic: parsed.data.topic || 'Giao tiếp tiếng Trung',
        description: parsed.data.description || '',
        order: parsed.data.order || 999,
        audio: audios.length > 0 ? audios[0].filename : null,
        audios: audios,
        totalSlides: rawSlides.length,
        updatedAt: fs.statSync(fullPath).mtime
      };
    });

    lessons.sort((a, b) => (a.order - b.order) || a.title.localeCompare(b.title));
    res.json({ success: true, data: lessons });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 3. GET /api/lessons/:id - Get lesson detail
app.get('/api/lessons/:id', (req, res) => {
  try {
    const { id } = req.params;
    const filename = `${id}.md`;
    const fullPath = path.join(LESSONS_DIR, filename);

    if (!fs.existsSync(fullPath)) {
      return res.status(404).json({ success: false, message: 'Bài học không tồn tại' });
    }

    const content = fs.readFileSync(fullPath, 'utf-8');
    const lesson = parseLessonMarkdown(content, filename);
    lesson.rawContent = content;

    res.json({ success: true, data: lesson });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 4. POST /api/lessons - Create lesson with audios array
app.post('/api/lessons', upload.single('markdown'), (req, res) => {
  try {
    let filename;
    let content;
    const { id, title, topic, markdown, audios } = req.body;

    const autoId = id && id.trim() 
      ? id.trim().replace(/[^a-zA-Z0-9_-]/g, '_')
      : 'lesson_' + Date.now();

    filename = `${autoId}.md`;

    if (req.file) {
      content = fs.readFileSync(req.file.path, 'utf-8');
    } else {
      if (!markdown) {
        return res.status(400).json({ success: false, message: 'Cần nội dung markdown' });
      }

      const parsed = matter(markdown);
      const data = parsed.data || {};
      
      data.title = title || data.title || autoId;
      data.topic = topic || data.topic || 'Giao tiếp tiếng Trung';
      
      if (audios) {
        data.audios = typeof audios === 'string' ? JSON.parse(audios) : audios;
      }

      content = matter.stringify(parsed.content, data);
    }

    fs.writeFileSync(path.join(LESSONS_DIR, filename), content, 'utf-8');

    if (topic && topic.trim()) {
      const allTopics = getTopics();
      if (!allTopics.includes(topic.trim())) {
        allTopics.push(topic.trim());
        saveTopics(allTopics);
      }
    }

    const lesson = parseLessonMarkdown(content, filename);
    res.json({ success: true, message: 'Đã lưu bài học thành công', data: lesson });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 5. PUT /api/lessons/:id - Update lesson content & audios array
app.put('/api/lessons/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { markdown, title, topic, audios } = req.body;
    const filename = `${id}.md`;
    const fullPath = path.join(LESSONS_DIR, filename);

    if (!markdown) {
      return res.status(400).json({ success: false, message: 'Nội dung markdown không được để trống' });
    }

    const parsed = matter(markdown);
    const data = parsed.data || {};
    if (title) data.title = title;
    if (topic) data.topic = topic;
    if (audios !== undefined) {
      data.audios = typeof audios === 'string' ? JSON.parse(audios) : audios;
      delete data.audio; // Clean up old single audio field
    }

    const content = matter.stringify(parsed.content, data);
    fs.writeFileSync(fullPath, content, 'utf-8');

    const lesson = parseLessonMarkdown(content, filename);
    res.json({ success: true, message: 'Cập nhật bài học thành công', data: lesson });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 6. DELETE /api/lessons/:id - Delete lesson
app.delete('/api/lessons/:id', (req, res) => {
  try {
    const { id } = req.params;
    const filename = `${id}.md`;
    const fullPath = path.join(LESSONS_DIR, filename);

    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
      const annotPath = path.join(ANNOTATIONS_DIR, `${id}.json`);
      if (fs.existsSync(annotPath)) {
        fs.unlinkSync(annotPath);
      }
      return res.json({ success: true, message: 'Đã xóa bài học' });
    }
    res.status(404).json({ success: false, message: 'Bài học không tồn tại' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 7. AUDIO MANAGEMENT GROUPED BY LESSON / CATEGORY
// Upload audio file with custom display title and lessonId/category
app.post('/api/audio/upload', upload.single('audio'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Chưa chọn file âm thanh' });
    }

    const title = req.body.title || req.file.originalname;
    const lessonId = req.body.lessonId || 'general';
    const lessonTitle = req.body.lessonTitle || 'Âm thanh chung';

    const meta = getAudioMetadata();
    meta[req.file.filename] = {
      title,
      lessonId,
      lessonTitle,
      originalName: req.file.originalname,
      createdAt: new Date().toISOString()
    };
    saveAudioMetadata(meta);

    res.json({
      success: true,
      data: {
        filename: req.file.filename,
        title,
        lessonId,
        lessonTitle,
        originalName: req.file.originalname,
        url: `/audio/${req.file.filename}`
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// List all audio files grouped or flat
app.get('/api/audio', (req, res) => {
  try {
    const files = fs.readdirSync(AUDIO_DIR);
    const meta = getAudioMetadata();

    const audioList = files.map((file) => {
      const stats = fs.statSync(path.join(AUDIO_DIR, file));
      const info = meta[file] || {};
      return {
        filename: file,
        title: info.title || file,
        lessonId: info.lessonId || 'general',
        lessonTitle: info.lessonTitle || 'Chung',
        originalName: info.originalName || file,
        url: `/audio/${file}`,
        size: stats.size,
        updatedAt: stats.mtime
      };
    });
    res.json({ success: true, data: audioList });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Delete audio
app.delete('/api/audio/:filename', (req, res) => {
  try {
    const { filename } = req.params;
    const filePath = path.join(AUDIO_DIR, filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      const meta = getAudioMetadata();
      delete meta[filename];
      saveAudioMetadata(meta);
      return res.json({ success: true, message: 'Đã xóa file audio' });
    }
    res.status(404).json({ success: false, message: 'File không tồn tại' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 8. ANNOTATIONS
app.get('/api/annotations/:lessonId', (req, res) => {
  try {
    const { lessonId } = req.params;
    const annotPath = path.join(ANNOTATIONS_DIR, `${lessonId}.json`);
    if (fs.existsSync(annotPath)) {
      const data = JSON.parse(fs.readFileSync(annotPath, 'utf-8'));
      return res.json({ success: true, data });
    }
    res.json({ success: true, data: {} });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.post('/api/annotations/:lessonId', (req, res) => {
  try {
    const { lessonId } = req.params;
    const { slideIndex, drawingData } = req.body;
    const annotPath = path.join(ANNOTATIONS_DIR, `${lessonId}.json`);

    let existing = {};
    if (fs.existsSync(annotPath)) {
      try {
        existing = JSON.parse(fs.readFileSync(annotPath, 'utf-8'));
      } catch (e) {
        existing = {};
      }
    }

    existing[slideIndex] = drawingData;
    fs.writeFileSync(annotPath, JSON.stringify(existing, null, 2), 'utf-8');

    res.json({ success: true, message: 'Đã lưu nét vẽ' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.delete('/api/annotations/:lessonId/:slideIndex?', (req, res) => {
  try {
    const { lessonId, slideIndex } = req.params;
    const annotPath = path.join(ANNOTATIONS_DIR, `${lessonId}.json`);

    if (fs.existsSync(annotPath)) {
      if (slideIndex !== undefined) {
        const existing = JSON.parse(fs.readFileSync(annotPath, 'utf-8'));
        delete existing[slideIndex];
        fs.writeFileSync(annotPath, JSON.stringify(existing, null, 2), 'utf-8');
      } else {
        fs.unlinkSync(annotPath);
      }
    }
    res.json({ success: true, message: 'Đã xóa nét vẽ' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

if (process.env.NODE_ENV !== 'test' && !process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`Server ChucLingo is running on http://localhost:${PORT}`);
  });
}

module.exports = app;
