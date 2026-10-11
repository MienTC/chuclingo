import React, { useRef, useEffect, useState } from 'react';

export default function DrawingCanvas({
  isDrawingMode,
  color,
  lineWidth,
  tool, // 'pencil' | 'eraser'
  savedData,
  onSave
}) {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [history, setHistory] = useState([]);

  // Adjust canvas size to match parent container exactly
  const resizeCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const parent = canvas.parentElement;
    if (!parent) return;

    // Save existing image content before resizing
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;
    const tempCtx = tempCanvas.getContext('2d');
    if (canvas.width > 0 && canvas.height > 0) {
      tempCtx.drawImage(canvas, 0, 0);
    }

    canvas.width = parent.clientWidth;
    canvas.height = parent.clientHeight;

    const ctx = canvas.getContext('2d');
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (tempCanvas.width > 0 && tempCanvas.height > 0) {
      ctx.drawImage(tempCanvas, 0, 0, canvas.width, canvas.height);
    }
  };

  useEffect(() => {
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    return () => window.removeEventListener('resize', resizeCanvas);
  }, []);

  // Load saved drawing data when slide changes
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (savedData) {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      };
      img.src = savedData;
    }
  }, [savedData]);

  const getCoordinates = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  };

  const startDrawing = (e) => {
    if (!isDrawingMode) return;
    e.preventDefault();
    const { x, y } = getCoordinates(e);
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    // Save history for Undo
    setHistory((prev) => [...prev.slice(-10), canvas.toDataURL()]);

    ctx.beginPath();
    ctx.moveTo(x, y);

    if (tool === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.lineWidth = Math.max(lineWidth * 5, 20); // Eraser width
    } else {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = color;
      ctx.lineWidth = lineWidth;
    }

    setIsDrawing(true);
  };

  const draw = (e) => {
    if (!isDrawing || !isDrawingMode) return;
    e.preventDefault();
    const { x, y } = getCoordinates(e);
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.closePath();
    ctx.globalCompositeOperation = 'source-over'; // Reset mode
    setIsDrawing(false);

    if (onSave) {
      onSave(canvas.toDataURL());
    }
  };

  const handleUndo = () => {
    if (history.length === 0) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const lastState = history[history.length - 1];
    setHistory((prev) => prev.slice(0, -1));

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (lastState) {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0);
        if (onSave) onSave(canvas.toDataURL());
      };
      img.src = lastState;
    }
  };

  return (
    <canvas
      ref={canvasRef}
      onMouseDown={startDrawing}
      onMouseMove={draw}
      onMouseUp={stopDrawing}
      onMouseLeave={stopDrawing}
      onTouchStart={startDrawing}
      onTouchMove={draw}
      onTouchEnd={stopDrawing}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: isDrawingMode ? 20 : 10,
        pointerEvents: isDrawingMode ? 'auto' : 'none',
        cursor: isDrawingMode ? (tool === 'eraser' ? 'cell' : 'crosshair') : 'default'
      }}
    />
  );
}
