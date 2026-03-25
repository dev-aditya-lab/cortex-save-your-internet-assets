import { useState, useEffect, useCallback } from 'react';
import { HiOutlinePlus, HiOutlineTrash, HiOutlineArrowLeft } from 'react-icons/hi';
import { getCollections, createCollection, deleteCollection, getCollection } from '../api';
import ItemCard from '../components/ItemCard';
import ItemDetail from '../components/ItemDetail';

export default function Collections() {
  const [collections, setCollections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [activeCollection, setActiveCollection] = useState(null);
  const [activeItems, setActiveItems] = useState([]);
  const [selectedId, setSelectedId] = useState(null);

  const colors = ['#2563eb', '#dc2626', '#16a34a', '#d97706', '#7c3aed', '#0891b2'];

  const loadCollections = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getCollections();
      setCollections(data);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadCollections(); }, [loadCollections]);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    const color = colors[Math.floor(Math.random() * colors.length)];
    await createCollection({ name: newName, description: newDesc, color });
    setNewName('');
    setNewDesc('');
    setShowCreate(false);
    loadCollections();
  };

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    const confirmed = window.confirm('Are you sure you want to delete this collection?');
    if (!confirmed) return;
    try {
      await deleteCollection(id);
      loadCollections();
    } catch (err) {
      console.error('Delete collection failed:', err);
      alert('Failed to delete collection.');
    }
  };

  const openCollection = async (col) => {
    setActiveCollection(col);
    try {
      const data = await getCollection(col._id);
      setActiveItems(data.items || []);
    } catch (err) {
      console.error(err);
    }
  };

  // Collection detail view
  if (activeCollection) {
    return (
      <div className="page-container">
        <div className="page-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button className="btn btn-ghost" onClick={() => setActiveCollection(null)}>
              <HiOutlineArrowLeft size={18} />
            </button>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className="collection-color-dot" style={{ background: activeCollection.color }}></span>
                <h1>{activeCollection.name}</h1>
              </div>
              {activeCollection.description && (
                <p style={{ fontSize: '0.8125rem', color: '#646b75', marginTop: 4 }}>{activeCollection.description}</p>
              )}
            </div>
          </div>
        </div>

        {activeItems.length === 0 ? (
          <div className="empty-state">
            <p>No items in this collection yet. Add items from the dashboard.</p>
          </div>
        ) : (
          <div className="items-grid">
            {activeItems.map(item => (
              <ItemCard key={item._id} item={item} onClick={() => setSelectedId(item._id)} />
            ))}
          </div>
        )}

        {selectedId && (
          <ItemDetail
            itemId={selectedId}
            onClose={() => setSelectedId(null)}
            onDeleted={() => openCollection(activeCollection)}
          />
        )}
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1>Collections</h1>
          <p style={{ fontSize: '0.8125rem', color: '#646b75', marginTop: 4 }}>
            Organize your saved items into groups
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
          <HiOutlinePlus size={16} /> New Collection
        </button>
      </div>

      {/* Create Form */}
      {showCreate && (
        <div style={{ background: '#f8f9fa', border: '1px solid #e2e5e9', borderRadius: 8, padding: 16, marginBottom: 20 }}>
          <div className="form-group">
            <label className="form-label">Name</label>
            <input className="input" placeholder="Collection name" value={newName} onChange={e => setNewName(e.target.value)} autoFocus />
          </div>
          <div className="form-group">
            <label className="form-label">Description (optional)</label>
            <input className="input" placeholder="Brief description" value={newDesc} onChange={e => setNewDesc(e.target.value)} />
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-primary btn-sm" onClick={handleCreate}>Create</button>
            <button className="btn btn-secondary btn-sm" onClick={() => setShowCreate(false)}>Cancel</button>
          </div>
        </div>
      )}

      {/* Collections Grid */}
      {loading ? (
        <div className="loading-center"><div className="spinner"></div></div>
      ) : collections.length === 0 ? (
        <div className="empty-state">
          <p>No collections yet. Create one to organize your saved items.</p>
        </div>
      ) : (
        <div className="collections-grid">
          {collections.map(col => (
            <div key={col._id} className="card collection-card" onClick={() => openCollection(col)}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <span className="collection-color-dot" style={{ background: col.color }}></span>
                  <h3>{col.name}</h3>
                </div>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={(e) => handleDelete(col._id, e)}
                  style={{ color: '#dc2626' }}
                >
                  <HiOutlineTrash size={14} />
                </button>
              </div>
              {col.description && (
                <p style={{ fontSize: '0.75rem', color: '#646b75', marginTop: 6 }}>{col.description}</p>
              )}
              <div className="collection-card-count">{col.itemCount || 0} items</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
