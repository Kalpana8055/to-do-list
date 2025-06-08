import React from 'react';

const TaskItem = ({ task, onDelete, onUpdate }) => {
    const handleStatusChange = (e) => {
        onUpdate(task.id, { status: e.target.value });
    };

    return (
        <div style={{ border: '1px solid #ccc', padding: '10px', margin: '10px 0', borderRadius: '5px' }}>
            <h3>{task.title}</h3>
            <p>{task.description}</p>
            <p>
                Status:
                <select value={task.status} onChange={handleStatusChange}>
                    <option value="todo">Todo</option>
                    <option value="in progress">In Progress</option>
                    <option value="done">Done</option>
                </select>
            </p>
            <button onClick={() => onDelete(task.id)}>Delete</button>
        </div>
    );
};

export default TaskItem;