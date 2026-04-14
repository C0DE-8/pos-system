import { useEffect, useState } from "react";
import API from "../../api/api";
import Sidebar from "../../components/sidebar/Sidebar";
import styles from "./POS.module.css";

export default function POS() {
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);

  const loadProducts = async () => {
    try {
      const res = await API.get("/products");
      setProducts(res.data);
    } catch (error) {
      console.error("Failed to load products", error);
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  const addToCart = (product) => {
    const existing = cart.find((item) => item.id === product.id);

    if (existing) {
      setCart(
        cart.map((item) =>
          item.id === product.id
            ? { ...item, qty: item.qty + 1 }
            : item
        )
      );
      return;
    }

    setCart([...cart, { ...product, qty: 1 }]);
  };

  const total = cart.reduce((sum, item) => sum + Number(item.price) * item.qty, 0);

  return (
    <div className={styles.layout}>
      <Sidebar />

      <main className={styles.content}>
        <h1 className={styles.title}>POS</h1>

        <div className={styles.grid}>
          <section className={styles.productsSection}>
            <h2 className={styles.sectionTitle}>Products</h2>
            <div className={styles.productsGrid}>
              {products.map((product) => (
                <button
                  key={product.id}
                  className={styles.productCard}
                  onClick={() => addToCart(product)}
                >
                  <span>{product.name}</span>
                  <strong>₦{product.price}</strong>
                </button>
              ))}
            </div>
          </section>

          <section className={styles.cartSection}>
            <h2 className={styles.sectionTitle}>Cart</h2>

            <div className={styles.cartList}>
              {cart.length === 0 ? (
                <p className={styles.empty}>No items in cart.</p>
              ) : (
                cart.map((item) => (
                  <div key={item.id} className={styles.cartItem}>
                    <span>
                      {item.name} x {item.qty}
                    </span>
                    <strong>₦{Number(item.price) * item.qty}</strong>
                  </div>
                ))
              )}
            </div>

            <div className={styles.total}>Total: ₦{total}</div>
          </section>
        </div>
      </main>
    </div>
  );
}