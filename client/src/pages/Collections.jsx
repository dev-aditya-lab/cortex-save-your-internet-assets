import { useState, useEffect } from 'react';
import { getCollections, createCollection, deleteCollection, getCollection } from '../api';
import ItemCard from '../components/ItemCard';
import ItemDetail from '../components/ItemDetail';
import { HiPlus, HiOutlineTrash } from 'react-icons/hi';

export default function Collections() {
  const [collections, setCollections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCol, setSelectedCol] = useState(null);
  const [colItems, setColItems] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');

  const loadCollections = async () => {
    setLoading(true);
    try { setCollections(await getCollections()); } catch { }
    setLoading(false);
  };

  useEffect(() => { loadCollections(); }, []);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    try {
      await createCollection({ name: newName });
      setNewName('');
      setShowCreate(false);
      loadCollections();
    } catch { }
  };

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm('Delete this collection?')) return;
    try { await deleteCollection(id); loadCollections(); } catch { }
  };

  const openCollection = async (col) => {
    setSelectedCol(col);
    try {
      const data = await getCollection(col._id);
      setColItems(data.items || []);
    } catch { setColItems([]); }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Collections</h1>
          <p className="page-subtitle">{collections.length} collection{collections.length !== 1 ? 's' : ''}</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
          <HiPlus size={14} /> New
        </button>
      </div>

      {showCreate && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
          <input className="input" placeholder="Collection name" value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleCreate()}
            autoFocus />
          <button className="btn btn-primary" onClick={handleCreate}>Create</button>
          <button className="btn btn-secondary" onClick={() => { setShowCreate(false); setNewName(''); }}>Cancel</button>
        </div>
      )}

      {selectedCol ? (
        <div>
          <button className="btn btn-ghost" onClick={() => { setSelectedCol(null); setColItems([]); }}
            style={{ marginBottom: 16, fontSize: '0.8125rem' }}>
            ← Back to collections
          </button>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: 16 }}>
            <span className="collection-color-dot" style={{ background: selectedCol.color }}></span>
            {selectedCol.name}
          </h2>
          {colItems.length === 0 ? (
            <div className="empty-state"><p>No items in this collection</p></div>
          ) : (
            <div className="items-grid">
              {colItems.map(item => <ItemCard key={item._id} item={item} onClick={setSelectedItem} />)}
            </div>
          )}
        </div>
      ) : loading ? (
        <div className="loading-center"><div className="spinner"></div></div>
      ) : collections.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📁</div>
          <p>No collections yet</p>
          <p className="hint">Collections are auto-created when similar items are saved</p>
        </div>
      ) : (
        <div className="collections-grid">
          {collections.map(col => (
            <div key={col._id} className="collection-card" onClick={() => openCollection(col)}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontWeight: 500, fontSize: '0.875rem' }}>
                    <span className="collection-color-dot" style={{ background: col.color }}></span>
                    {col.name}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#8b919e', marginTop: 3 }}>
                    {col.itemCount || 0} item{(col.itemCount || 0) !== 1 ? 's' : ''}
                  </div>
                </div>
                <button className="btn btn-ghost btn-sm" onClick={(e) => handleDelete(col._id, e)} style={{ color: '#e5484d' }}>
                  <HiOutlineTrash size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedItem && (
        <ItemDetail item={selectedItem} onClose={() => setSelectedItem(null)}
          onDeleted={() => { setSelectedItem(null); if (selectedCol) openCollection(selectedCol); }} />
      )}
    </div>
  );
}
