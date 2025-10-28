import React, { useState, useEffect } from 'react';
import type { Project } from '../types';
import { TaskType } from '../types';
import { CloseIcon, LinkIcon, CameraIcon, DocumentDuplicateIcon } from './Icons';


// FIX: Added type declarations for the chrome extension API to resolve TS errors.
declare namespace chrome {
  namespace scripting {
    function executeScript(options: any): Promise<any[]>;
  }
  namespace tabs {
    function query(queryInfo: any): Promise<any[]>;
    function captureVisibleTab(windowId?: number, options?: any): Promise<string>;
  }
}

interface AddTaskModalProps {
  onClose: () => void;
  onAddTask: (content: string, type: TaskType, projectId?: string, dueDate?: string, reminderValue?: number, reminderUnit?: 'minutes' | 'hours' | 'days') => Promise<void>;
  projects: Project[];
  initialContent?: string;
}

const AddTaskModal: React.FC<AddTaskModalProps> = ({ onClose, onAddTask, projects, initialContent = '' }) => {
  const [content, setContent] = useState(initialContent);
  const [taskType, setTaskType] = useState<TaskType>(TaskType.TASK);
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [dueDate, setDueDate] = useState('');
  const [reminderValue, setReminderValue] = useState<string>('');
  const [reminderUnit, setReminderUnit] = useState<'minutes' | 'hours' | 'days'>('minutes');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [includeUrl, setIncludeUrl] = useState(false);
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [currentTabUrl, setCurrentTabUrl] = useState('');

  useEffect(() => {
    if (chrome.tabs) {
      chrome.tabs.query({ active: true, currentWindow: true }).then(([tab]) => {
        if (tab?.url) {
          setCurrentTabUrl(tab.url);
        }
      });
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() && !screenshot) return;
    setIsSubmitting(true);
    
    let finalContent = content;

    if (includeUrl && currentTabUrl) {
      finalContent += `\n\n[Source URL](${currentTabUrl})`;
    }

    if (screenshot) {
      finalContent += `\n\n![Screenshot](data:image/jpeg;base64,${screenshot.split(',')[1]})`;
    }
    
    const reminderNumber = reminderValue ? parseInt(reminderValue, 10) : undefined;
    
    await onAddTask(finalContent, taskType, selectedProject || undefined, dueDate || undefined, reminderNumber, reminderNumber ? reminderUnit : undefined);
    setIsSubmitting(false);
  };
  
  const handleCaptureVisible = async () => {
    if (!chrome.tabs) return;
    const dataUrl = await chrome.tabs.captureVisibleTab(undefined, { format: 'jpeg', quality: 90 });
    setScreenshot(dataUrl);
  };
  
  const captureFullPage = async () => {
    setIsCapturing(true);
    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab || !tab.id) throw new Error("No active tab found");

        // Get page dimensions
        const [pageDetails] = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: () => ({
                totalHeight: document.body.scrollHeight,
                windowHeight: window.innerHeight,
                pageWidth: document.documentElement.clientWidth,
            }),
        });

        const { totalHeight, windowHeight, pageWidth } = pageDetails.result;
        
        await chrome.scripting.executeScript({ target: { tabId: tab.id }, func: () => window.scrollTo(0, 0) });
        await new Promise(r => setTimeout(r, 200)); // wait for scroll

        const captures = [];
        for (let y = 0; y < totalHeight; y += windowHeight) {
            const dataUrl = await chrome.tabs.captureVisibleTab(tab.windowId, { format: 'jpeg', quality: 90 });
            captures.push(dataUrl);
            await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                func: (wh) => window.scrollBy(0, wh),
                args: [windowHeight],
            });
            await new Promise(r => setTimeout(r, 200)); // wait for scroll and render
        }

        // Stitch images
        const canvas = document.createElement('canvas');
        canvas.width = pageWidth;
        canvas.height = totalHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error("Could not create canvas context");

        let currentY = 0;
        for (const dataUrl of captures) {
            const image = await new Promise<HTMLImageElement>(resolve => {
                const img = new Image();
                img.onload = () => resolve(img);
                img.src = dataUrl;
            });
            ctx.drawImage(image, 0, currentY);
            currentY += image.height;
        }

        setScreenshot(canvas.toDataURL('image/jpeg'));
    } catch (error) {
        console.error("Failed to capture full page:", error);
    } finally {
        setIsCapturing(false);
        // Reset scroll
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if(tab?.id) await chrome.scripting.executeScript({ target: { tabId: tab.id }, func: () => window.scrollTo(0, 0) });
        } catch {}
    }
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
        <h2 className="text-lg font-bold text-white mb-4">Add New Item</h2>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={
                taskType === TaskType.PROJECT ? "New project name..." : 
                taskType === TaskType.NOTE ? "Your new note..." : "e.g., Book dentist appointment"
              }
              className="w-full bg-gray-700 text-white rounded-md p-2 border border-gray-600 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              rows={3}
              autoFocus
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-400 mb-2">Attachments</label>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => setIncludeUrl(p => !p)} className={`flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-md transition-colors ${includeUrl ? 'bg-indigo-600 text-white' : 'bg-gray-700 hover:bg-gray-600 text-gray-300'}`}>
                <LinkIcon className="w-4 h-4" />
                <span>{includeUrl ? 'URL Attached' : 'Attach URL'}</span>
              </button>
              <button type="button" onClick={handleCaptureVisible} className="flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-md bg-gray-700 hover:bg-gray-600 text-gray-300 transition-colors">
                <CameraIcon className="w-4 h-4" />
                <span>Capture Visible</span>
              </button>
              <button type="button" onClick={captureFullPage} disabled={isCapturing} className="flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-md bg-gray-700 hover:bg-gray-600 text-gray-300 transition-colors disabled:opacity-50 disabled:cursor-wait">
                <DocumentDuplicateIcon className="w-4 h-4" />
                <span>{isCapturing ? 'Capturing...' : 'Capture Full Page'}</span>
              </button>
            </div>
            {screenshot && (
              <div className="mt-4 relative">
                <img src={screenshot} alt="Screenshot preview" className="max-w-full max-h-24 h-auto rounded-md border-2 border-indigo-500" />
                <button onClick={() => setScreenshot(null)} className="absolute -top-2 -right-2 p-1 bg-gray-700 rounded-full text-white hover:bg-red-600 transition-colors" aria-label="Remove screenshot">
                  <CloseIcon className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <select
              value={taskType}
              onChange={(e) => setTaskType(e.target.value as TaskType)}
              className="bg-gray-700 text-white rounded-md p-2 border border-gray-600 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value={TaskType.TASK}>Task</option>
              <option value={TaskType.NOTE}>Note</option>
              <option value={TaskType.PROJECT}>Project</option>
            </select>
          </div>

          {taskType === TaskType.TASK && (
             <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                <select
                    value={selectedProject}
                    onChange={(e) => setSelectedProject(e.target.value)}
                    className="bg-gray-700 text-white rounded-md p-2 border border-gray-600 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                    <option value="">Inbox</option>
                    {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
                <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="bg-gray-700 text-white rounded-md p-2 border border-gray-600 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    aria-label="Due date"
                />
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
            </>
          )}

          <button
            type="submit"
            disabled={isSubmitting || (!content.trim() && !screenshot)}
            className="w-full bg-indigo-600 text-white rounded-md py-2 font-semibold hover:bg-indigo-700 disabled:bg-gray-500 disabled:cursor-not-allowed transition-colors"
          >
            {isSubmitting ? 'Adding...' : `Add ${taskType.charAt(0).toUpperCase() + taskType.slice(1)}`}
          </button>
        </form>
      </div>
    </div>
  );
};

export default AddTaskModal;