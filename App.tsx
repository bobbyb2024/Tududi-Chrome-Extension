import React, { useState, useCallback, useEffect } from 'react';
import { useTuDuDi } from './hooks/useTuDuDi';
import MainView from './components/MainView';
import SettingsView from './components/SettingsView';
import Header from './components/Header';
import AddTaskModal from './components/AddTaskModal';
import EditTaskModal from './components/EditTaskModal';
import ConfirmDeleteModal from './components/ConfirmDeleteModal';
import RescheduleModal from './components/RescheduleModal';
import { AddIcon, CalendarDaysIcon } from './components/Icons';
import type { View, Task, ReschedulePayload } from './types';
import { TaskType } from './types';
import { setupLogging } from './utils/logging';

// FIX: Added type declarations for the chrome extension API to resolve TS errors.
declare namespace chrome {
  namespace scripting {
    function executeScript(options: any): Promise<any[]>;
  }
  namespace tabs {
    function query(queryInfo: any): Promise<any[]>;
  }
}

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<View>('main');
  const [addModalState, setAddModalState] = useState<{isOpen: boolean, initialContent: string}>({
    isOpen: false,
    initialContent: ''
  });
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set());
  const [isRescheduleModalOpen, setIsRescheduleModalOpen] = useState(false);
  const tududi = useTuDuDi();

  useEffect(() => {
    // Default to true if the setting is not explicitly false
    setupLogging(tududi.settings.consoleLoggingEnabled !== false);
  }, [tududi.settings.consoleLoggingEnabled]);

  const handleAddTask = useCallback(async (content: string, type: TaskType, projectId?: string, dueDate?: string, reminderValue?: number, reminderUnit?: 'minutes' | 'hours' | 'days') => {
    await tududi.addItem(content, type, projectId, dueDate, reminderValue, reminderUnit);
    setAddModalState({ isOpen: false, initialContent: '' });
  }, [tududi]);

  const handleUpdateTask = useCallback(async (task: Task) => {
    await tududi.editTask(task);
    setEditingTask(null);
  }, [tududi]);

  const handleConfirmDelete = useCallback(async () => {
    if (!taskToDelete) return;
    setIsDeleting(true);
    await tududi.deleteTask(taskToDelete.id);
    setIsDeleting(false);
    setTaskToDelete(null);
  }, [tududi, taskToDelete]);
  
  const handleOpenAddModal = async () => {
    let selectedText = '';
    try {
      if (chrome.tabs && chrome.scripting) {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab?.id) {
          const results = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: () => window.getSelection()?.toString(),
          });
          if (results?.[0]?.result) {
            selectedText = results[0].result;
          }
        }
      }
    } catch (e) {
      console.error("Could not get selected text:", e);
    }
    setAddModalState({ isOpen: true, initialContent: selectedText });
  };
  
  const handleCloseAddModal = () => {
    setAddModalState({ isOpen: false, initialContent: '' });
  };
  
  const handleToggleSelection = useCallback((taskId: string) => {
    setSelectedTaskIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(taskId)) {
        newSet.delete(taskId);
      } else {
        newSet.add(taskId);
      }
      return newSet;
    });
  }, []);

  const handleClearSelection = useCallback(() => {
    setSelectedTaskIds(new Set());
  }, []);
  
  const handleReschedule = useCallback(async (payload: ReschedulePayload) => {
    await tududi.rescheduleTasks(Array.from(selectedTaskIds), payload);
    setIsRescheduleModalOpen(false);
    setSelectedTaskIds(new Set());
  }, [tududi, selectedTaskIds]);

  useEffect(() => {
    // Clear selection when view changes or a modal opens to prevent conflicts
    if (currentView !== 'main' || addModalState.isOpen || editingTask || taskToDelete) {
        setSelectedTaskIds(new Set());
    }
  }, [currentView, addModalState.isOpen, editingTask, taskToDelete]);


  const renderView = () => {
    if (!tududi.settings.serverUrl) {
      return <SettingsView tududi={tududi} setView={setCurrentView} />;
    }
    switch (currentView) {
      case 'settings':
        return <SettingsView tududi={tududi} setView={setCurrentView} />;
      case 'main':
      default:
        return (
            <MainView 
                tududi={tududi} 
                onEditTask={setEditingTask} 
                onDeleteTask={setTaskToDelete}
                selectedTaskIds={selectedTaskIds}
                onToggleSelection={handleToggleSelection}
            />
        );
    }
  };

  return (
    <div className="flex flex-col h-full font-sans antialiased">
      <Header currentView={currentView} setView={setCurrentView} serverUrlSet={!!tududi.settings.serverUrl} />
      <main className="flex-grow overflow-y-auto bg-gray-900 p-4">
        {renderView()}
      </main>

      {currentView === 'main' && tududi.settings.serverUrl && (
         <>
          {selectedTaskIds.size === 0 ? (
            <button
              onClick={handleOpenAddModal}
              className="absolute bottom-6 right-6 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full p-4 shadow-lg transition-transform transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-indigo-500"
              aria-label="Add Task"
            >
              <AddIcon className="w-6 h-6" />
            </button>
          ) : (
            <div className="absolute bottom-0 left-0 right-0 bg-gray-800/90 backdrop-blur-sm p-3 border-t border-gray-700 flex justify-between items-center animate-fade-in-up shadow-lg">
                <span className="text-sm font-medium text-gray-300">{selectedTaskIds.size} selected</span>
                <div className="flex items-center gap-2">
                    <button onClick={handleClearSelection} className="px-3 py-1 text-xs text-gray-400 hover:text-white hover:bg-gray-700 rounded-md transition-colors">Clear</button>
                    <button
                      onClick={() => setIsRescheduleModalOpen(true)}
                      className="flex items-center gap-2 px-3 py-1.5 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-md transition-colors"
                    >
                      <CalendarDaysIcon className="w-4 h-4" />
                      <span>Reschedule</span>
                    </button>
                </div>
            </div>
          )}
        </>
      )}

      {addModalState.isOpen && (
        <AddTaskModal
          onClose={handleCloseAddModal}
          onAddTask={handleAddTask}
          projects={tududi.projects}
          initialContent={addModalState.initialContent}
        />
      )}

      {editingTask && (
        <EditTaskModal
          task={editingTask}
          onClose={() => setEditingTask(null)}
          onSave={handleUpdateTask}
          projects={tududi.projects}
        />
      )}

      {taskToDelete && (
        <ConfirmDeleteModal
          task={taskToDelete}
          onClose={() => setTaskToDelete(null)}
          onConfirm={handleConfirmDelete}
          isDeleting={isDeleting}
        />
      )}

      {isRescheduleModalOpen && (
        <RescheduleModal
            onClose={() => setIsRescheduleModalOpen(false)}
            onReschedule={handleReschedule}
            taskCount={selectedTaskIds.size}
        />
      )}
    </div>
  );
};

export default App;