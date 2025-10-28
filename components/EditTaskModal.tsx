import React, { useState, useMemo } from 'react';
import type { Project, Task } from '../types';
import { CloseIcon } from './Icons';

interface EditTaskModalProps {
  onClose: () => void;
  onSave: (task: Task) => Promise<void>;
  projects: Project[];
  task: Task;
}

const EditTaskModal: React.FC<EditTaskModalProps> = ({ onClose, onSave, projects, task }) => {
  const [content, setContent] = useState(task.content);
  const [selectedProjectId, setSelectedProjectId] = useState<string>(task.project?.id || '');
  
  // Format the ISO string date to YYYY-MM-DD for the date input
  const initialDate = useMemo(() => {
    if (!task.dueDate) return '';
    try {
      return new Date(task.dueDate).toISOString().split('T')[0];
    } catch {
      return '';
    }
  }, [task.dueDate]);

  const [dueDate, setDueDate] = useState(initialDate);
  const [reminderValue, setReminderValue] = useState<string>(task.reminderValue?.toString() || '');
  const [reminderUnit, setReminderUnit] = useState<'minutes' | 'hours' | 'days'>(task.reminderUnit || 'minutes');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    setIsSubmitting(true);

    const selectedProject = projects.find(p => p.id === selectedProjectId) || null;
    
    const newDueDate = dueDate ? new Date(dueDate + 'T00:00:00Z').toISOString() : null;
    const reminderNumber = reminderValue ? parseInt(reminderValue, 10) : null;

    const updatedTask: Task = {
      ...task,
      content,
      project: selectedProject,
      dueDate: newDueDate,
      reminderValue: reminderNumber,
      reminderUnit: reminderNumber ? reminderUnit : null,
    };
    
    await onSave(updatedTask);
    setIsSubmitting(false);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-md p-6 relative animate-fade-in-up">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-500 hover:text-white transition-colors"
        >
          <CloseIcon className="w-6 h-6" />
        </button>
        <h2 className="text-lg font-bold text-white mb-4">Edit Task</h2>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
             <label htmlFor="content" className="block text-sm font-medium text-gray-400 mb-1">Content</label>
            <textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full bg-gray-700 text-white rounded-md p-2 border border-gray-600 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              rows={3}
              autoFocus
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
             <div>
                <label htmlFor="project" className="block text-sm font-medium text-gray-400 mb-1">Project</label>
                <select
                    id="project"
                    value={selectedProjectId}
                    onChange={(e) => setSelectedProjectId(e.target.value)}
                    className="w-full bg-gray-700 text-white rounded-md p-2 border border-gray-600 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                    <option value="">Inbox</option>
                    {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
             </div>
             <div>
                <label htmlFor="dueDate" className="block text-sm font-medium text-gray-400 mb-1">Due Date</label>
                <input
                    id="dueDate"
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full bg-gray-700 text-white rounded-md p-2 border border-gray-600 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
             </div>
          </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                <label className="block text-sm font-medium text-gray-400 sm:col-span-2">Reminder</label>
                <input
                    type="number"
                    min="1"
                    value={reminderValue}
                    onChange={(e) => setReminderValue(e.target.value)}
                    placeholder="e.g., 30"
                    className="bg-gray-700 text-white rounded-md p-2 border border-gray-600 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    aria-label="Reminder value"
                />
                <select
                    value={reminderUnit}
                    onChange={(e) => setReminderUnit(e.target.value as 'minutes' | 'hours' | 'days')}
                    className="bg-gray-700 text-white rounded-md p-2 border border-gray-600 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    aria-label="Reminder unit"
                    >
                    <option value="minutes">minutes before</option>
                    <option value="hours">hours before</option>
                    <option value="days">days before</option>
                </select>
            </div>
          <button
            type="submit"
            disabled={isSubmitting || !content.trim()}
            className="w-full bg-indigo-600 text-white rounded-md py-2 font-semibold hover:bg-indigo-700 disabled:bg-gray-500 disabled:cursor-not-allowed transition-colors"
          >
            {isSubmitting ? 'Saving...' : 'Save Changes'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default EditTaskModal;