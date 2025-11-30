import React, { useEffect, useState } from 'react';
import Navbar from '../components/Navbar';
import Container from 'react-bootstrap/Container';
import Card from 'react-bootstrap/Card';
import Spinner from 'react-bootstrap/Spinner';
import { ordersService } from '../api/axiosConfig';
import { toast } from 'react-toastify';

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      setError('');
      try {
        const { data } = await ordersService.getMyOrders();
        setOrders(data || []);
      } catch (err) {
        console.error(err);
        setError('Unable to load orders right now. Please try again later.');
        toast.error('Failed to fetch orders');
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  return (
    <>
      <Navbar />
      <Container className="my-4">
        <h2 className="page-heading">My Orders</h2>
        {loading ? (
          <div className="text-center my-4"><Spinner animation="border" /></div>
        ) : error ? (
          <p>{error}</p>
        ) : orders.length === 0 ? (
          <p>No orders found.</p>
        ) : (
          <div className="d-grid gap-3">
            {orders.map((o) => (
              <Card key={o._id || o.id}>
                <Card.Body>
                  <Card.Title>Order #{o._id || o.id}</Card.Title>
                  <Card.Subtitle className="mb-2 text-muted">{new Date(o.createdAt || o.date || Date.now()).toLocaleString()}</Card.Subtitle>
                  <Card.Text>
                    Items: {o.items ? o.items.length : '—'}<br />
                    Address: {o.address || o.addressLine || '—'}<br />
                    Phone: {o.phone || '—'}
                  </Card.Text>
                </Card.Body>
              </Card>
            ))}
          </div>
        )}
      </Container>
    </>
  );
}
