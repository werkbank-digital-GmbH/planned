import { useState, useCallback, useEffect } from 'react';

interface UseResizableOptions {
  defaultHeight: number;
  minHeight: number;
  maxHeight: number;
  storageKey?: string;
}

/**
 * Hook für resizable UI-Elemente (z.B. ResourcePool).
 * Unterstützt Mouse und Touch Events.
 * Persistiert die Höhe im localStorage.
 */
export function useResizable({
  defaultHeight,
  minHeight,
  maxHeight,
  storageKey = 'resourcePoolHeight',
}: UseResizableOptions) {
  // Initial height from localStorage or default
  const [height, setHeight] = useState(() => {
    if (typeof window === 'undefined') return defaultHeight;
    const stored = localStorage.getItem(storageKey);
    if (stored) {
      const parsed = parseInt(stored, 10);
      if (!isNaN(parsed) && parsed >= minHeight && parsed <= maxHeight) {
        return parsed;
      }
    }
    return defaultHeight;
  });

  const [isDragging, setIsDragging] = useState(false);
  const [startY, setStartY] = useState(0);
  const [startHeight, setStartHeight] = useState(height);

  // Save to localStorage when height changes
  useEffect(() => {
    if (storageKey) {
      localStorage.setItem(storageKey, String(height));
    }
  }, [height, storageKey]);

  // Mouse handlers
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      setIsDragging(true);
      setStartY(e.clientY);
      setStartHeight(height);
    },
    [height]
  );

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging) return;

      // Nach oben ziehen = größer (startY - currentY = positive delta)
      const delta = startY - e.clientY;
      const newHeight = Math.min(maxHeight, Math.max(minHeight, startHeight + delta));
      setHeight(newHeight);
    },
    [isDragging, startY, startHeight, minHeight, maxHeight]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Touch handlers
  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      const touch = e.touches[0];
      setIsDragging(true);
      setStartY(touch.clientY);
      setStartHeight(height);
    },
    [height]
  );

  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      if (!isDragging) return;
      const touch = e.touches[0];
      const delta = startY - touch.clientY;
      const newHeight = Math.min(maxHeight, Math.max(minHeight, startHeight + delta));
      setHeight(newHeight);
    },
    [isDragging, startY, startHeight, minHeight, maxHeight]
  );

  // Global mouse/touch events for dragging
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.addEventListener('touchmove', handleTouchMove);
      document.addEventListener('touchend', handleMouseUp);
      document.body.style.cursor = 'ns-resize';
      document.body.style.userSelect = 'none';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isDragging, handleMouseMove, handleMouseUp, handleTouchMove]);

  return {
    height,
    isDragging,
    handleMouseDown,
    handleTouchStart,
    // Reset to default
    resetHeight: () => setHeight(defaultHeight),
  };
}
