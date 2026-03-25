import { useState, useEffect, useCallback } from 'react';
import { HiOutlinePlus, HiOutlineRefresh } from 'react-icons/hi';
import { getItems, getResurfaced } from '../api';
import ItemCard from '../components/ItemCard';
import ItemDetail from '../components/ItemDetail';
import SaveModal from '../components/SaveModal';

export default function Dashboard() {
  const [items, setItems] = useState([]);
  const [resurfaced, setResurfaced] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showSave, setShowSave] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [filter, setFilter] = useState('all');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (filter !== 'all') params.type = filter;
      const [itemsData, resurfacedData] = await Promise.all([
        getItems(params),
        getResurfaced().catch(() => [])
      ]);
      setItems(itemsData);
      setResurfaced(resurfacedData);
    } catch (err) {
      console.error('Failed to load data:', err);
    }
    setLoading(false);
  }, [filter]);

  useEffect(() => { loadData(); }, [loadData]);

  const typeFilters = ['all', 'article', 'youtube', 'tweet', 'image', 'pdf'];

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1>Dashboard</h1>
          <p style={{ fontSize: '0.8125rem', color: '#646b75', marginTop: 4 }}>
            {items.length} saved item{items.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowSave(true)}>
          <HiOutlinePlus size={16} /> Save New
        </button>
      </div>

      {/* Memory Resurfacing */}
      {resurfaced.length > 0 && (
        <div className="resurface-bar">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div className="resurface-title">📌 From your memory</div>
            <button className="btn btn-ghost btn-sm" onClick={loadData}><HiOutlineRefresh size={14} /></button>
          </div>
          <div className="resurface-items">
            {resurfaced.map(item => (
              <div
                key={item._id}
                className="resurface-card"
                onClick={() => setSelectedId(item._id)}
              >
                <div className="resurface-card-title">{item.title}</div>
                <div className="resurface-card-days">
                  {item.daysAgo === 0 ? 'Saved today' : `Saved ${item.daysAgo} day${item.daysAgo !== 1 ? 's' : ''} ago`}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Type Filters */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 20, flexWrap: 'wrap' }}>
        {typeFilters.map(t => (
          <button
            key={t}
            className={`btn btn-sm ${filter === t ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setFilter(t)}
            style={{ textTransform: 'capitalize' }}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Items Grid */}
      {loading ? (
        <div className="loading-center"><div className="spinner"></div></div>
      ) : items.length === 0 ? (
        <div className="empty-state">
          <p>No saved items yet. Click "Save New" to get started.</p>
        </div>
      ) : (
        <div className="items-grid">
          {items.map(item => (
            <ItemCard key={item._id} item={item} onClick={() => setSelectedId(item._id)} />
          ))}
        </div>
      )}

      {/* Save Modal */}
      <SaveModal isOpen={showSave} onClose={() => setShowSave(false)} onSaved={loadData} />

      {/* Detail Panel */}
      {selectedId && (
        <ItemDetail
          itemId={selectedId}
          onClose={() => setSelectedId(null)}
          onDeleted={loadData}
        />
      )}
    </div>
  );
}
