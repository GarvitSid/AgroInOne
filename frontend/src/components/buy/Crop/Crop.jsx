import React, { useState, useEffect } from "react";
import "./Crop.css";
import FoodCategory from "../FoodCategory/FoodCategory";
import { productsService } from "../../../api/axiosConfig";

const Food = () => {
  const [foods, setFoods] = useState([]);
  const [category, setCategory] = useState("Grains");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await productsService.getAll();
        setFoods(Array.isArray(response.data) ? response.data : []);
      } catch (error) {
        console.error("Failed to fetch products:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, []);

  const selectCategory = foods.filter((cat) => cat.catagories === category);

  if (loading) {
    return (
      <div className="container food-header py-5 text-center">
        <div className="spinner-border text-success" role="status">
          <span className="visually-hidden">Loading marketplace...</span>
        </div>
        <p className="mt-3 text-muted">Loading marketplace...</p>
      </div>
    );
  }

  return (
    <div className="container food-header py-5">
      <div className="row g-4">
        <div className="col-lg-3">
          <div className="food-sidebar p-4 sticky-top">
            <p className="text-uppercase text-muted fw-semibold small mb-2">Categories</p>
            <h3 className="mb-3">Browse products</h3>
            <div className="d-grid gap-2">
              {['Grains', 'Nuts', 'Oil'].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategory(cat)}
                  className={`food-nav-button ${category === cat ? 'active' : ''}`}
                  aria-label={`Select ${cat} category`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="col-lg-9">
          <div className="row g-4">
            {selectCategory.length > 0 ? (
              selectCategory.map((item) => (
                <div className="col-md-6 col-xl-4" key={item.keys || item.id || item.title}>
                  <FoodCategory items={item} />
                </div>
              ))
            ) : (
              <div className="col-12">
                <div className="empty-state">No items found for the selected category.</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Food;
