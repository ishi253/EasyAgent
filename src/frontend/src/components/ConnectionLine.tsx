import { IconButton } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';

interface ConnectionLineProps {
  id: string;
  sourceX: number;
  sourceY: number;
  targetX: number;
  targetY: number;
  isActive?: boolean;
  onDelete: (id: string) => void;
}

export function ConnectionLine({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  isActive,
  onDelete,
}: ConnectionLineProps) {
  // Calculate path for directed graph style
  const dx = targetX - sourceX;
  const dy = targetY - sourceY;
  
  // Use straight line with minimal curve for directed graph look
  const midX = sourceX + dx * 0.5;
  const midY = sourceY + dy * 0.5;
  
  // Create path with slight horizontal emphasis
  const path = dx > 100 
    ? `M ${sourceX} ${sourceY} L ${sourceX + 50} ${sourceY} L ${targetX - 50} ${targetY} L ${targetX} ${targetY}`
    : `M ${sourceX} ${sourceY} L ${targetX} ${targetY}`;

  // Unique marker ID for this connection
  const markerId = `arrowhead-${id}`;

  return (
    <g>
      {/* Arrow marker definition */}
      <defs>
        <marker
          id={markerId}
          markerWidth="10"
          markerHeight="10"
          refX="9"
          refY="5"
          orient="auto"
        >
          <path
            d="M 0 0 L 10 5 L 0 10 L 2 5 Z"
            fill={isActive ? '#3b82f6' : '#475569'}
          />
        </marker>
      </defs>
      
      {/* Invisible thicker path for easier hovering */}
      <path
        d={path}
        fill="none"
        stroke="transparent"
        strokeWidth="20"
        style={{ cursor: 'pointer' }}
      />
      
      {/* Visible path with shadow for depth */}
      <path
        d={path}
        fill="none"
        stroke={isActive ? '#60a5fa' : '#94a3b8'}
        strokeWidth={isActive ? '2.5' : '2'}
        strokeOpacity="0.3"
        strokeDasharray="none"
        transform="translate(1, 1)"
      />
      
      {/* Main visible path */}
      <path
        d={path}
        fill="none"
        stroke={isActive ? '#3b82f6' : '#475569'}
        strokeWidth={isActive ? '2.5' : '2'}
        markerEnd={`url(#${markerId})`}
      />
      
      {/* Animated dots when active */}
      {isActive && (
        <>
          <circle r="3" fill="#3b82f6" opacity="0.8">
            <animateMotion dur="1.2s" repeatCount="indefinite" path={path} />
          </circle>
          <circle r="3" fill="#3b82f6" opacity="0.6">
            <animateMotion dur="1.2s" repeatCount="indefinite" path={path} begin="0.4s" />
          </circle>
          <circle r="3" fill="#3b82f6" opacity="0.4">
            <animateMotion dur="1.2s" repeatCount="indefinite" path={path} begin="0.8s" />
          </circle>
        </>
      )}
      
      {/* Delete button */}
      <foreignObject
        x={midX - 14}
        y={midY - 14}
        width="28"
        height="28"
        style={{ pointerEvents: 'auto' }}
      >
        <IconButton
          size="small"
          onClick={() => onDelete(id)}
          sx={{
            width: 28,
            height: 28,
            backgroundColor: 'background.paper',
            border: '1px solid',
            borderColor: 'error.main',
            color: 'error.main',
            boxShadow: 2,
            '&:hover': {
              backgroundColor: 'error.main',
              color: '#fff',
            },
          }}
        >
          <CloseIcon fontSize="inherit" />
        </IconButton>
      </foreignObject>
    </g>
  );
}
