import { useState, useEffect } from 'react';
import { searchItems } from '../api';
import ItemCard, { SkeletonCard } from '../components/ItemCard';
import ItemDetail from '../components/ItemDetail';
import { HiOutlineSearch } from 'react-icons/hi';

export default function Search() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);

  const handleSearch = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setSearched(true);
    try {
      const data = await searchItems(query);
      setResults(data);
    } catch { setResults([]); }
    setLoading(false);
  };

  return (
    <div className="page-container">
      <div style={{ marginBottom: 24 }}>
        <h1 className="page-title">Search</h1>
        <p className="page-subtitle">Semantic search across your saved knowledge</p>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <HiOutlineSearch size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#8b919e' }} />
          <input
            className="input"
            style={{ paddingLeft: 36 }}
            placeholder="Search by meaning, not just keywords..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
          />
        </div>
        <button className="btn btn-primary" onClick={handleSearch} disabled={loading}>
          {loading ? <div className="spinner" style={{ width: 12, height: 12 }}></div> : 'Search'}
        </button>
      </div>

      {loading ? (
        <div className="items-grid">
          {[...Array(4)].map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : results.length > 0 ? (
        <div className="items-grid">
          {results.map(item => (
            <div key={item._id} style={{ position: 'relative' }}>
              <ItemCard item={item} onClick={setSelectedItem} />
              {item.similarity && (
                <span className="similarity-badge" style={{ position: 'absolute', top: 8, right: 8 }}>
                  {item.similarity}%
                </span>
              )}
            </div>
          ))}
        </div>
      ) : searched ? (
        <div className="empty-state">
          <p>No results found for "{query}"</p>
          <p className="hint">Try different keywords or broader terms</p>
        </div>
      ) : (
        <div className="empty-state">
          <div className="empty-state-icon">🔍</div>
          <p>Search uses AI to find items by meaning</p>
          <p className="hint">Try "backend tutorial" or "react components"</p>
        </div>
      )}

      {selectedItem && (
        <ItemDetail
          item={selectedItem}
          onClose={() => setSelectedItem(null)}
          onDeleted={() => { setSelectedItem(null); handleSearch(); }}
        />
      )}
    </div>
  );
}
