import React, { useState } from 'react';
import type { ReschedulePayload, RescheduleMode, RescheduleUnit } from '../types';
import { CloseIcon } from './Icons';

interface RescheduleModalProps {
  onClose: () => void;
  onReschedule: (payload: ReschedulePayload) => Promise<void>;
  taskCount: number;
}

const RescheduleModal: React.FC<RescheduleModalProps> = ({ onClose, onReschedule, taskCount }) => {
  const [mode, setMode] = useState<RescheduleMode>('relative');
  const [relativeValue, setRelativeValue] = useState('1');
  const [relativeUnit, setRelativeUnit] = useState<RescheduleUnit>('days');
  const [specificDate, setSpecificDate] = useState(new Date().toISOString().split('T')[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    const payload: ReschedulePayload = { mode };
    if (mode === 'specific') {
      if (!specificDate) {
        setIsSubmitting(false);
        return; // Don't submit if date is empty
      }
      payload.date = specificDate;
    } else {
      payload.value = parseInt(relativeValue, 10) || 0;
      payload.unit = relativeUnit;
    }
    
    await onReschedule(payload);
    // Parent component will close the modal on success
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-md p-6 relative animate-fade-in-up">
        <button onClick={onClose} className="absolute top-3 right-3 text-gray-500 hover:text-white transition-colors">
          <CloseIcon className="w-6 h-6" />
        </button>
        <h2 className="text-lg font-bold text-white mb-4">Reschedule {taskCount} Task(s)</h2>
        <form onSubmit={handleSubmit}>
          <div className="flex border-b border-gray-600 mb-4">
            <button type="button" onClick={() => setMode('relative')} className={`py-2 px-4 text-sm font-medium transition-colors ${mode === 'relative' ? 'text-indigo-400 border-b-2 border-indigo-400' : 'text-gray-400 hover:text-white'}`}>
              Add Time
            </button>
            <button type="button" onClick={() => setMode('specific')} className={`py-2 px-4 text-sm font-medium transition-colors ${mode === 'specific' ? 'text-indigo-400 border-b-2 border-indigo-400' : 'text-gray-400 hover:text-white'}`}>
              Set Specific Date
            </button>
          </div>

          {mode === 'relative' ? (
            <div className="grid grid-cols-2 gap-4">
              <input
                type="number"
                min="1"
                value={relativeValue}
                onChange={(e) => setRelativeValue(e.target.value)}
                className="w-full bg-gray-700 text-white rounded-md p-2 border border-gray-600 focus:ring-2 focus:ring-indigo-500"
                autoFocus
                required
              />
              <select
                value={relativeUnit}
                onChange={(e) => setRelativeUnit(e.target.value as RescheduleUnit)}
                className="w-full bg-gray-700 text-white rounded-md p-2 border border-gray-600 focus:ring-2 focus:ring-indigo-500"
              >
                <option value="minutes">Minutes</option>
                <option value="hours">Hours</option>
                <option value="days">Days</option>
                <option value="months">Months</option>
                <option value="years">Years</option>
              </select>
            </div>
          ) : (
            <div>
              <input
                type="date"
                value={specificDate}
                onChange={(e) => setSpecificDate(e.target.value)}
                className="w-full bg-gray-700 text-white rounded-md p-2 border border-gray-600 focus:ring-2 focus:ring-indigo-500"
                autoFocus
                required
              />
            </div>
          )}
          
          <div className="flex justify-end gap-4 mt-6">
            <button type="button" onClick={onClose} disabled={isSubmitting} className="px-4 py-2 bg-gray-600 text-white rounded-md font-semibold hover:bg-gray-500 disabled:opacity-50 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={isSubmitting} className="px-4 py-2 bg-indigo-600 text-white rounded-md font-semibold hover:bg-indigo-700 disabled:bg-indigo-800 disabled:cursor-not-allowed transition-colors">
              {isSubmitting ? 'Rescheduling...' : 'Reschedule'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RescheduleModal;
