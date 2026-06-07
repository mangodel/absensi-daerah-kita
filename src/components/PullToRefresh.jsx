import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { RotateCw } from 'lucide-react';

export default function PullToRefresh({ children, onRefresh, isLoading = false }) {
  const { containerRef, isPulling, pullDistance } = usePullToRefresh(onRefresh);

  return (
    <div
      ref={containerRef}
      className="overflow-y-auto"
    >
      {/* Pull indicator */}
      <div
        style={{
          height: `${pullDistance}px`,
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: pullDistance > 0 ? 'none' : 'height 0.3s ease',
        }}
      >
        <div
          style={{
            transform: `rotate(${Math.min(pullDistance / 80 * 360, 360)}deg)`,
            transition: 'transform 0.1s linear',
          }}
        >
          <RotateCw
            className={`w-5 h-5 ${isPulling || isLoading ? 'text-primary animate-spin' : 'text-muted-foreground'}`}
          />
        </div>
      </div>

      {/* Content */}
      <div className="opacity-100 transition-opacity">
        {children}
      </div>
    </div>
  );
}