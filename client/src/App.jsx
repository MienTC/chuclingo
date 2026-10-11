import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LessonList from './pages/LessonList';
import SlideViewer from './pages/SlideViewer';
import Admin from './pages/Admin';

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LessonList />} />
        <Route path="/slide/:id" element={<SlideViewer />} />
        <Route path="/admin" element={<Admin />} />
      </Routes>
    </Router>
  );
}
