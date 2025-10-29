import React, { useState, useRef, useCallback, useEffect } from 'react';

export default function DraggableSVGItem({ x, y, onPositionChange, constraints, children }) {
  const [isDragging, setIsDragging] = useState(false);
  const offset = useRef({ x: 0, y: 0 });
  const itemRef = useRef(null);

  // Helper to get correct coordinates for both mouse and touch events
  const getPointerPosition = (e) => {
    if (e.touches && e.touches.length > 0) {
      // Correctly access the first touch point
      return { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
    // Fallback for mouse events
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
      // Add event listeners for both mouse and touch
      node.addEventListener('mousedown', handleDragStart);
      node.addEventListener('touchstart', handleDragStart, { passive: true });
    }

    if (isDragging) {
      document.addEventListener('mousemove', handleDragMove);
      document.addEventListener('touchmove', handleDragMove, { passive: false });
      document.addEventListener('mouseup', handleDragEnd);
      document.addEventListener('touchend', handleDragEnd);
    }
    
    // Cleanup function
    return () => {
      if (node) {
        node.removeEventListener('mousedown', handleDragStart);
        node.removeEventListener('touchstart', handleDragStart);
      }
      document.removeEventListener('mousemove', handleDragMove);
      document.removeEventListener('touchmove', handleDragMove);
      document.removeEventListener('mouseup', handleDragEnd);
      document.removeEventListener('touchend', handleDragEnd);
    };
  }, [isDragging, handleDragStart, handleDragMove, handleDragEnd]);

  return (
    <g ref={itemRef} transform={`translate(${x}, ${y})`} style={{ cursor: isDragging ? 'grabbing' : 'grab' }}>
      {children}
    </g>
  );
}```

### **Steps to Fix and Redeploy**

Please follow these steps exactly to ensure the fix is applied.

1.  **Open your command line/terminal** and navigate to your local `plot-diagram-app` directory.

2.  **Stage the single changed file:**
    ```bash
    git add src/components/DraggableSVGItem.jsx
    ```

3.  **Commit the fix** with a clear message:
    ```bash
    git commit -m "FIX: Correct syntax and touch logic in DraggableSVGItem"
    ```

4.  **Push the fix to GitHub:**
    ```bash
    git push origin main
    ```

This time, the build should pass the syntax check and proceed. Thank you for your patience, and let's get this working.
