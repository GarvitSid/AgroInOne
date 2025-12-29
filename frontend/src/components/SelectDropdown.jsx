import React, { useEffect, useMemo, useState } from 'react';
import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import TotalSchemeCard from "./TotalSchemeCard";
import { schemesService } from '../api/axiosConfig';
import './Selectstyle.css';

export default function SelectDropdown() {
  const [selectedState, setSelectedState] = useState('All India');
  const [schemes, setSchemes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const loadSchemes = async () => {
      try {
        const response = await schemesService.getAll();
        if (mounted) {
          setSchemes(Array.isArray(response.data) ? response.data : []);
        }
      } catch (error) {
        console.error('Failed to load schemes:', error);
        if (mounted) {
          setSchemes([]);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadSchemes();

    return () => {
      mounted = false;
    };
  }, []);

  // derive unique states dynamically from data
  const states = useMemo(() => {
    const s = new Set(['All India', ...schemes.map((d) => d.State).filter(Boolean)]);
    return Array.from(s).sort();
  }, [schemes]);

  // Memoized filtered data based on selected state (always includes All India schemes)
  const schemeData = useMemo(() => {
    const selected = (selectedState || '').trim().toLowerCase();
    if (!selectedState || selected === 'all india') {
      return schemes.filter((item) => (item.State || '').toLowerCase() === 'all india');
    }
    return schemes.filter((item) => {
      const stateStr = (item.State || '').toLowerCase();
      return stateStr === selected || stateStr === 'all india';
    });
  }, [schemes, selectedState]);

  const handleChange = (event) => {
    setSelectedState(event.target.value);
  };

  return (
    <Container className="scheme-page">
      <Row className="justify-content-center mb-4">
        <Col lg={8}>
          <div className="scheme-filter-card p-3 p-md-4">
            <Row className="align-items-center g-3">
              <Col md={7}>
                <p className="text-uppercase text-muted fw-semibold mb-1 small">Government Schemes</p>
                <h1 className="scheme-heading mb-2">Find schemes by state</h1>
                <p className="text-muted mb-0">Quickly filter the official scheme list without the giant hero treatment.</p>
              </Col>
              <Col md={5}>
                <select
                  onChange={handleChange}
                  className="form-select py-3 select-heading"
                  value={selectedState}
                  disabled={loading}
                >
                  <option value="" disabled hidden>{loading ? 'Loading states...' : 'Select State'}</option>
                  {states.map((st) => (
                    <option key={st} value={st}>{st}</option>
                  ))}
                </select>
              </Col>
            </Row>
          </div>
        </Col>
      </Row>
      <TotalSchemeCard state={selectedState} data={schemeData} />
    </Container>
  );
}
