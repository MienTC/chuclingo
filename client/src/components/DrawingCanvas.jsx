import React, { useRef, useEffect } from 'react';

export default function DrawingCanvas({
  isDrawingMode,
  color,
  lineWidth,
  tool, // 'pencil' | 'eraser'
  savedData,
  onSave
}) {
  const canvasRef = useRef(null);
  const isDrawingRef = useRef(false);
  const lastPosRef = useRef({ x: 0, y: 0 });

  // Resize canvas without heavy re-render
  const setupCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const parent = canvas.parentElement;
    if (!parent) return;

    // Use current dimensions
    const width = parent.clientWidth;
    const height = parent.clientHeight;

    if (canvas.width !== width || canvas.height !== height) {
      // Preserve drawing
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = canvas.width;
      tempCanvas.height = canvas.height;
      const tempCtx = tempCanvas.getContext('2d');
      if (canvas.width > 0 && canvas.height > 0) {
        tempCtx.drawImage(canvas, 0, 0);
      }

      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      if (tempCanvas.width > 0 && tempCanvas.height > 0) {
        ctx.drawImage(tempCanvas, 0, 0);
      }
    }
  };

  useEffect(() => {
    setupCanvas();
    const handleResize = () => setupCanvas();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Load saved drawings when slide changes
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (savedData) {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0);
      };
      img.src = savedData;
    }
  }, [savedData]);

  // Pure fast touch & pointer coordinate extraction
  const getCoordinates = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const clientX = e.clientX !== undefined ? e.clientX : (e.touches && e.touches[0] ? e.touches[0].clientX : 0);
    const clientY = e.clientY !== undefined ? e.clientY : (e.touches && e.touches[0] ? e.touches[0].clientY : 0);
    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  };

  // POINTER EVENTS API (Prevents screen moving, ultra fast 120fps hardware accelerated)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const onPointerDown = (e) => {
      if (!isDrawingMode) return;
      e.preventDefault();
      e.stopPropagation();

      try {
        canvas.setPointerCapture(e.pointerId);
      } catch (err) {}

      isDrawingRef.current = true;
      const coords = getCoordinates(e);
      lastPosRef.current = coords;

      const ctx = canvas.getContext('2d');
      ctx.beginPath();
      ctx.moveTo(coords.x, coords.y);
      ctx.lineTo(coords.x + 0.1, coords.y + 0.1);
      
      if (tool === 'eraser') {
        ctx.globalCompositeOperation = 'destination-out';
        ctx.lineWidth = Math.max(lineWidth * 5, 24);
      } else {
        ctx.globalCompositeOperation = 'source-over';
        ctx.strokeStyle = color;
        ctx.lineWidth = lineWidth;
      }
      ctx.stroke();
    };

    const onPointerMove = (e) => {
      if (!isDrawingRef.current || !isDrawingMode) return;
      e.preventDefault();
      e.stopPropagation();

      const coords = getCoordinates(e);
      const ctx = canvas.getContext('2d');

      ctx.beginPath();
      ctx.moveTo(lastPosRef.current.x, lastPosRef.current.y);
      ctx.lineTo(coords.x, coords.y);

      if (tool === 'eraser') {
        ctx.globalCompositeOperation = 'destination-out';
        ctx.lineWidth = Math.max(lineWidth * 5, 24);
      } else {
        ctx.globalCompositeOperation = 'source-over';
        ctx.strokeStyle = color;
        ctx.lineWidth = lineWidth;
      }

      ctx.stroke();
      lastPosRef.current = coords;
    };

    const onPointerUp = (e) => {
      if (!isDrawingRef.current) return;
      e.preventDefault();
      e.stopPropagation();
      isDrawingRef.current = false;

      try {
        canvas.releasePointerCapture(e.pointerId);
      } catch (err) {}

      const ctx = canvas.getContext('2d');
      ctx.closePath();
      ctx.globalCompositeOperation = 'source-over';

      if (onSave) {
        onSave(canvas.toDataURL());
      }
    };

    // Attach native non-passive listeners with touch-action: none
    canvas.addEventListener('pointerdown', onPointerDown, { passive: false });
    canvas.addEventListener('pointermove', onPointerMove, { passive: false });
    canvas.addEventListener('pointerup', onPointerUp, { passive: false });
    canvas.addEventListener('pointercancel', onPointerUp, { passive: false });

    return () => {
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerup', onPointerUp);
      canvas.removeEventListener('pointercancel', onPointerUp);
    };
  }, [isDrawingMode, tool, color, lineWidth]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: isDrawingMode ? 30 : 5,
        pointerEvents: isDrawingMode ? 'auto' : 'none',
        touchAction: 'none', // STOPS SCREEN FROM MOVING / SCROLLING WHILE DRAWING
        userSelect: 'none',
        WebkitUserSelect: 'none',
        cursor: isDrawingMode ? (tool === 'eraser' ? 'cell' : 'crosshair') : 'default'
      }}
    />
  );
}
