import React, { useState, useRef, useCallback, useEffect } from 'react';

export default function DraggableSVGItem({ x, y, onPositionChange, constraints, children }) {
  const [isDragging, setIsDragging] = useState(false);
  const offset = useRef({ x: 0, y: 0 });
  const itemRef = useRef(null);

  const handleMouseDown = (e) => {
    setIsDragging(true);
    const CTM = itemRef.current.getScreenCTM();
    offset.current = { x: (e.clientX - CTM.e) / CTM.a - x, y: (e.clientY - CTM.f) / CTM.d - y };
  };

  const handleMouseMove = useCallback((e) => {
    if (isDragging) {
      e.preventDefault();
      const CTM = itemRef.current.getScreenCTM();
      let newX = (e.clientX - CTM.e) / CTM.a - offset.current.x;
      let newY = (e.clientY - CTM.f) / CTM.d - offset.current.y;
      if (constraints) {
        newX = Math.max(constraints.x, Math.min(newX, constraints.maxX));
        newY = Math.max(constraints.y, Math.min(newY, constraints.maxY));
      }
      onPositionChange({ x: newX, y: newY });
    }
  }, [isDragging, onPositionChange, constraints]);

  const handleMouseUp = () => setIsDragging(false);

  useEffect(() => {
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, handleMouseMove]);

  return <g ref={itemRef} transform={`translate(${x}, ${y})`} onMouseDown={handleMouseDown} style={{ cursor: isDragging ? 'grabbing' : 'grab' }}>{children}</g>;
};
