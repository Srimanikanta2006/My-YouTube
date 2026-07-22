import express from "express";
import {
  createOrder,
  verifyPayment,
  getPaymentHistory,
} from "../Controllers/payment.js";

const routes = express.Router();

routes.post("/create-order", createOrder);
routes.post("/verify", verifyPayment);
routes.get("/history/:userId", getPaymentHistory);

export default routes;
