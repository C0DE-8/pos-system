import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import {
  createCustomerReservation,
  createCustomerOrder,
  getCustomerOrderStatus,
  getPublicMenu,
  lookupMenuMember,
  registerMenuMember
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
  const [lookupLoading, setLookupLoading] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [reserving, setReserving] = useState(false);
  const [error, setError] = useState("");
  const [memberMessage, setMemberMessage] = useState("");
  const [reservationMessage, setReservationMessage] = useState("");

  const [business, setBusiness] = useState(null);
  const [branch, setBranch] = useState(null);
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [activeOrderCode, setActiveOrderCode] = useState(orderCode || "");
  const [orderInfo, setOrderInfo] = useState(null);
  const [activeMember, setActiveMember] = useState(null);
  const [memberLookupEmail, setMemberLookupEmail] = useState("");

  const [checkoutForm, setCheckoutForm] = useState({
    customer_name: "",
    customer_phone: "",
    customer_email: "",
    order_type: "pickup",
    payment_method: "pay_at_counter",
    table_number: "",
    delivery_address: "",
    notes: ""
  });
  const [registrationForm, setRegistrationForm] = useState({
    name: "",
    phone: "",
    email: "",
    birthday: "",
    preferences: ""
  });
  const [reservationForm, setReservationForm] = useState({
    customer_name: "",
    customer_phone: "",
    customer_email: "",
    session_type: "game_session",
    party_size: "1",
    reservation_date: "",
    reservation_time: "",
    duration_minutes: "60",
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

  const applyMemberToForms = (member) => {
    if (!member) return;

    setActiveMember(member);
    setCheckoutForm((prev) => ({
      ...prev,
      customer_name: prev.customer_name || member.name || "",
      customer_phone: prev.customer_phone || member.phone || "",
      customer_email: member.email || prev.customer_email
    }));
    setReservationForm((prev) => ({
      ...prev,
      customer_name: prev.customer_name || member.name || "",
      customer_phone: prev.customer_phone || member.phone || "",
      customer_email: member.email || prev.customer_email
    }));
  };

  const handleLookupMember = async (e) => {
    e.preventDefault();

    if (!memberLookupEmail.trim()) {
      setMemberMessage("");
      setError("Enter the email on your member account");
      return;
    }

    try {
      setLookupLoading(true);
      setError("");
      setMemberMessage("");

      const res = await lookupMenuMember(businessSlug, branchSlug, {
        email: memberLookupEmail.trim()
      });

      applyMemberToForms(res?.data || null);
      setMemberMessage(res?.data?.name ? `Signed in as ${res.data.name}` : "Member found");
    } catch (err) {
      setActiveMember(null);
      setMemberMessage("No active member found. You can still order as a guest or register below.");
      setError("");
    } finally {
      setLookupLoading(false);
    }
  };

  const handleRegisterMember = async (e) => {
    e.preventDefault();

    if (!registrationForm.name.trim() || !registrationForm.email.trim()) {
      setError("Name and email are required for member registration");
      return;
    }

    try {
      setRegistering(true);
      setError("");
      setMemberMessage("");

      const res = await registerMenuMember(businessSlug, branchSlug, {
        name: registrationForm.name.trim(),
        phone: registrationForm.phone.trim(),
        email: registrationForm.email.trim(),
        birthday: registrationForm.birthday || null,
        preferences: registrationForm.preferences.trim()
      });

      setRegistrationForm({
        name: "",
        phone: "",
        email: "",
        birthday: "",
        preferences: ""
      });
      setMemberMessage(res?.message || "Registration submitted for staff verification");
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to submit member registration");
    } finally {
      setRegistering(false);
    }
  };

  const handlePlaceOrder = async (e) => {
    e.preventDefault();

    if (!cart.length) {
      setError("Your cart is empty");
      return;
    }

    if (checkoutForm.payment_method === "wallet" && !activeMember) {
      setError("Find your member account before using wallet payment");
      setView("member");
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
        payment_method: checkoutForm.payment_method,
        wallet_payment:
          checkoutForm.payment_method === "wallet"
            ? cartTotal
            : 0,
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
      if (res.member) {
        setActiveMember((prev) => ({
          ...(prev || {}),
          ...res.member
        }));
      }
      setActiveOrderCode(res.order_code || "");
      setOrderInfo(null);
      setView("status");
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to place order");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateReservation = async (e) => {
    e.preventDefault();

    if (!reservationForm.reservation_date || !reservationForm.reservation_time) {
      setError("Choose a reservation date and time");
      return;
    }

    try {
      setReserving(true);
      setError("");
      setReservationMessage("");

      const res = await createCustomerReservation(businessSlug, branchSlug, {
        customer_name: reservationForm.customer_name || null,
        customer_phone: reservationForm.customer_phone || null,
        customer_email: reservationForm.customer_email || null,
        session_type: reservationForm.session_type,
        party_size: Number(reservationForm.party_size || 1),
        reservation_date: reservationForm.reservation_date,
        reservation_time: reservationForm.reservation_time,
        duration_minutes: Number(reservationForm.duration_minutes || 60),
        notes: reservationForm.notes || null
      });

      setReservationMessage(
        res?.reservation_code
          ? `Reservation submitted. Code: ${res.reservation_code}`
          : "Reservation submitted"
      );
      setReservationForm((prev) => ({
        ...prev,
        reservation_date: "",
        reservation_time: "",
        notes: ""
      }));
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to submit reservation");
    } finally {
      setReserving(false);
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
          aria-selected={view === "member"}
          className={view === "member" ? styles.tabActive : styles.tab}
          onClick={() => setView("member")}
        >
          Member
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={view === "reservations"}
          className={view === "reservations" ? styles.tabActive : styles.tab}
          onClick={() => setView("reservations")}
        >
          Reservations
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

            {activeMember ? (
              <div className={styles.memberBanner}>
                <div>
                  <span>Member account</span>
                  <strong>{activeMember.name}</strong>
                  <small>
                    {activeMember.member_code} · Wallet ₦
                    {Number(activeMember.wallet_balance || 0).toLocaleString("en-NG")}
                  </small>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setActiveMember(null);
                    handleChangeCheckout("payment_method", "pay_at_counter");
                  }}
                >
                  Use guest checkout
                </button>
              </div>
            ) : (
              <button
                type="button"
                className={styles.secondaryAction}
                onClick={() => {
                  setMemberLookupEmail(checkoutForm.customer_email);
                  setView("member");
                }}
              >
                I have a member account
              </button>
            )}

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

              <select
                value={checkoutForm.payment_method}
                onChange={(e) =>
                  handleChangeCheckout("payment_method", e.target.value)
                }
              >
                <option value="pay_at_counter">Pay at counter</option>
                <option value="card">Card / online payment</option>
                <option value="transfer">Bank transfer</option>
                <option value="wallet" disabled={!activeMember}>
                  Member wallet
                </option>
              </select>
            </div>

            {checkoutForm.payment_method === "wallet" ? (
              <p className={styles.helperText}>
                Wallet payment will use ₦{cartTotal.toLocaleString("en-NG")} from the
                signed-in member balance.
              </p>
            ) : null}

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

        {view === "member" && (
          <div className={styles.sectionBox}>
            <div className={styles.sectionHeader}>
              <h2>Member account</h2>
              <p>Use your member email for wallet checkout and member-linked orders.</p>
            </div>

            {memberMessage ? <div className={styles.notice}>{memberMessage}</div> : null}

            {activeMember ? (
              <div className={styles.memberCard}>
                <span>Signed in</span>
                <strong>{activeMember.name}</strong>
                <small>{activeMember.email}</small>
                <div className={styles.memberMeta}>
                  <span>{activeMember.member_code}</span>
                  <span>
                    ₦{Number(activeMember.wallet_balance || 0).toLocaleString("en-NG")}
                  </span>
                  <span>{activeMember.membership_tier_name || "Member"}</span>
                </div>
                <button
                  type="button"
                  className={styles.secondaryAction}
                  onClick={() => setActiveMember(null)}
                >
                  Sign out member
                </button>
              </div>
            ) : (
              <form className={styles.inlineForm} onSubmit={handleLookupMember}>
                <input
                  type="email"
                  placeholder="Member email"
                  value={memberLookupEmail}
                  onChange={(e) => setMemberLookupEmail(e.target.value)}
                />
                <button type="submit" className={styles.linkBtn} disabled={lookupLoading}>
                  {lookupLoading ? "Checking..." : "Find member"}
                </button>
              </form>
            )}

            <form className={styles.memberRegisterBox} onSubmit={handleRegisterMember}>
              <div className={styles.sectionHeader}>
                <h2>Register as a member</h2>
                <p>New registrations are sent to staff for verification.</p>
              </div>

              <div className={styles.formGrid}>
                <input
                  placeholder="Full name"
                  value={registrationForm.name}
                  onChange={(e) =>
                    setRegistrationForm((prev) => ({ ...prev, name: e.target.value }))
                  }
                />
                <input
                  placeholder="Phone"
                  value={registrationForm.phone}
                  onChange={(e) =>
                    setRegistrationForm((prev) => ({ ...prev, phone: e.target.value }))
                  }
                />
                <input
                  type="email"
                  placeholder="Email"
                  value={registrationForm.email}
                  onChange={(e) =>
                    setRegistrationForm((prev) => ({ ...prev, email: e.target.value }))
                  }
                />
                <input
                  type="date"
                  value={registrationForm.birthday}
                  onChange={(e) =>
                    setRegistrationForm((prev) => ({
                      ...prev,
                      birthday: e.target.value
                    }))
                  }
                />
              </div>

              <textarea
                placeholder="Preferences"
                value={registrationForm.preferences}
                onChange={(e) =>
                  setRegistrationForm((prev) => ({
                    ...prev,
                    preferences: e.target.value
                  }))
                }
              />

              <button type="submit" className={styles.linkBtn} disabled={registering}>
                {registering ? "Submitting..." : "Submit registration"}
              </button>
            </form>
          </div>
        )}

        {view === "reservations" && (
          <form className={styles.sectionBox} onSubmit={handleCreateReservation}>
            <div className={styles.sectionHeader}>
              <h2>Book a game session</h2>
              <p>Reserve a time and staff will confirm availability.</p>
            </div>

            {reservationMessage ? (
              <div className={styles.notice}>{reservationMessage}</div>
            ) : null}

            <div className={styles.formGrid}>
              <input
                placeholder="Customer name"
                value={reservationForm.customer_name}
                onChange={(e) =>
                  setReservationForm((prev) => ({
                    ...prev,
                    customer_name: e.target.value
                  }))
                }
              />
              <input
                placeholder="Phone"
                value={reservationForm.customer_phone}
                onChange={(e) =>
                  setReservationForm((prev) => ({
                    ...prev,
                    customer_phone: e.target.value
                  }))
                }
              />
              <input
                type="email"
                placeholder="Member email or guest email"
                value={reservationForm.customer_email}
                onChange={(e) =>
                  setReservationForm((prev) => ({
                    ...prev,
                    customer_email: e.target.value
                  }))
                }
              />
              <select
                value={reservationForm.session_type}
                onChange={(e) =>
                  setReservationForm((prev) => ({
                    ...prev,
                    session_type: e.target.value
                  }))
                }
              >
                <option value="game_session">Game session</option>
                <option value="arcade">Arcade</option>
                <option value="console">Console</option>
                <option value="event">Event</option>
              </select>
              <input
                type="number"
                min="1"
                placeholder="Party size"
                value={reservationForm.party_size}
                onChange={(e) =>
                  setReservationForm((prev) => ({
                    ...prev,
                    party_size: e.target.value
                  }))
                }
              />
              <input
                type="date"
                value={reservationForm.reservation_date}
                onChange={(e) =>
                  setReservationForm((prev) => ({
                    ...prev,
                    reservation_date: e.target.value
                  }))
                }
              />
              <input
                type="time"
                value={reservationForm.reservation_time}
                onChange={(e) =>
                  setReservationForm((prev) => ({
                    ...prev,
                    reservation_time: e.target.value
                  }))
                }
              />
              <select
                value={reservationForm.duration_minutes}
                onChange={(e) =>
                  setReservationForm((prev) => ({
                    ...prev,
                    duration_minutes: e.target.value
                  }))
                }
              >
                <option value="30">30 minutes</option>
                <option value="60">1 hour</option>
                <option value="90">1.5 hours</option>
                <option value="120">2 hours</option>
              </select>
            </div>

            <textarea
              placeholder="Reservation notes"
              value={reservationForm.notes}
              onChange={(e) =>
                setReservationForm((prev) => ({ ...prev, notes: e.target.value }))
              }
            />

            <button type="submit" className={styles.linkBtn} disabled={reserving}>
              {reserving ? "Submitting..." : "Request reservation"}
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
