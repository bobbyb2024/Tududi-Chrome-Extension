import type { Task, Project, Settings, Tag } from '../types';
import { TaskType } from '../types';

// --- MOCK API IMPLEMENTATION ---

const mockTags: Tag[] = [
  { id: 't1', name: 'urgent' },
  { id: 't2', name: 'quick' },
  { id: 't3', name: 'research' },
];

let mockTasks: Task[] = [
  { id: '1', type: TaskType.TASK, content: 'Finalize quarterly report', dueDate: new Date().toISOString(), reminderValue: 30, reminderUnit: 'minutes', project: { id: 'p1', name: 'Work' }, tags: [mockTags[0]] },
  { id: '2', type: TaskType.TASK, content: 'Buy groceries', dueDate: new Date().toISOString(), reminderValue: 1, reminderUnit: 'hours', project: null, tags: [mockTags[1]] },
  { id: '3', type: TaskType.TASK, content: 'Schedule dentist appointment', dueDate: null, reminderValue: null, reminderUnit: null, project: { id: 'p2', name: 'Personal' }, tags: [] },
  { id: '4', type: TaskType.TASK, content: 'Plan weekend trip', dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(), reminderValue: 1, reminderUnit: 'days', project: { id: 'p2', name: 'Personal' }, tags: [mockTags[2]] },
  { id: '5', type: TaskType.TASK, content: 'Review pull request #123', dueDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString(), reminderValue: null, reminderUnit: null, project: { id: 'p1', name: 'Work' }, tags: [] },
  { id: '6', type: TaskType.NOTE, content: 'Meeting Notes: Q3 Planning\n- Discuss budget allocations\n- Review marketing strategy\n- Set key objectives and deliverables.', dueDate: null, reminderValue: null, reminderUnit: null, project: null, tags: [mockTags[0]] },
  { id: '7', type: TaskType.TASK, content: 'Call mom', dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(), reminderValue: 2, reminderUnit: 'hours', project: { id: 'p2', name: 'Personal' }, tags: [] },
];

let mockProjects: Project[] = [
  { id: 'p1', name: 'Work' },
  { id: 'p2', name: 'Personal' },
  { id: 'p3', name: 'Home Reno' },
];

const simulateNetwork = <T,>(data: T, successRate = 0.95): Promise<T> => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (Math.random() < successRate) {
        resolve(JSON.parse(JSON.stringify(data))); // Deep copy to prevent mutation
      } else {
        reject(new Error('Failed to connect to the TuDuDi server. Please check your settings and connection.'));
      }
    }, 500 + Math.random() * 500);
  });
};

const _fetchMockTasks = (settings: Settings): Promise<Task[]> => {
  console.log('DEV MODE: Fetching MOCK tasks');
  return simulateNetwork(mockTasks);
};

const _fetchMockProjects = (settings: Settings): Promise<Project[]> => {
  console.log('DEV MODE: Fetching MOCK projects');
  return simulateNetwork(mockProjects);
};

const _fetchMockTags = (settings: Settings): Promise<Tag[]> => {
  console.log('DEV MODE: Fetching MOCK tags');
  return simulateNetwork(mockTags);
};

const _addMockItem = (payload: AddItemPayload): Promise<{success: boolean}> => {
    return new Promise((resolve) => {
        setTimeout(() => {
            const newId = String(Date.now());
            if (payload.type === TaskType.TASK || payload.type === TaskType.NOTE) {
                const project = payload.projectId ? mockProjects.find(p => p.id === payload.projectId) : null;
                const newDueDate = payload.dueDate ? new Date(payload.dueDate + 'T00:00:00Z').toISOString() : null;
                const newItem: Task = {
                    id: newId,
                    content: payload.content,
                    type: payload.type,
                    dueDate: newDueDate,
                    reminderValue: payload.reminderValue || null,
                    reminderUnit: payload.reminderUnit || null,
                    project: project ? { id: project.id, name: project.name } : null,
                    tags: []
                };
                mockTasks.push(newItem);
            } else if (payload.type === TaskType.PROJECT) {
                const newProject: Project = { id: newId, name: payload.content };
                mockProjects.push(newProject);
            }
            resolve({ success: true });
        }, 500);
    });
};

const _editMockTask = (taskToUpdate: Task): Promise<Task> => {
    const taskIndex = mockTasks.findIndex(t => t.id === taskToUpdate.id);
    if (taskIndex === -1) {
        return Promise.reject(new Error('Task not found'));
    }
    mockTasks[taskIndex] = taskToUpdate;
    return simulateNetwork(taskToUpdate);
};

const _deleteMockTask = (taskId: string): Promise<{success: boolean}> => {
    const taskIndex = mockTasks.findIndex(t => t.id === taskId);
    if (taskIndex === -1) {
        return Promise.reject(new Error('Task not found'));
    }
    mockTasks.splice(taskIndex, 1);
    return simulateNetwork({ success: true });
};

// --- REAL API IMPLEMENTATION ---
const getApiClient = (settings: Settings) => {
    if (!settings.serverUrl || !settings.username || !settings.password) {
        throw new Error('API client not configured. Please check your settings.');
    }

    let finalUrl = settings.serverUrl;
    try {
        // Replace 'localhost' with '127.0.0.1' to avoid Private Network Access issues.
        const url = new URL(settings.serverUrl);
        if (url.hostname === 'localhost') {
            url.hostname = '127.0.0.1';
            finalUrl = url.toString();
        }
    } catch (e) {
        // Ignore parsing errors, just use the original URL
        console.error("Could not parse server URL, using original:", e);
    }
    
    const baseUrl = finalUrl.replace(/\/$/, '');
    const headers = {
        'Authorization': 'Basic ' + btoa(`${settings.username}:${settings.password}`),
        'Content-Type': 'application/json',
    };

    const handleResponse = async (response: Response) => {
        if (!response.ok) {
            const errorBody = await response.text();
            throw new Error(`HTTP error ${response.status}: ${response.statusText} - ${errorBody}`);
        }
        // Handle cases with no content, like a 204 response from DELETE
        if (response.status === 204) {
            return { success: true };
        }
        return response.json();
    };

    return {
        get: async (endpoint: string) => fetch(`${baseUrl}/api/v1${endpoint}`, { method: 'GET', headers }).then(handleResponse),
        post: async (endpoint: string, body: any) => fetch(`${baseUrl}/api/v1${endpoint}`, { method: 'POST', headers, body: JSON.stringify(body) }).then(handleResponse),
        put: async (endpoint: string, body: any) => fetch(`${baseUrl}/api/v1${endpoint}`, { method: 'PUT', headers, body: JSON.stringify(body) }).then(handleResponse),
        delete: async (endpoint: string) => fetch(`${baseUrl}/api/v1${endpoint}`, { method: 'DELETE', headers }).then(handleResponse),
    };
};

const _fetchRealTasks = (settings: Settings): Promise<Task[]> => getApiClient(settings).get('/tasks');
const _fetchRealProjects = (settings: Settings): Promise<Project[]> => getApiClient(settings).get('/projects');
const _fetchRealTags = (settings: Settings): Promise<Tag[]> => getApiClient(settings).get('/tags');

const _addRealItem = (payload: AddItemPayload, settings: Settings): Promise<{success: boolean}> => {
    // This is a hypothetical API structure. The actual endpoints and payload may differ.
    let endpoint = '';
    let body: any = { content: payload.content };
    switch(payload.type) {
        case TaskType.TASK:
            endpoint = '/tasks';
            body = {
                content: payload.content,
                project_id: payload.projectId,
                due_date: payload.dueDate,
                reminder: payload.reminderValue ? { value: payload.reminderValue, unit: payload.reminderUnit } : null
            };
            break;
        case TaskType.NOTE:
             endpoint = '/notes';
             body = { content: payload.content, project_id: payload.projectId };
             break;
        case TaskType.PROJECT:
            endpoint = '/projects';
            body = { name: payload.content };
            break;
    }
    return getApiClient(settings).post(endpoint, body);
};

const _editRealTask = (task: Task, settings: Settings): Promise<Task> => {
    return getApiClient(settings).put(`/tasks/${task.id}`, task);
};

const _deleteRealTask = (taskId: string, settings: Settings): Promise<{success: boolean}> => {
    return getApiClient(settings).delete(`/tasks/${taskId}`);
};


// --- PUBLIC API EXPORTS (with dev mode switch) ---

interface AddItemPayload {
    content: string;
    type: TaskType;
    projectId?: string;
    dueDate?: string;
    reminderValue?: number;
    reminderUnit?: 'minutes' | 'hours' | 'days';
}

export const fetchTasks = async (settings: Settings): Promise<Task[]> => {
  if (!settings.serverUrl) return Promise.reject(new Error('Server URL not set'));
  if (settings.devModeEnabled) return _fetchMockTasks(settings);
  return _fetchRealTasks(settings);
};

export const fetchProjects = async (settings: Settings): Promise<Project[]> => {
  if (!settings.serverUrl) return Promise.reject(new Error('Server URL not set'));
  if (settings.devModeEnabled) return _fetchMockProjects(settings);
  return _fetchRealProjects(settings);
};

export const fetchTags = async (settings: Settings): Promise<Tag[]> => {
  if (!settings.serverUrl) return Promise.reject(new Error('Server URL not set'));
  if (settings.devModeEnabled) return _fetchMockTags(settings);
  return _fetchRealTags(settings);
};

export const addItem = async (payload: AddItemPayload, settings: Settings): Promise<{success: boolean}> => {
    if (!settings.serverUrl) return Promise.reject(new Error('Server URL not set'));
    console.log(settings.devModeEnabled ? 'DEV MODE: Adding MOCK item:' : 'Adding item:', payload);
    if (settings.devModeEnabled) return _addMockItem(payload);
    return _addRealItem(payload, settings);
};

export const editTask = async (taskToUpdate: Task, settings: Settings): Promise<Task> => {
    if (!settings.serverUrl) return Promise.reject(new Error('Server URL not set'));
    console.log(settings.devModeEnabled ? 'DEV MODE: Updating MOCK task:' : 'Updating task:', taskToUpdate);
    if (settings.devModeEnabled) return _editMockTask(taskToUpdate);
    return _editRealTask(taskToUpdate, settings);
};

export const deleteTask = async (taskId: string, settings: Settings): Promise<{success: boolean}> => {
    if (!settings.serverUrl) return Promise.reject(new Error('Server URL not set'));
    console.log(settings.devModeEnabled ? 'DEV MODE: Deleting MOCK task:' : 'Deleting task:', taskId);
    if (settings.devModeEnabled) return _deleteMockTask(taskId);
    return _deleteRealTask(taskId, settings);
};