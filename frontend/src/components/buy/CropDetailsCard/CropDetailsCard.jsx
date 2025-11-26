import React from "react";
import { Card, Button } from "react-bootstrap";
//import { toast, ToastContainer } from "react-toastify";
import 'bootstrap/dist/css/bootstrap.min.css';
import 'react-toastify/dist/ReactToastify.css';

const FoodDetailsCard = (props) => {
  const {
    title,
    description,
    img,
    categories,
    price,
  } = props.findFoodDetails;

  const handleAddToCart = () => {
    props.handleAddToCart(props.findFoodDetails);
    // toast.success("Item added to cart successfully!");
  };

  return (
    <div className="container py-3 text-center">
      {/* <ToastContainer /> */}
      <Card style={{ backgroundColor: "#D1E8B6" }}>
        <Card.Body>
          <Card.Img src={img} style={{ width: "150px" }} />
          <Card.Title className="display-5 text-secondary">{title}</Card.Title>
          <Card.Text className="lead">{description}</Card.Text>
          <Card.Text>Type: {categories}</Card.Text>
          <Card.Text>Price: Rs.{price}</Card.Text>
          <Button
            onClick={handleAddToCart}
            variant="outline-danger"
          >
            Add to cart
          </Button>
        </Card.Body>
      </Card>
    </div>
  );
};

export default FoodDetailsCard;
