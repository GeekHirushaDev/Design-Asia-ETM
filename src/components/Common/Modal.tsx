import React from 'react';

interface ModalProps {
  open: boolean;
  title?: string;
  size?: 'sm' | 'md' | 'lg';
  onClose: () => void;
  footer?: React.ReactNode;
  children: React.ReactNode;
}

const sizeClass = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-2xl',
};

export const Modal: React.FC<ModalProps> = ({ open, title, size = 'md', onClose, footer, children }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className={`bg-white rounded-lg p-6 w-full ${sizeClass[size]}`}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
        </div>
        <div>{children}</div>
        {footer && (
          <div className="mt-4 flex justify-end gap-2">{footer}</div>
        )}
      </div>
    </div>
  );
};




