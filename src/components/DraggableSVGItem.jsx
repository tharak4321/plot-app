import React, { useState, useRef, useCallback, useEffect } from 'react';

export default function DraggableSVGItem({ x, y, onPositionChange, constraints, children }) {
  const [isDragging, setIsDragging] = useState(false);
  const offset = useRef({ x: 0, y: 0 });
  const itemRef = useRef(null);

  const getPointerPosition = (e) => {
    if (e.touches && e.touches.length > 0) {
      return { x: e.touches.clientX, y: e.touches.clientY };
    }
    return { x: e.clientX, y: e.clientY };
  };

  const handleDragStart = useCallback((e) => {
    setIsDragging(true);
    const pos = getPointerPosition(e);
    const CTM = itemRef.current.getScreenCTM();
    offset.current = {
      x: (pos.x - CTM.e) / CTM.a - x,
      y: (pos.y - CTM.f) / CTM.d - y,
    };
  }, [x, y]);

  const handleDragMove = useCallback((e) => {
    if (isDragging) {
      e.preventDefault(); // Prevents page scrolling on touch devices
      const pos = getPointerPosition(e);
      const CTM = itemRef.current.getScreenCTM();
      let newX = (pos.x - CTM.e) / CTM.a - offset.current.x;
      let newY = (pos.y - CTM.f) / CTM.d - offset.current.y;
      if (constraints) {
        newX = Math.max(constraints.x, Math.min(newX, constraints.maxX));
        newY = Math.max(constraints.y, Math.min(newY, constraints.maxY));
      }
      onPositionChange({ x: newX, y: newY });
    }
  }, [isDragging, onPositionChange, constraints]);

  const handleDragEnd = useCallback(() => setIsDragging(false), []);

  useEffect(() => {
    const node = itemRef.current;
    if (node) {
      // Mouse Events
      node.addEventListener('mousedown', handleDragStart);
      // Touch Events
      node.addEventListener('touchstart', handleDragStart, { passive: true });
    }

    if (isDragging) {
      document.addEventListener('mousemove', handleDragMove);
      document.addEventListener('mouseup', handleDragEnd);
      document.addEventListener('touchmove', handleDragMove, { passive: false });
      document.addEventListener('touchend', handleDragEnd);
    }
    
    return () => {
      if (node) {
        node.removeEventListener('mousedown', handleDragStart);
        node.removeEventListener('touchstart', handleDragStart);
      }
      document.removeEventListener('mousemove', handleDragMove);
      document.removeEventListener('mouseup', handleDragEnd);
      document.removeEventListener('touchmove', handleDragMove);
      document.removeEventListener('touchend', handleDragEnd);
    };
  }, [isDragging, handleDragStart, handleDragMove, handleDragEnd]);

  return <g ref={itemRef} transform={`translate(${x}, ${y})`} style={{ cursor: isDragging ? 'grabbing' : 'grab' }}>{children}</g>;
};
