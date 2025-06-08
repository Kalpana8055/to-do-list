// ... (previous code for API_BASE_URL, CACHE_KEY, get/save functions) ...

// Add this function
export const searchTasks = async (query) => {
    try {
        const response = await fetch(`${API_BASE_URL}/tasks/search?q=${encodeURIComponent(query)}`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error("Error searching tasks:", error);
        throw error;
    }
};

// ... (rest of the existing API functions: getTasks, addTask, deleteTask, updateTask, clearTasksCache) ...