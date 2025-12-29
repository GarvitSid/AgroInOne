import React, { useState, useEffect } from 'react';
import Container from 'react-bootstrap/Container';
import { Spinner } from 'react-bootstrap';
import './helpdesk.css';
import Helpdeskcard from './Helpdeskcard';
import { helpdeskService } from '../api/axiosConfig';

export default function Helpdesk() {
  const [query, setQuery] = useState('');
  const [allData, setAllData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch from backend instead of importing static JSON
  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await helpdeskService.getAll();
        const data = Array.isArray(response.data) ? response.data : [];
        setAllData(data);
        setFilteredData(data);
      } catch (error) {
        console.error('Failed to load helpdesk data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Real-time search filter across title, description, and state
  useEffect(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      setFilteredData(allData);
      return;
    }
    const filtered = allData.filter((item) =>
      (item.title       || '').toLowerCase().includes(q) ||
      (item.description || '').toLowerCase().includes(q) ||
      (item.state       || '').toLowerCase().includes(q)
    );
    setFilteredData(filtered);
  }, [query, allData]);

  const handleChange = (event) => {
    setQuery(event.target.value);
  };

  if (loading) {
    return (
      <Container className="text-center py-5">
        <Spinner animation="border" role="status" />
        <p className="mt-3 text-muted">Loading helpdesk articles...</p>
      </Container>
    );
  }

  return (
    <>
      <Container className="my-3">
        <div className="search">
          <div className="row">
            <div className="col">
              <div className="search-1">
                <input
                  id="helpdesk-search"
                  aria-label="Search helpdesk knowledge base"
                  onChange={handleChange}
                  type="text"
                  placeholder="Search knowledge base..."
                  value={query}
                />
              </div>
            </div>
          </div>
        </div>
        <div className="d-flex justify-content-center mt-2">
          <small className="text-muted">Showing {filteredData.length} result{filteredData.length !== 1 ? 's' : ''}</small>
        </div>
        <br />
        <div className="helpdesk-container">
          {/* Display Helpdesk Data */}
          {filteredData.length > 0 ? (
            filteredData.map((item) => (
              <Helpdeskcard key={item.id} data={item} query={query} />
            ))
          ) : (
            <p>No matching articles. Try different keywords.</p>
          )}
        </div>
      </Container>
    </>
  );
}
