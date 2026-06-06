import { useEffect, useRef, useState } from 'react';

export function usePullToRefresh(onRefresh) {
  const [isPulling, setIsPulling] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const startYRef = useRef(0);
  const containerRef = useRef(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleTouchStart = (e) => {
      if (container.scrollTop === 0) {
        startYRef.current = e.touches[0].clientY;
      }
    };

    const handleTouchMove = (e) => {
      if (container.scrollTop === 0 && startYRef.current > 0) {
        const currentY = e.touches[0].clientY;
        const distance = currentY - startYRef.current;
        
        if (distance > 0) {
          setPullDistance(Math.min(distance, 80));
          setIsPulling(distance > 60);
        }
      }
    };

    const handleTouchEnd = () => {
      if (isPulling) {
        setIsPulling(false);
        setPullDistance(0);
        onRefresh?.();
      } else {
        setPullDistance(0);
      }
      startYRef.current = 0;
    };

    container.addEventListener('touchstart', handleTouchStart, { passive: true });
    container.addEventListener('touchmove', handleTouchMove, { passive: true });
    container.addEventListener('touchend', handleTouchEnd);

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isPulling, onRefresh]);

  return { containerRef, isPulling, pullDistance };
}