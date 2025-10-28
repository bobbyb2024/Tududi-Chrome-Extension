import React, { useState } from 'react';
import TaskItem from './TaskItem';
import { InboxIcon, TodayIcon, UpcomingIcon, SearchIcon } from './Icons';
import type { useTuDuDi } from '../hooks/useTuDuDi';
import type { Task } from '../types';

interface MainViewProps {
  tududi: ReturnType<typeof useTuDuDi>;
  onEditTask: (task: Task) => void;
  onDeleteTask: (task: Task) => void;
  selectedTaskIds: Set<string>;
  onToggleSelection: (taskId: string) => void;
}

const MainView: React.FC<MainViewProps> = ({ tududi, onEditTask, onDeleteTask, selectedTaskIds, onToggleSelection }) => {
  const { inboxTasks, todayTasks, upcomingTasks, loading, error, settings } = tududi;
  const [searchQuery, setSearchQuery] = useState('');

  if (loading) {
    return (
      <div className="flex justify-center items-center h-full">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center text-red-400 bg-red-900/50 p-4 rounded-lg">
        <p className="font-bold">An error occurred:</p>
        <p>{error}</p>
      </div>
    );
  }
  
  const lowercasedQuery = searchQuery.toLowerCase();
  const filteredInbox = inboxTasks.filter(t => t.content.toLowerCase().includes(lowercasedQuery));
  const filteredToday = todayTasks.filter(t => t.content.toLowerCase().includes(lowercasedQuery));
  const filteredUpcoming = upcomingTasks.filter(t => t.content.toLowerCase().includes(lowercasedQuery));

  const sortTasksByDueDate = (a: Task, b: Task): number => {
    if (a.dueDate && !b.dueDate) return -1;
    if (!a.dueDate && b.dueDate) return 1;
    if (!a.dueDate && !b.dueDate) return 0;
    
    // We can assert non-null because of the checks above
    return new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime();
  };

  const sortedTodayTasks = [...filteredToday].sort(sortTasksByDueDate);
  const sortedUpcomingTasks = [...filteredUpcoming].sort(sortTasksByDueDate);


  // FIX: Replaced any[] with Task[] for improved type safety.
  const renderTaskList = (title: string, tasks: Task[], icon: React.ReactNode) => (
    <div className="mb-6">
      <h2 className="text-xl font-semibold mb-3 text-gray-300 flex items-center">
        {icon}
        <span className="ml-2">{title}</span>
      </h2>
      <div className="space-y-2">
        {tasks.length > 0 ? (
          tasks.map(task => 
            <TaskItem 
                key={task.id} 
                task={task} 
                serverUrl={settings.serverUrl!} 
                onEdit={onEditTask} 
                onDelete={onDeleteTask}
                isSelected={selectedTaskIds.has(task.id)}
                onToggleSelection={onToggleSelection}
            />
          )
        ) : (
          <p className="text-gray-500 italic px-2">
            {searchQuery ? 'No matching tasks found.' : 'No tasks here. Enjoy the quiet!'}
          </p>
        )}
      </div>
    </div>
  );

  return (
    <div className="animate-fade-in pb-16">
       <div className="relative mb-6">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3">
            <SearchIcon className="w-5 h-5 text-gray-500" />
          </span>
          <input
            type="text"
            placeholder="Search tasks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-gray-800 border border-gray-600 rounded-md shadow-sm py-2 pl-10 pr-4 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>

      {renderTaskList('Inbox', filteredInbox, <InboxIcon className="w-6 h-6 text-indigo-400" />)}
      {renderTaskList('Today', sortedTodayTasks, <TodayIcon className="w-6 h-6 text-green-400" />)}
      {renderTaskList('Upcoming', sortedUpcomingTasks, <UpcomingIcon className="w-6 h-6 text-amber-400" />)}
    </div>
  );
};

export default MainView;
