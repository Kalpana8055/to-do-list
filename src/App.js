import React, { useState, useEffect } from 'react';
import { getTasks, addTask, deleteTask, updateTask, clearTasksCache, searchTasks } from './api'; // Import searchTasks
import TaskItem from './taskitem';

function App() {
    const [tasks, setTasks] = useState([]);
    const [newTaskTitle, setNewTaskTitle] = useState('');
    const [newTaskDescription, setNewTaskDescription] = useState('');
    const [newTaskStatus, setNewTaskStatus] = useState('todo');
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(true);

    const [searchQuery, setSearchQuery] = useState(''); // New state for search query
    const [searchResults, setSearchResults] = useState([]); // New state for search results
    const [searching, setSearching] = useState(false); // New state for search loading

    useEffect(() => {
        fetchTasks();
    }, []);

    const fetchTasks = async (forceRefresh = false) => {
        try {
            setLoading(true);
            const data = await getTasks(forceRefresh);
            setTasks(data);
            setError(null);
        } catch (err) {
            setError('Failed to fetch tasks. Please try again later.');
            console.error("Error in fetchTasks:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleAddTask = async (e) => {
        e.preventDefault();
        if (!newTaskTitle || !newTaskDescription) {
            setError('Please fill in both title and description for the new task.');
            return;
        }
        const newTask = {
            title: newTaskTitle,
            description: newTaskDescription,
            status: newTaskStatus,
        };
        try {
            const addedTask = await addTask(newTask);
            setTasks([...tasks, addedTask]);
            setNewTaskTitle('');
            setNewTaskDescription('');
            setNewTaskStatus('todo');
            setError(null);
        } catch (err) {
            setError('Failed to add task. Please check your input and try again.');
            console.error("Error in handleAddTask:", err);
        }
    };

    const handleDeleteTask = async (id) => {
        try {
            await deleteTask(id);
            setTasks(tasks.filter((task) => task.id !== id));
            setError(null);
        } catch (err) {
            setError('Failed to delete task. It might no longer exist.');
            console.error("Error in handleDeleteTask:", err);
        }
    };

    const handleUpdateTask = async (id, updates) => {
        try {
            const updatedTask = await updateTask(id, updates);
            setTasks(tasks.map((task) => (task.id === id ? updatedTask : task)));
            setError(null);
        } catch (err) {
            setError('Failed to update task. Please try again.');
            console.error("Error in handleUpdateTask:", err);
        }
    };

    const handleClearCacheAndRefresh = () => {
        clearTasksCache();
        fetchTasks(true);
    };

    // New search handler
    const handleSearch = async (e) => {
        e.preventDefault();
        if (!searchQuery.trim()) {
            setSearchResults([]);
            return;
        }
        try {
            setSearching(true);
            setError(null);
            const results = await searchTasks(searchQuery);
            setSearchResults(results);
        } catch (err) {
            setError('Failed to perform search. Please try again.');
            setSearchResults([]);
            console.error("Error in handleSearch:", err);
        } finally {
            setSearching(false);
        }
    };

    if (loading) return <div>Loading tasks...</div>;

    return (
        <div style={{ fontFamily: 'Arial, sans-serif', padding: '20px' }}>
            <h1>Task Management App</h1>

            {error && <div style={{ color: 'red', marginBottom: '15px' }}>{error}</div>}

            <form onSubmit={handleAddTask} style={{ marginBottom: '30px', border: '1px solid #eee', padding: '20px', borderRadius: '8px' }}>
                <h2>Add New Task</h2>
                <div style={{ marginBottom: '10px' }}>
                    <label htmlFor="title" style={{ display: 'block', marginBottom: '5px' }}>Title:</label>
                    <input
                        type="text"
                        id="title"
                        value={newTaskTitle}
                        onChange={(e) => setNewTaskTitle(e.target.value)}
                        placeholder="Task title"
                        style={{ width: 'calc(100% - 20px)', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
                    />
                </div>
                <div style={{ marginBottom: '10px' }}>
                    <label htmlFor="description" style={{ display: 'block', marginBottom: '5px' }}>Description:</label>
                    <textarea
                        id="description"
                        value={newTaskDescription}
                        onChange={(e) => setNewTaskDescription(e.target.value)}
                        placeholder="Task description (used for similarity search)"
                        rows="3"
                        style={{ width: 'calc(100% - 20px)', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
                    ></textarea>
                </div>
                <div style={{ marginBottom: '10px' }}>
                    <label htmlFor="status" style={{ display: 'block', marginBottom: '5px' }}>Status:</label>
                    <select
                        id="status"
                        value={newTaskStatus}
                        onChange={(e) => setNewTaskStatus(e.target.value)}
                        style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
                    >
                        <option value="todo">Todo</option>
                        <option value="in progress">In Progress</option>
                        <option value="done">Done</option>
                    </select>
                </div>
                <button type="submit" style={{ padding: '10px 15px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>Add Task</button>
            </form>

            <div style={{ marginBottom: '20px' }}>
                <button
                    onClick={() => fetchTasks(true)}
                    style={{ padding: '8px 12px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', marginRight: '10px' }}
                >
                    Refresh Tasks (Bypass Cache)
                </button>
                <button
                    onClick={handleClearCacheAndRefresh}
                    style={{ padding: '8px 12px', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}
                >
                    Clear Cache & Refresh
                </button>
            </div>

            {/* Vector Search Section */}
            <form onSubmit={handleSearch} style={{ marginBottom: '30px', border: '1px solid #eee', padding: '20px', borderRadius: '8px' }}>
                <h2>Search Similar Tasks</h2>
                <div style={{ marginBottom: '10px' }}>
                    <label htmlFor="searchQuery" style={{ display: 'block', marginBottom: '5px' }}>Search Query:</label>
                    <input
                        type="text"
                        id="searchQuery"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="e.g., 'buy groceries' or 'meeting follow-up'"
                        style={{ width: 'calc(100% - 20px)', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
                    />
                </div>
                <button type="submit" style={{ padding: '10px 15px', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>
                    {searching ? 'Searching...' : 'Search'}
                </button>
            </form>

            {searchResults.length > 0 && (
                <div style={{ marginBottom: '30px' }}>
                    <h3>Search Results (Top 3 Similar Tasks)</h3>
                    {searchResults.map((task) => (
                        <div key={task.id} style={{ border: '1px dashed #007bff', padding: '10px', margin: '10px 0', borderRadius: '5px', backgroundColor: '#e7f3ff' }}>
                            <h4>{task.title}</h4>
                            <p>{task.description}</p>
                            <p>Status: {task.status}</p>
                            <p style={{ fontSize: '0.8em', color: '#555' }}>Similarity Distance: {task.distance.toFixed(4)}</p>
                        </div>
                    ))}
                </div>
            )}
            {searchResults.length === 0 && searchQuery.trim() !== '' && !searching && (
                <p style={{ marginBottom: '30px' }}>No similar tasks found for "{searchQuery}".</p>
            )}


            <h2>Current Tasks</h2>
            {tasks.length === 0 ? (
                <p>No tasks available. Add a new task!</p>
            ) : (
                <div className="task-list">
                    {tasks.map((task) => (
                        <TaskItem key={task.id} task={task} onDelete={handleDeleteTask} onUpdate={handleUpdateTask} />
                    ))}
                </div>
            )}
        </div>
    );
}

export default App;