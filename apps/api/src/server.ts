import express from "express";
import cors from "cors";
import { env } from "./config";
import { errorHandler, notFound } from "./middlewares";
import { authRouter } from "./modules/auth";
import { partyRouter } from "./modules/parties";
import { productRouter } from "./modules/products";
import { inventoryRouter } from "./modules/inventory";

const app = express();

app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }));
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "mini-business-erp-api" });
});

app.use("/api/auth", authRouter);
app.use("/api/parties", partyRouter);
app.use("/api/products", productRouter);
app.use("/api/inventory", inventoryRouter);

app.use(notFound);
app.use(errorHandler);

app.listen(env.PORT, "0.0.0.0", () => {
  console.log(`API listening on http://localhost:${env.PORT}`);
});

export default app;
