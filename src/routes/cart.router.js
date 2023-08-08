import RouterClass from "./Router.class.js";
import { authorizationRole, passportCall } from "../middleware/session.js";
import {
  addProductInCart,
  createCart,
  deleteCart,
  deleteProductInCart,
  getCart,
  updateCart,
  updateProductInCart,
  closeCart
} from "../controllers/cart.controller.js";

class CartRouterClass extends RouterClass {
  init() {
    this.get("/:cid?", passportCall("jwt"), getCart);
    this.post("/", passportCall("jwt"), createCart);
    this.post("/:cid/products/:pid", passportCall("jwt"), authorizationRole(["user", "premium"]), addProductInCart);
    this.delete("/:cid/products/:pid", passportCall("jwt"), deleteProductInCart);
    this.delete("/:cid/", passportCall("jwt"), deleteCart);
    this.put("/:cid", passportCall("jwt"), updateCart);
    this.put("/:cid/products/:pid", passportCall("jwt"), updateProductInCart);
    this.post("/:cid/purchase", passportCall("jwt"), closeCart);
  }
}

export default CartRouterClass;
