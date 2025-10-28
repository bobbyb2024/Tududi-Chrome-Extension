
import React from 'react';
import type { Task } from '../types';
import { CloseIcon } from './Icons';

interface ConfirmDeleteModalProps {
  onClose: () => void;
  onConfirm: () => Promise<void>;
  task: Task;
  isDeleting: boolean;
}

const ConfirmDeleteModal: React.FC<ConfirmDeleteModalProps> = ({ onClose, onConfirm, task, isDeleting }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-md p-6 relative animate-fade-in-up">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-500 hover:text-white transition-colors"
          aria-label="Close"
        >
          <CloseIcon className="w-6 h-6" />
        </button>
        <h2 className="text-lg font-bold text-white mb-4">Confirm Deletion</h2>
        <p className="text-gray-300 mb-4">
          Are you sure you want to delete this task? This action cannot be undone.
        </p>
        <div className="bg-gray-900/50 p-3 rounded-md mb-6 border border-gray-700">
            <p className="text-white italic">{task.content}</p>
        </div>
        <div className="flex justify-end gap-4">
          <button
            onClick={onClose}
            disabled={isDeleting}
            className="px-4 py-2 bg-gray-600 text-white rounded-md font-semibold hover:bg-gray-500 disabled:opacity-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isDeleting}
            className="px-4 py-2 bg-red-600 text-white rounded-md font-semibold hover:bg-red-700 disabled:bg-red-800 disabled:cursor-not-allowed transition-colors"
          >
            {isDeleting ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDeleteModal;
