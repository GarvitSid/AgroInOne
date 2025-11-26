import React from "react";
import { Card } from "react-bootstrap";
import "./FoodCategory.css";
import { Link } from "react-router-dom";
// food category function
const FoodCategory = (props) => {
  const { keys,title, subtitle, img, catagories, price } = props.items;
  return (
    <Card className="h-100 food-cat-card">
      <Card.Img variant="top" src={img} style={{ height: '220px', objectFit: 'cover' }} />
      <Card.Body className="d-flex flex-column p-4">
        <Card.Title className="mb-2">{title}</Card.Title>
        <Card.Text className="text-muted mb-2">{subtitle}</Card.Text>
        <Card.Text className="small text-uppercase text-muted mb-2">Type: {catagories}</Card.Text>
        <Card.Text className="fw-bold fs-5 text-dark mb-4">Rs. {price}</Card.Text>
        <Link to={`/food/details/${keys}`} className="mt-auto">
          <button type="button" className="btn btn-primary w-100">Add to Cart</button>
        </Link>
      </Card.Body>
    </Card>
  );
};

export default FoodCategory;
