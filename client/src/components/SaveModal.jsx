import { useState } from 'react';
import { HiOutlineX, HiOutlineLink } from 'react-icons/hi';
import { saveItem } from '../api';

export default function SaveModal({ isOpen, onClose, onSaved }) {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSave = async (e) => {
    e.preventDefault();
    if (!url.trim()) {
      setError('Please enter a URL');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const item = await saveItem({ url: url.trim() });
      setUrl('');
      onSaved?.(item);
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Save Content</h2>
          <button className="btn-ghost" onClick={onClose}>
            <HiOutlineX size={20} />
          </button>
        </div>
        <form onSubmit={handleSave}>
          <div className="modal-body">
            <div className="form-group">
              <label className="form-label">URL</label>
              <div style={{ position: 'relative' }}>
                <HiOutlineLink
                  size={16}
                  style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#646b75' }}
                />
                <input
                  className="input"
                  style={{ paddingLeft: 36 }}
                  type="url"
                  placeholder="Paste article, tweet, YouTube, or image URL..."
                  value={url}
                  onChange={e => setUrl(e.target.value)}
                  autoFocus
                />
              </div>
            </div>
            <p style={{ fontSize: '0.75rem', color: '#646b75' }}>
              Supports articles, tweets, YouTube videos, images, and PDFs.
              Metadata, tags, and embeddings are generated automatically.
            </p>
            {error && (
              <p style={{ fontSize: '0.8125rem', color: '#dc2626', marginTop: 8 }}>{error}</p>
            )}
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? (
                <><div className="spinner" style={{ width: 14, height: 14 }}></div> Saving...</>
              ) : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
