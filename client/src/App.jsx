import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LessonList from './pages/LessonList';
import SlideViewer from './pages/SlideViewer';
import Admin from './pages/Admin';
import { ToastProvider } from './components/Toast';

export default function App() {
  return (
    <ToastProvider>
      <Router>
        <Routes>
          <Route path="/" element={<LessonList />} />
          <Route path="/slide/:id" element={<SlideViewer />} />
          <Route path="/admin" element={<Admin />} />
        </Routes>
      </Router>
    </ToastProvider>
  );
}
