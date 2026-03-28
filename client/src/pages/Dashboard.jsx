import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getItems, getResurfaced, saveItem } from '../api';
import ItemCard, { SkeletonCard } from '../components/ItemCard';
import ItemDetail from '../components/ItemDetail';
import { HiOutlineLightningBolt } from 'react-icons/hi';

const typeFilters = ['all', 'article', 'youtube', 'tweet', 'linkedin', 'image', 'pdf'];

export default function Dashboard() {
  const [items, setItems] = useState([]);
  const [resurfaced, setResurfaced] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('all');
  const [selectedItem, setSelectedItem] = useState(null);
  const [captureUrl, setCaptureUrl] = useState('');
  const [capturing, setCapturing] = useState(false);
  const [searchParams] = useSearchParams();

  const loadData = async () => {
    setLoading(true);
    try {
      const params = activeFilter !== 'all' ? { type: activeFilter } : {};
      const [itemsData, resurfacedData] = await Promise.all([
        getItems(params),
        getResurfaced().catch(() => [])
      ]);
      setItems(itemsData);
      setResurfaced(resurfacedData);
    } catch { }
    setLoading(false);
  };

  useEffect(() => { loadData(); }, [activeFilter]);

  // Open item from URL param (from command palette)
  useEffect(() => {
    const itemId = searchParams.get('item');
    if (itemId && items.length > 0) {
      const found = items.find(i => i._id === itemId);
      if (found) setSelectedItem(found);
    }
  }, [searchParams, items]);

  const handleQuickCapture = async () => {
    const trimmed = captureUrl.trim();
    if (!trimmed || capturing) return;
    setCapturing(true);
    try {
      await saveItem({ url: trimmed });
      setCaptureUrl('');
      loadData();
    } catch { }
    setCapturing(false);
  };

  return (
    <div className="page-container">
      {/* Quick Capture */}
      <div className="quick-capture">
        <HiOutlineLightningBolt size={16} style={{ color: '#8b919e', flexShrink: 0 }} />
        <input
          placeholder="Paste a link to save instantly..."
          value={captureUrl}
          onChange={e => setCaptureUrl(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleQuickCapture()}
        />
        {captureUrl.trim() && (
          <button className="quick-capture-btn" onClick={handleQuickCapture} disabled={capturing}>
            {capturing ? 'Saving...' : 'Save'}
          </button>
        )}
      </div>

      {/* Resurfaced Items */}
      {!loading && resurfaced.length > 0 && (
        <div className="resurface-section">
          <div className="section-label">
            <span>✦</span> From your memory
          </div>
          <div className="resurface-scroll">
            {resurfaced.map(item => (
              <div key={item._id} className="resurface-card" onClick={() => setSelectedItem(item)}>
                <div className="resurface-card-title">{item.title}</div>
                <div className="resurface-card-label">
                  {item.resurfaceReason || `Saved ${item.daysAgo}d ago`}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filter Pills */}
      <div className="filter-row">
        {typeFilters.map(f => (
          <button
            key={f}
            className={`filter-pill ${activeFilter === f ? 'active' : ''}`}
            onClick={() => setActiveFilter(f)}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
        {!loading && (
          <span style={{ marginLeft: 'auto', fontSize: '0.75rem', color: '#8b919e' }}>
            {items.length} item{items.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Items Grid */}
      {loading ? (
        <div className="items-grid">
          {[...Array(6)].map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : items.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📚</div>
          <p>No saved items yet</p>
          <p className="hint">Paste a link above or press the Save button to get started</p>
        </div>
      ) : (
        <div className="items-grid">
          {items.map(item => (
            <ItemCard key={item._id} item={item} onClick={setSelectedItem} />
          ))}
        </div>
      )}

      {/* Detail Panel */}
      {selectedItem && (
        <ItemDetail
          item={selectedItem}
          onClose={() => setSelectedItem(null)}
          onDeleted={() => { setSelectedItem(null); loadData(); }}
        />
      )}
    </div>
  );
}
