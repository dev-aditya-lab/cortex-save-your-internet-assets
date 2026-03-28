import { useState, useRef, useEffect } from 'react';
import { saveItem } from '../api';

export default function SaveModal({ isOpen, onClose, onSaved }) {
  const [url, setUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setUrl('');
      setError('');
      setSaving(false);
      setTimeout(() => inputRef.current?.focus(), 80);
    }
  }, [isOpen]);

  const handleSave = async () => {
    const trimmed = url.trim();
    if (!trimmed) { setError('Please enter a URL'); return; }
    setSaving(true);
    setError('');
    try {
      const item = await saveItem({ url: trimmed });
      onSaved?.(item);
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to save');
    }
    setSaving(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !saving) handleSave();
    if (e.key === 'Escape') onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Save to Cortex</h3>
          <button className="btn-ghost" onClick={onClose} style={{ fontSize: '1rem' }}>✕</button>
        </div>
        <div className="modal-body">
          <div className="form-group">
            <label className="form-label">URL</label>
            <input
              ref={inputRef}
              className="input"
              placeholder="Paste a link — article, video, tweet, image..."
              value={url}
              onChange={e => setUrl(e.target.value)}
              onKeyDown={handleKeyDown}
            />
          </div>
          {error && <p style={{ fontSize: '0.75rem', color: '#e5484d', marginBottom: 8 }}>{error}</p>}
          <p style={{ fontSize: '0.6875rem', color: '#8b919e' }}>
            Supports articles, YouTube, tweets, LinkedIn posts, images, and PDFs.
            Metadata, tags, and embeddings are generated automatically.
          </p>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose} disabled={saving}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? <><div className="spinner" style={{ width: 12, height: 12 }}></div> Saving...</> : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}
