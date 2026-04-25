import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import {
  createCustomerOrder,
  getCustomerOrderStatus,
  getPublicMenu
} from "../../api/menuApi";
import {
  clearStoredCart,
  getStoredCart,
  saveStoredCart
} from "./menuCartStorage";
import styles from "./MenuHome.module.css";

export default function MenuHome() {
  const { businessSlug, branchSlug, orderCode } = useParams();

  const [view, setView] = useState(orderCode ? "status" : "menu");
  const [loading, setLoading] = useState(true);
  const [statusLoading, setStatusLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [business, setBusiness] = useState(null);
  const [branch, setBranch] = useState(null);
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [activeOrderCode, setActiveOrderCode] = useState(orderCode || "");
  const [orderInfo, setOrderInfo] = useState(null);

  const [checkoutForm, setCheckoutForm] = useState({
    customer_name: "",
    customer_phone: "",
    customer_email: "",
    order_type: "pickup",
    table_number: "",
    delivery_address: "",
    notes: ""
  });

  useEffect(() => {
    setCart(getStoredCart(businessSlug, branchSlug));
  }, [businessSlug, branchSlug]);

  useEffect(() => {
    saveStoredCart(businessSlug, branchSlug, cart);
  }, [businessSlug, branchSlug, cart]);

  useEffect(() => {
    const loadMenu = async () => {
      try {
        setLoading(true);
        setError("");

        const res = await getPublicMenu(businessSlug, branchSlug);

        setBusiness(res.business || null);
        setBranch(res.branch || null);
        setProducts(Array.isArray(res.products) ? res.products : []);
      } catch (err) {
        setError(err?.response?.data?.message || "Unable to load menu");
      } finally {
        setLoading(false);
      }
    };

    loadMenu();
  }, [businessSlug, branchSlug]);

  const cartCount = useMemo(() => {
    return cart.reduce((sum, item) => sum + Number(item.qty || 0), 0);
  }, [cart]);

  const cartTotal = useMemo(() => {
    return cart.reduce(
      (sum, item) => sum + Number(item.qty || 0) * Number(item.unit_price || 0),
      0
    );
  }, [cart]);

  const addToCart = (product) => {
    const productId = Number(product.id);

    setCart((prev) => {
      const existing = prev.find((item) => Number(item.product_id) === productId);

      if (existing) {
        return prev.map((item) =>
          Number(item.product_id) === productId
            ? { ...item, qty: Number(item.qty || 0) + 1 }
            : item
        );
      }

      return [
        ...prev,
        {
          product_id: productId,
          item_name: product.name,
          icon: product.icon || "🍽️",
          qty: 1,
          unit_price: Number(product.price || 0),
          notes: "",
          mods: []
        }
      ];
    });
  };

  const updateQty = (productId, nextQty) => {
    setCart((prev) =>
      prev
        .map((item) =>
          Number(item.product_id) === Number(productId)
            ? { ...item, qty: Number(nextQty || 0) }
            : item
        )
        .filter((item) => Number(item.qty) > 0)
    );
  };

  const removeFromCart = (productId) => {
    setCart((prev) =>
      prev.filter((item) => Number(item.product_id) !== Number(productId))
    );
  };

  const handleChangeCheckout = (key, value) => {
    setCheckoutForm((prev) => ({
      ...prev,
      [key]: value
    }));
  };

  const handlePlaceOrder = async (e) => {
    e.preventDefault();

    if (!cart.length) {
      setError("Your cart is empty");
      return;
    }

    try {
      setSubmitting(true);
      setError("");

      const payload = {
        customer_name: checkoutForm.customer_name || null,
        customer_phone: checkoutForm.customer_phone || null,
        customer_email: checkoutForm.customer_email || null,
        order_type: checkoutForm.order_type,
        table_number:
          checkoutForm.order_type === "dine_in"
            ? checkoutForm.table_number || null
            : null,
        delivery_address:
          checkoutForm.order_type === "delivery"
            ? checkoutForm.delivery_address || null
            : null,
        notes: checkoutForm.notes || null,
        items: cart.map((item) => ({
          product_id: item.product_id,
          qty: Number(item.qty || 1),
          notes: item.notes || null,
          mods: Array.isArray(item.mods) ? item.mods : []
        }))
      };

      const res = await createCustomerOrder(businessSlug, branchSlug, payload);

      clearStoredCart(businessSlug, branchSlug);
      setCart([]);
      setActiveOrderCode(res.order_code || "");
      setOrderInfo(null);
      setView("status");
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to place order");
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    if (!activeOrderCode || view !== "status") return;

    let active = true;

    const loadStatus = async () => {
      try {
        setStatusLoading(true);
        setError("");

        const res = await getCustomerOrderStatus(
          businessSlug,
          branchSlug,
          activeOrderCode
        );

        if (!active) return;

        setOrderInfo({
          order: res?.order || null,
          items: Array.isArray(res?.items) ? res.items : [],
          logs: Array.isArray(res?.logs) ? res.logs : []
        });
      } catch (err) {
        if (!active) return;
        setOrderInfo(null);
        setError(err?.response?.data?.message || "Failed to load order status");
      } finally {
        if (active) setStatusLoading(false);
      }
    };

    loadStatus();

    const timer = setInterval(loadStatus, 15000);

    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [activeOrderCode, view, businessSlug, branchSlug]);

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.contentShell}>
          <div className={styles.sectionBox}>Loading menu...</div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.hero}>
        <div className={styles.head}>
          <h1>{business?.name || businessSlug}</h1>
          <p>{branch?.name || branchSlug}</p>
        </div>

        <div className={styles.heroMeta}>
          <div className={styles.heroPill}>
            <span>🛒</span>
            <strong>{cartCount}</strong>
            <small>items</small>
          </div>

          <div className={styles.heroPill}>
            <span>💳</span>
            <strong>₦{cartTotal.toLocaleString("en-NG")}</strong>
            <small>total</small>
          </div>
        </div>
      </div>

      {error ? <div className={styles.error}>{error}</div> : null}

      <div className={styles.tabs} role="tablist" aria-label="Menu sections">
        <button
          type="button"
          role="tab"
          aria-selected={view === "menu"}
          className={view === "menu" ? styles.tabActive : styles.tab}
          onClick={() => setView("menu")}
        >
          Menu
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={view === "cart"}
          className={view === "cart" ? styles.tabActive : styles.tab}
          onClick={() => setView("cart")}
        >
          Cart {cartCount > 0 ? `(${cartCount})` : ""}
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={view === "checkout"}
          className={view === "checkout" ? styles.tabActive : styles.tab}
          onClick={() => setView("checkout")}
        >
          Checkout
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={view === "status"}
          className={view === "status" ? styles.tabActive : styles.tab}
          onClick={() => setView("status")}
        >
          Track Order
        </button>
      </div>

      <div className={styles.contentShell}>
        {view === "menu" && (
          <div className={styles.sectionBox}>
            {products.length ? (
              <div className={styles.grid}>
                {products.map((product) => (
                  <article key={product.id} className={styles.card}>
                    <div className={styles.cardTop}>
                      <span className={styles.cardIcon}>{product.icon || "🍽️"}</span>
                      <div>
                        <strong>{product.name}</strong>
                        <p className={styles.typeText}>
                          {product.type || "product"}
                        </p>
                      </div>
                    </div>

                    <p className={styles.price}>
                      ₦{Number(product.price || 0).toLocaleString("en-NG")}
                    </p>

                    <p
                      className={
                        Number(product.available) === 1
                          ? styles.available
                          : styles.unavailable
                      }
                    >
                      {Number(product.available) === 1
                        ? "Available"
                        : "Out of stock"}
                    </p>

                    <button
                      type="button"
                      className={styles.addBtn}
                      onClick={() => addToCart(product)}
                      disabled={Number(product.available) !== 1}
                    >
                      Add to cart
                    </button>
                  </article>
                ))}
              </div>
            ) : (
              <div className={styles.emptyState}>
                <h3>No products yet</h3>
                <p>No products available right now.</p>
              </div>
            )}
          </div>
        )}

        {view === "cart" && (
          <div className={styles.sectionBox}>
            <div className={styles.sectionHeader}>
              <h2>Your cart</h2>
              <p>Review your selected items before checkout.</p>
            </div>

            {!cart.length ? (
              <div className={styles.emptyState}>
                <h3>Your cart is empty</h3>
                <p>Add something from the menu to continue.</p>
              </div>
            ) : (
              <>
                <div className={styles.stackList}>
                  {cart.map((item) => (
                    <div key={item.product_id} className={styles.cartRow}>
                      <div>
                        <strong>
                          {item.icon || "🍽️"} {item.item_name}
                        </strong>
                        <p>
                          ₦{Number(item.unit_price || 0).toLocaleString("en-NG")}
                        </p>
                      </div>

                      <div className={styles.rowActions}>
                        <button
                          type="button"
                          onClick={() =>
                            updateQty(item.product_id, Number(item.qty || 0) - 1)
                          }
                        >
                          -
                        </button>

                        <span>{item.qty}</span>

                        <button
                          type="button"
                          onClick={() =>
                            updateQty(item.product_id, Number(item.qty || 0) + 1)
                          }
                        >
                          +
                        </button>

                        <button
                          type="button"
                          onClick={() => removeFromCart(item.product_id)}
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className={styles.totalRow}>
                  <strong>Total</strong>
                  <strong>₦{cartTotal.toLocaleString("en-NG")}</strong>
                </div>

                <button
                  type="button"
                  className={styles.linkBtn}
                  onClick={() => setView("checkout")}
                >
                  Continue to checkout
                </button>
              </>
            )}
          </div>
        )}

        {view === "checkout" && (
          <form className={styles.sectionBox} onSubmit={handlePlaceOrder}>
            <div className={styles.sectionHeader}>
              <h2>Checkout</h2>
              <p>Fill in your details to place your order.</p>
            </div>

            <div className={styles.formGrid}>
              <input
                placeholder="Customer name"
                value={checkoutForm.customer_name}
                onChange={(e) =>
                  handleChangeCheckout("customer_name", e.target.value)
                }
              />

              <input
                placeholder="Phone"
                value={checkoutForm.customer_phone}
                onChange={(e) =>
                  handleChangeCheckout("customer_phone", e.target.value)
                }
              />

              <input
                placeholder="Email (optional)"
                value={checkoutForm.customer_email}
                onChange={(e) =>
                  handleChangeCheckout("customer_email", e.target.value)
                }
              />

              <select
                value={checkoutForm.order_type}
                onChange={(e) =>
                  handleChangeCheckout("order_type", e.target.value)
                }
              >
                <option value="pickup">Pickup</option>
                <option value="dine_in">Dine-in</option>
                <option value="delivery">Delivery</option>
              </select>
            </div>

            {checkoutForm.order_type === "dine_in" && (
              <input
                placeholder="Table number"
                value={checkoutForm.table_number}
                onChange={(e) =>
                  handleChangeCheckout("table_number", e.target.value)
                }
              />
            )}

            {checkoutForm.order_type === "delivery" && (
              <textarea
                placeholder="Delivery address"
                value={checkoutForm.delivery_address}
                onChange={(e) =>
                  handleChangeCheckout("delivery_address", e.target.value)
                }
              />
            )}

            <textarea
              placeholder="Notes (optional)"
              value={checkoutForm.notes}
              onChange={(e) => handleChangeCheckout("notes", e.target.value)}
            />

            <div className={styles.totalRow}>
              <strong>Order total</strong>
              <strong>₦{cartTotal.toLocaleString("en-NG")}</strong>
            </div>

            <button
              type="submit"
              className={styles.linkBtn}
              disabled={!cart.length || submitting}
            >
              {submitting ? "Placing order..." : "Place order"}
            </button>
          </form>
        )}

        {view === "status" && (
          <div className={styles.sectionBox}>
            <div className={styles.sectionHeader}>
              <h2>Track order</h2>
              <p>Enter your order code to see live progress.</p>
            </div>

            <div className={styles.statusLookup}>
              <input
                placeholder="Enter your order code"
                value={activeOrderCode}
                onChange={(e) => setActiveOrderCode(e.target.value.trim())}
              />
            </div>

            {statusLoading ? <p className={styles.helperText}>Loading order status...</p> : null}

            {orderInfo?.order ? (
              <>
                <div className={styles.infoGrid}>
                  <div className={styles.infoCard}>
                    <span>Order</span>
                    <strong>{orderInfo.order.order_code}</strong>
                  </div>

                  <div className={styles.infoCard}>
                    <span>Status</span>
                    <strong>{orderInfo.order.fulfillment_status || "pending"}</strong>
                  </div>

                  <div className={styles.infoCard}>
                    <span>Payment</span>
                    <strong>{orderInfo.order.payment_status || "pending"}</strong>
                  </div>

                  <div className={styles.infoCard}>
                    <span>Total</span>
                    <strong>
                      ₦{Number(orderInfo.order.total || 0).toLocaleString("en-NG")}
                    </strong>
                  </div>

                  <div className={styles.infoCard}>
                    <span>Type</span>
                    <strong>{orderInfo.order.order_type || "-"}</strong>
                  </div>

                  {orderInfo.order.table_number ? (
                    <div className={styles.infoCard}>
                      <span>Table</span>
                      <strong>{orderInfo.order.table_number}</strong>
                    </div>
                  ) : null}
                </div>

                <div className={styles.stackList}>
                  {orderInfo.items.map((item) => (
                    <div key={item.id} className={styles.statusItem}>
                      <span>
                        {item.icon || "🍽️"} {item.item_name} x{item.qty}
                      </span>
                      <strong>
                        ₦{Number(item.final_price || 0).toLocaleString("en-NG")}
                      </strong>
                    </div>
                  ))}
                </div>

                <div className={styles.logsBox}>
                  <h3>Status history</h3>
                  {orderInfo.logs.length ? (
                    orderInfo.logs.map((log, index) => (
                      <div key={index} className={styles.logItem}>
                        <span>
                          {log.old_status || "new"} → {log.new_status || "pending"}
                        </span>
                        <small>
                          {log.created_at
                            ? new Date(log.created_at).toLocaleString()
                            : ""}
                        </small>
                      </div>
                    ))
                  ) : (
                    <p className={styles.helperText}>No status updates yet.</p>
                  )}
                </div>
              </>
            ) : !statusLoading && activeOrderCode ? (
              <div className={styles.emptyState}>
                <h3>No order loaded yet</h3>
                <p>Check the code and try again.</p>
              </div>
            ) : (
              <div className={styles.emptyState}>
                <h3>Track your order</h3>
                <p>Enter your order code to check status.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}