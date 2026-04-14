const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
require("dotenv").config();

const app = express();

app.use(cors());
app.use(helmet());
app.use(morgan("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

function loadRoute(path, name) {
  const route = require(path);
  console.log(`${name}:`, typeof route);
  return route;
}

const authRoutes = loadRoute("./routes/auth.routes", "authRoutes");
const adminRoutes = loadRoute("./routes/admin.routes", "adminRoutes");
const usersRoutes = loadRoute("./routes/users.routes", "usersRoutes");
const productsRoutes = loadRoute("./routes/products.routes", "productsRoutes");
const courtsRoutes = loadRoute("./routes/courts.routes", "courtsRoutes");
const membersRoutes = loadRoute("./routes/members.routes", "membersRoutes");
const salesRoutes = loadRoute("./routes/sales.routes", "salesRoutes");
const inventoryRoutes = loadRoute("./routes/inventory.routes", "inventoryRoutes");
const purchaseOrdersRoutes = loadRoute("./routes/purchaseOrders.routes", "purchaseOrdersRoutes");
const giftCardsRoutes = loadRoute("./routes/giftcards.routes", "giftCardsRoutes");
const shiftsRoutes = loadRoute("./routes/shifts.routes", "shiftsRoutes");
const settingsRoutes = loadRoute("./routes/settings.routes", "settingsRoutes");
const kdsRoutes = loadRoute("./routes/kds.routes", "kdsRoutes");
const posRoutes = loadRoute("./routes/pos.routes", "posRoutes");
const businessesRoutes = loadRoute("./routes/businesses.routes", "businessesRoutes");
const menuRoutes = loadRoute("./routes/menu.routes", "menuRoutes");
const reportsRoutes = loadRoute("./routes/reports.routes", "reportsRoutes");

app.get("/", (req, res) => {
  res.json({ success: true, message: "Arena Pro POS API running" });
});

app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/products", productsRoutes);
app.use("/api/courts", courtsRoutes);
app.use("/api/members", membersRoutes);
app.use("/api/sales", salesRoutes);
app.use("/api/inventory", inventoryRoutes);
app.use("/api/purchase-orders", purchaseOrdersRoutes);
app.use("/api/giftcards", giftCardsRoutes);
app.use("/api/shifts", shiftsRoutes);
app.use("/api/settings", settingsRoutes);
app.use("/api/kds", kdsRoutes);
app.use("/api/pos", posRoutes);
app.use("/api/businesses", businessesRoutes);
app.use("/api/menu", menuRoutes);
app.use("/api/reports", reportsRoutes);

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({
    success: false,
    message: err.message || "Internal server error"
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});