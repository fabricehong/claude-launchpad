import { useEffect } from 'react';

interface Props {
  message: string;
  variant: 'success' | 'error';
  onDismiss: () => void;
}

export default function Toast({ message, variant, onDismiss }: Props) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, 3000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  const bg = variant === 'success' ? '#276749' : '#9b2c2c';
  const border = variant === 'success' ? '#2f855a' : '#c53030';

  return (
    <div
      onClick={onDismiss}
      style={{
        position: 'fixed',
        bottom: '1.5rem',
        left: '50%',
        transform: 'translateX(-50%)',
        background: bg,
        border: `1px solid ${border}`,
        borderRadius: '8px',
        color: '#fff',
        cursor: 'pointer',
        fontSize: '0.875rem',
        maxWidth: '90vw',
        padding: '0.625rem 1.25rem',
        whiteSpace: 'nowrap',
        zIndex: 1000,
      }}
    >
      {message}
    </div>
  );
}
