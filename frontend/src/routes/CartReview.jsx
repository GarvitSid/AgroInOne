import React, { useEffect, useState } from "react";
import {
  getDatabaseCart,
  removeFromDatabaseCart,
  addToDatabaseCart,
  processOrder,
} from "../components/buy/Utilities/databaseManager";
import { productsService } from "../api/axiosConfig";
import CartReviewItem from "../components/buy/CartReviewItem/CartReviewItem";
import CartHidden from "../components/buy/CartHidden/CartHidden";
import { Form, Button, Container } from "react-bootstrap";
import Header from "../components/buy/Header/Header";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { ordersService } from "../api/axiosConfig";

const CartReview = () => {
  const [cart, setCart] = useState([]);
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [deliveryDetails, setDeliveryDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [loadingCart, setLoadingCart] = useState(true);
  const navigate = useNavigate();
  
  useEffect(() => {
    const fetchCartItems = async () => {
      const getSavedDataFromLS = getDatabaseCart();
      const itemKeys = Object.keys(getSavedDataFromLS);

      if (itemKeys.length === 0) {
        setCart([]);
        setLoadingCart(false);
        return;
      }

      try {
        // Fetch all products then cross-reference with local storage keys
        const response = await productsService.getAll();
        const allProducts = response.data;

        const cartProducts = itemKeys.map((key) => {
          const product = allProducts.find((fd) => fd.keys === key);
          if (product) {
            return { ...product, quantity: getSavedDataFromLS[key] };
          }
          return null;
        }).filter(product => product !== null);

        setCart(cartProducts);
      } catch (error) {
        console.error("Failed to load cart items:", error);
        toast.error("Failed to load cart items");
      } finally {
        setLoadingCart(false);
      }
    };
    fetchCartItems();
  }, []);

  const removeItem = (productKey) => {
    const newRemoveCart = cart.filter((pd) => pd.keys !== productKey);
    setCart(newRemoveCart);
    removeFromDatabaseCart(productKey);
  };

  const updateQuantity = (productKey, delta) => {
    setCart((prevCart) => {
      const updatedCart = prevCart
        .map((item) => {
          if (item.keys !== productKey) {
            return item;
          }

          const nextQuantity = item.quantity + delta;
          if (nextQuantity <= 0) {
            removeFromDatabaseCart(productKey);
            return null;
          }

          addToDatabaseCart(productKey, nextQuantity);
          return { ...item, quantity: nextQuantity };
        })
        .filter(Boolean);

      return updatedCart;
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (cart.length === 0) {
      toast.error("Your cart is empty");
      return;
    }

    try {
      setSubmitting(true);
      await ordersService.create(cart, address, phone, deliveryDetails);
      processOrder();
      setCart([]);
      toast.success("Order placed successfully");
      navigate("/orders");
    } catch (error) {
      console.error("Failed to place order:", error);
      toast.error(error?.response?.data?.error || "Unable to place order");
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingCart) {
    return (
      <>
        <Header />
        <Container className="checkout-layout text-center py-5">
          <div className="spinner-border text-success" role="status">
            <span className="visually-hidden">Loading cart...</span>
          </div>
          <p className="mt-3 text-muted">Loading your cart...</p>
        </Container>
      </>
    );
  }

  return (
    <>
      <Header />
      <Container className="checkout-layout">
        <h1 className="page-heading text-start mb-4">Checkout</h1>
        <div className="row g-4">
          <div className="col-lg-8">
            <div className="card p-4 mb-4 checkout-card">
              <h4 className="mb-4">1. Review Items</h4>
              {cart.length === 0 ? (
                <div className="empty-state py-4">Your cart is empty.</div>
              ) : (
                cart.map((pd) => (
                  <CartReviewItem
                    key={pd.keys}
                    removeItem={removeItem}
                    onIncrease={(key) => updateQuantity(key, 1)}
                    onDecrease={(key) => updateQuantity(key, -1)}
                    foodsToReview={pd}
                  />
                ))
              )}
            </div>

            <div className="card p-4 checkout-card">
              <h4 className="mb-4">2. Shipping Details</h4>
              <Form id="checkout-form" onSubmit={handleSubmit}>
                <div className="row g-3">
                  <div className="col-md-6">
                    <Form.Label>Address</Form.Label>
                    <Form.Control
                      type="text"
                      placeholder="Bhubaneswar, Odisha"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      required
                    />
                  </div>
                  <div className="col-md-6">
                    <Form.Label>Phone</Form.Label>
                    <Form.Control
                      type="tel"
                      placeholder="+91"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      required
                    />
                  </div>
                  <div className="col-12">
                    <Form.Label>Delivery Details</Form.Label>
                    <Form.Control
                      as="textarea"
                      rows="3"
                      placeholder="Optional delivery instructions"
                      value={deliveryDetails}
                      onChange={(e) => setDeliveryDetails(e.target.value)}
                    />
                  </div>
                </div>
              </Form>
            </div>
          </div>

          <div className="col-lg-4">
            <div className="card p-4 checkout-card checkout-summary">
              <h4 className="mb-4">Order Summary</h4>
              <CartHidden cart={cart} />
              <Button
                className="btn btn-primary mt-4 w-100"
                size="lg"
                type="submit"
                form="checkout-form"
                disabled={submitting || cart.length === 0}
              >
                {submitting ? "Processing..." : "Place Order"}
              </Button>
            </div>
          </div>
        </div>
      </Container>
    </>
  );
};

export default CartReview;
