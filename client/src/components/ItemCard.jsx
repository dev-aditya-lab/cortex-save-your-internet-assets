import { HiOutlineGlobeAlt, HiOutlineFilm, HiOutlinePhotograph, HiOutlineDocumentText, HiOutlineChatAlt2, HiOutlineBriefcase } from 'react-icons/hi';

const typeIcons = {
  article: HiOutlineGlobeAlt,
  youtube: HiOutlineFilm,
  image: HiOutlinePhotograph,
  pdf: HiOutlineDocumentText,
  tweet: HiOutlineChatAlt2,
  linkedin: HiOutlineBriefcase,
  other: HiOutlineGlobeAlt,
};


function formatDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function ItemCard({ item, onClick }) {
  const Icon = typeIcons[item.type] || HiOutlineGlobeAlt;

  return (
    <div className="card item-card" onClick={() => onClick?.(item)}>
      <div className="item-card-thumb">
        {item.thumbnail ? (
          <img src={item.thumbnail} alt="" onError={(e) => { e.target.style.display = 'none'; }} />
        ) : (
          <Icon size={32} />
        )}
      </div>
      <div className="item-card-body">
        <div className="item-card-title">{item.title}</div>
        {item.description && (
          <div className="item-card-desc">{item.description}</div>
        )}
        <div className="item-card-meta">
          <span className={`item-type-badge ${item.type}`}>
            <Icon size={12} /> {item.type}
          </span>
          <span>{formatDate(item.createdAt)}</span>
        </div>
        {item.tags?.length > 0 && (
          <div className="tags-row">
            {item.tags.slice(0, 3).map(tag => (
              <span key={tag} className="tag">{tag}</span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
