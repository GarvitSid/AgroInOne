import React from "react";

/**
 *
 * CartHidden to calculate product price and others
 * For now need to hidden
 * !!Needs to improve!!
 */
const CartHidden = (props) => {
  const cart = props.cart;
  let delivery=0;
  const total = cart.reduce(
    (total, item) => total + item.price * item.quantity,
    0
  );
  if(total>30){
    delivery=3
  }else if(total>1 && total <30){
    delivery=5
  }else{
    delivery=0
  }
  const grandTotal = total + delivery;
  return (
    <div>
      <div className="d-flex justify-content-between mb-2">
        <span className="text-muted">Items</span>
        <strong>{cart.length}</strong>
      </div>
      <div className="d-flex justify-content-between mb-2">
        <span className="text-muted">Subtotal</span>
        <strong>${total.toFixed(2)}</strong>
      </div>
      <div className="d-flex justify-content-between mb-2">
        <span className="text-muted">Delivery</span>
        <strong>${delivery.toFixed(2)}</strong>
      </div>
      <hr />
      <div className="d-flex justify-content-between fs-5">
        <span>Total</span>
        <strong>${grandTotal.toFixed(2)}</strong>
      </div>
    </div>
  );
};

export default CartHidden;