import { useState } from 'react';
import { HiOutlineSearch } from 'react-icons/hi';
import { searchItems } from '../api';
import ItemCard from '../components/ItemCard';
import ItemDetail from '../components/ItemDetail';

export default function Search() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [selectedId, setSelectedId] = useState(null);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setSearched(true);
    try {
      const data = await searchItems(query.trim());
      setResults(data);
    } catch (err) {
      console.error('Search failed:', err);
      setResults([]);
    }
    setLoading(false);
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1>Semantic Search</h1>
          <p style={{ fontSize: '0.8125rem', color: '#646b75', marginTop: 4 }}>
            Search by meaning, not just keywords
          </p>
        </div>
      </div>

      {/* Search Bar */}
      <form onSubmit={handleSearch} style={{ marginBottom: 28 }}>
        <div className="search-container">
          <HiOutlineSearch size={18} className="search-icon" />
          <input
            className="search-input"
            placeholder="Search your saved knowledge..."
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
        </div>
      </form>

      {/* Results */}
      {loading ? (
        <div className="loading-center"><div className="spinner"></div></div>
      ) : searched && results.length === 0 ? (
        <div className="empty-state">
          <p>No matching results found. Try a different query.</p>
        </div>
      ) : results.length > 0 ? (
        <>
          <p style={{ fontSize: '0.8125rem', color: '#646b75', marginBottom: 16 }}>
            {results.length} result{results.length !== 1 ? 's' : ''} found
          </p>
          <div className="items-grid">
            {results.map(item => (
              <div key={item._id} style={{ position: 'relative' }}>
                <ItemCard item={item} onClick={() => setSelectedId(item._id)} />
                {item.similarity && (
                  <div className="similarity-badge" style={{ position: 'absolute', top: 8, right: 8 }}>
                    {item.similarity}% match
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="empty-state">
          <HiOutlineSearch size={48} />
          <p>Type a query and press Enter to search</p>
        </div>
      )}

      {selectedId && (
        <ItemDetail itemId={selectedId} onClose={() => setSelectedId(null)} />
      )}
    </div>
  );
}
