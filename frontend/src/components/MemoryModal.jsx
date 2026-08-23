import React, { useState } from 'react';
import { X, Trash2, Plus, Search, Database, Tag } from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';

export default function MemoryModal({ isOpen, onClose, memories, onRefresh }) {
  const [search, setSearch] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newCategory, setNewCategory] = useState('preference');
  const [adding, setAdding] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  if (!isOpen) return null;

  const filteredMemories = memories.filter((m) =>
    m.content.toLowerCase().includes(search.toLowerCase()) ||
    m.category.toLowerCase().includes(search.toLowerCase())
  );

  const handleAddMemory = async (e) => {
    e.preventDefault();
    if (!newContent.trim()) return;
    setAdding(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/memory`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: newContent.trim(),
          category: newCategory,
          importance: 3
        })
      });
      if (res.ok) {
        setNewContent('');
        onRefresh();
      }
    } catch (err) {
      console.error('Failed to add memory:', err);
    } finally {
      setAdding(false);
    }
  };

  const handleDeleteMemory = async (id) => {
    setDeletingId(id);
    try {
      const res = await fetch(`${API_BASE_URL}/api/memory/${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        onRefresh();
      }
    } catch (err) {
      console.error('Failed to delete memory:', err);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">
            <Database size={18} className="text-cyan" />
            <h3>Personal Memory Store ({memories.length})</h3>
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Add Memory Form */}
        <form className="memory-add-form" onSubmit={handleAddMemory}>
          <input
            type="text"
            className="memory-add-input"
            value={newContent}
            onChange={(e) => setNewContent(e.target.value)}
            placeholder="Add a new explicit memory..."
          />
          <select
            className="memory-add-select"
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
          >
            <option value="preference">Preference</option>
            <option value="profile">Profile</option>
            <option value="fact">Fact</option>
            <option value="goal">Goal</option>
          </select>
          <button type="submit" className="memory-add-btn" disabled={!newContent.trim() || adding}>
            <Plus size={16} />
            <span>Add</span>
          </button>
        </form>

        {/* Search Bar */}
        <div className="memory-search-wrapper">
          <Search size={14} className="search-icon" />
          <input
            type="text"
            className="memory-search-input"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search memories..."
          />
        </div>

        {/* Memories List */}
        <div className="memory-list-container">
          {filteredMemories.length === 0 ? (
            <div className="memory-empty-state">
              <p>{search ? 'No matching memories found.' : 'No memories stored yet. Tell SecondSelf "Remember that..." in chat or add one above.'}</p>
            </div>
          ) : (
            filteredMemories.map((mem) => (
              <div key={mem.id} className="memory-item-card">
                <div className="memory-item-content">
                  <div className="memory-item-badge">
                    <Tag size={10} />
                    <span>{mem.category}</span>
                  </div>
                  <p className="memory-item-text">{mem.content}</p>
                </div>
                <button
                  className="memory-delete-btn"
                  onClick={() => handleDeleteMemory(mem.id)}
                  disabled={deletingId === mem.id}
                  title="Delete Memory"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
