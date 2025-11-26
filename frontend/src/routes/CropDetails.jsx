import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { productsService } from "../api/axiosConfig";
import FoodDetailsCard from "../components/buy/CropDetailsCard/CropDetailsCard";
import CartHidden from "../components/buy/CartHidden/CartHidden";
import { addToDatabaseCart, getDatabaseCart } from "../components/buy/Utilities/databaseManager";
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Header from "../components/buy/Header/Header";
import { Container } from "react-bootstrap";

const FoodDetails = () => {
  const { keys } = useParams();
  const [findFoodDetails, setFindFoodDetails] = useState([]);
  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch the specific product from the backend API
  useEffect(() => {
    const fetchProductDetails = async () => {
      try {
        const response = await productsService.getById(keys);
        setFindFoodDetails([response.data]); // Keep as array to map over below
      } catch (error) {
        toast.error("Failed to load product details");
      } finally {
        setLoading(false);
      }
    };
    fetchProductDetails();
  }, [keys]);

  // Rebuild cart from local storage by cross-referencing all products from the API
  useEffect(() => {
    const fetchCartItems = async () => {
      const getSavedDataFromLS = getDatabaseCart();
      const itemKeys = Object.keys(getSavedDataFromLS);

      if (itemKeys.length === 0) {
        setCart([]);
        return;
      }

      try {
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
        console.error("Failed to load cart data:", error);
      }
    };
    fetchCartItems();
  }, []);


  const handleAddToCart = (foodItem) => {
    const productToBeAdded = foodItem.keys;
    const sameProduct = cart.find(item => item.keys === productToBeAdded);
    let newCart;

    if (sameProduct) {
      toast("Item added to cart!");
      const updatedProduct = { ...sameProduct, quantity: sameProduct.quantity + 1 };
      newCart = cart.map(item => item.keys === productToBeAdded ? updatedProduct : item);
      addToDatabaseCart(foodItem.keys, updatedProduct.quantity);
    } else {
      toast("Item added to cart!");
      const newProduct = { ...foodItem, quantity: 1 };
      newCart = [...cart, newProduct];
      addToDatabaseCart(foodItem.keys, 1);
    }

    setCart(newCart);
  };

  if (loading) {
    return (
      <>
        <Header />
        <Container>
          <div className="py-5 text-center">
            <div className="spinner-border text-success" role="status">
              <span className="visually-hidden">Loading product...</span>
            </div>
            <p className="mt-3 text-muted">Loading product details...</p>
          </div>
        </Container>
      </>
    );
  }

  return (
    <>
      <Header />
      <br />
      <Container>
        <div className="py-5">
          <div className="food-details-container float-left">
            {findFoodDetails.map((details) => (
              <FoodDetailsCard
                key={details.keys}
                handleAddToCart={handleAddToCart}
                findFoodDetails={details}
              />
            ))}
          </div>
          <div style={{ display: 'none' }}>
            <div className="cart-hidden-container float-right">
              <CartHidden cart={cart} />
            </div>
          </div>
        </div>
      </Container>
    </>
  );
};

export default FoodDetails;
