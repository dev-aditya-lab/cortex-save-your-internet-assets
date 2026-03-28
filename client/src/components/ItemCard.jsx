import { HiOutlineGlobe, HiOutlinePlay, HiOutlineChatAlt, HiOutlinePhotograph, HiOutlineDocument, HiOutlineBriefcase } from 'react-icons/hi';

const typeIcons = {
  article: <HiOutlineGlobe />,
  youtube: <HiOutlinePlay />,
  tweet: <HiOutlineChatAlt />,
  image: <HiOutlinePhotograph />,
  pdf: <HiOutlineDocument />,
  linkedin: <HiOutlineBriefcase />,
  other: <HiOutlineGlobe />,
};

export default function ItemCard({ item, onClick }) {
  const date = new Date(item.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  return (
    <div className="item-card" onClick={() => onClick(item)}>
      {item.thumbnail ? (
        <div className="item-card-thumb">
          <img src={item.thumbnail} alt="" onError={e => { e.target.style.display = 'none'; }} />
        </div>
      ) : (
        <div className="item-card-thumb" style={{ fontSize: '1.5rem' }}>
          {typeIcons[item.type] || typeIcons.other}
        </div>
      )}
      <div className="item-card-body">
        <div className="item-card-title">{item.title || 'Untitled'}</div>
        {item.description && <div className="item-card-desc">{item.description}</div>}
        <div className="item-card-meta">
          <span className={`type-badge ${item.type}`}>
            {typeIcons[item.type]} {item.type}
          </span>
          <span>{date}</span>
        </div>
        {item.tags?.length > 0 && (
          <div className="tags-row" style={{ marginTop: 8 }}>
            {item.tags.slice(0, 3).map(tag => <span key={tag} className="tag">{tag}</span>)}
          </div>
        )}
      </div>
    </div>
  );
}

export function SkeletonCard() {
  return (
    <div className="skeleton-card">
      <div className="skeleton-card-thumb skeleton"></div>
      <div className="skeleton-card-body">
        <div className="skeleton-line w-75 skeleton"></div>
        <div className="skeleton-line w-50 skeleton"></div>
        <div className="skeleton-line w-30 skeleton"></div>
      </div>
    </div>
  );
}
