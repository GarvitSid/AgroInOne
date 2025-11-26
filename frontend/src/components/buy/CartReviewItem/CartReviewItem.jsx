import React from "react";
import PropTypes from "prop-types";
import "./CartReviewItem.css";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTimes } from "@fortawesome/free-solid-svg-icons";

const CartReviewItem = (props) => {
  const { title, quantity, keys, img } = props.foodsToReview;
  return (
    <div className="card mb-3 p-3 border-0 shadow-sm">
      <div className="row align-items-center g-3">
        <div className="col-3 col-md-2 crd">
          <img src={img} alt={title} className="img-fluid rounded" />
        </div>
        <div className="col-9 col-md-6">
          <h6 className="mb-1">{title}</h6>
          <p className="text-muted mb-2">Quantity: {quantity}</p>
          <div className="d-flex align-items-center gap-2">
            <button type="button" className="btn btn-outline-success btn-sm" onClick={() => props.onDecrease(keys)}>-</button>
            <span className="fw-semibold">{quantity}</span>
            <button type="button" className="btn btn-outline-success btn-sm" onClick={() => props.onIncrease(keys)}>+</button>
          </div>
        </div>
        <div className="col-12 col-md-4 text-md-end">
          <button
            onClick={() => props.removeItem(keys)}
            className="btn btn-link text-danger p-0"
            aria-label="Remove item"
          >
            <FontAwesomeIcon icon={faTimes} />
          </button>
        </div>
      </div>
    </div>
  );
};

CartReviewItem.propTypes = {
  foodsToReview: PropTypes.shape({
    title: PropTypes.string.isRequired,
    quantity: PropTypes.number.isRequired,
    keys: PropTypes.string.isRequired,
    img: PropTypes.string.isRequired,
  }).isRequired,
  removeItem: PropTypes.func.isRequired,
  onIncrease: PropTypes.func.isRequired,
  onDecrease: PropTypes.func.isRequired,
};

export default CartReviewItem;
