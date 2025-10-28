import React from 'react';
import type { Task } from '../types';
import { TaskType } from '../types';
import { EditIcon, TrashIcon, ClockIcon, TagIcon, NoteIcon, LinkIcon } from './Icons';

interface TaskItemProps {
  task: Task;
  serverUrl: string;
  isSelected: boolean;
  onToggleSelection: (taskId: string) => void;
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
}

const TaskItem: React.FC<TaskItemProps> = ({ task, serverUrl, isSelected, onToggleSelection, onEdit, onDelete }) => {
  const taskUrl = `${serverUrl.replace(/\/$/, '')}/${task.type === TaskType.NOTE ? 'note' : 'task'}/${task.id}`;
  const isNote = task.type === TaskType.NOTE;

  const handleActionClick = (e: React.MouseEvent, action: (task: Task) => void) => {
    e.preventDefault();
    e.stopPropagation();
    action(task);
  };
  
  const formatDate = (dateString: string | null) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const taskDate = new Date(date.getTime());
    taskDate.setHours(0, 0, 0, 0);

    if (taskDate.getTime() === today.getTime()) {
      return 'Today';
    }
    
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    if (taskDate.getTime() === tomorrow.getTime()) {
      return 'Tomorrow';
    }
    
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  const formattedDate = formatDate(task.dueDate);
  const displayContent = isNote ? task.content.split('\n')[0] : task.content;

  return (
     <div
      onClick={() => onToggleSelection(task.id)}
      className={`p-3 bg-gray-800 rounded-lg group transition-all duration-200 cursor-pointer flex items-start gap-3 ${isSelected ? 'bg-indigo-900/60 ring-2 ring-indigo-500' : 'hover:bg-gray-700'}`}
    >
      <input
        type="checkbox"
        checked={isSelected}
        readOnly
        className="mt-1 h-4 w-4 rounded border-gray-500 bg-gray-700 text-indigo-600 focus:ring-indigo-500 flex-shrink-0"
        aria-label={`Select task: ${task.content}`}
      />

      <div className="flex-grow">
        <div className="flex justify-between items-start">
            <p className="text-gray-200 group-hover:text-white pr-2 flex-grow flex items-start">
            {isNote && <NoteIcon className="w-4 h-4 mr-2 mt-1 flex-shrink-0 text-gray-500" />}
            <span>{displayContent}</span>
            </p>
            <div className="flex items-center flex-shrink-0 ml-2">
                {formattedDate && (
                    <span className="text-xs font-medium text-indigo-400 whitespace-nowrap bg-indigo-900/50 px-2 py-1 rounded-full">
                        {formattedDate}
                    </span>
                )}
                 <a
                    href={taskUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="ml-2 p-1 text-gray-500 rounded-full hover:bg-gray-600 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    aria-label="Open in TuDuDi"
                >
                    <LinkIcon className="w-4 h-4" />
                </a>
                {!isNote && (
                <>
                    <button
                        onClick={(e) => handleActionClick(e, onEdit)}
                        className="p-1 text-gray-500 rounded-full hover:bg-gray-600 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        aria-label="Edit task"
                    >
                        <EditIcon className="w-4 h-4" />
                    </button>
                    <button
                        onClick={(e) => handleActionClick(e, onDelete)}
                        className="ml-1 p-1 text-gray-500 rounded-full hover:bg-red-900/50 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-red-500"
                        aria-label="Delete task"
                    >
                        <TrashIcon className="w-4 h-4" />
                    </button>
                </>
                )}
            </div>
        </div>
        <div className="flex items-center justify-between mt-2 text-xs">
            <div className="flex items-center gap-2 flex-wrap">
            {task.project && (
                <span className="font-semibold text-gray-400">{task.project.name}</span>
            )}
            {task.tags?.map(tag => (
                <div key={tag.id} className="flex items-center text-gray-500">
                <TagIcon className="w-3 h-3 mr-1" />
                <span>{tag.name}</span>
                </div>
            ))}
            </div>
            {task.reminderValue && task.reminderUnit && task.dueDate && (
            <div className="flex items-center text-gray-500 flex-shrink-0 ml-2">
                <ClockIcon className="w-3 h-3 mr-1" />
                <span>{task.reminderValue}{task.reminderUnit.charAt(0)} before</span>
            </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default TaskItem;
