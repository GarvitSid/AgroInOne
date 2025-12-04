import React from 'react';

export default function Helpdeskcard({ data, query = '' }) {
  const highlight = (text = '') => {
    if (!query) return text;
    const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(`(${escaped})`, 'ig');
    return String(text).split(re).map((part, i) => (
      re.test(part) ? <mark key={i}>{part}</mark> : <span key={i}>{part}</span>
    ));
  };

  return (
    <div className="card help-card">
      <div className="card-body">
        <h5 className="mt-2 mb-3 font-weight-bold">{highlight(data.title)}</h5>
        <p className="mb-0 mt-2 font-italic">{highlight(data.description)}</p>
        {data.tags && <div className="tags mt-2">{data.tags.map(t => <span key={t} className="tag me-2">#{t}</span>)}</div>}

        {data.contact && (
          <div className="mt-3">
            <p className="mb-1 font-weight-bold">Contact:</p>
            {data.contact.phone && <p className="mb-0">Phone: {data.contact.phone}</p>}
            {data.contact.email && <p className="mb-0">Email: <a href={`mailto:${data.contact.email}`}>{data.contact.email}</a></p>}
          </div>
        )}

        {data.links && (
          <div className="mt-3">
            <p className="mb-1 font-weight-bold">Links:</p>
            <p className="mb-0"><a href={data.links} target="_blank" rel="noopener noreferrer">{data.links}</a></p>
          </div>
        )}

        {data.state && (
          <div className="mt-3">
            <p className="mb-1 font-weight-bold">State:</p>
            <p className="mb-0">{data.state}</p>
          </div>
        )}
      </div>
      <footer className="blockquote-footer pt-4 mt-4 border-top">
        AgroInOne—<cite title="Source Title">Help Desk</cite>
      </footer>
    </div>
  );
}

