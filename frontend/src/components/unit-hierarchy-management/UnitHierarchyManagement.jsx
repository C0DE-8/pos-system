import { useEffect, useMemo, useState } from "react";
import { getProductById, getProducts, getProductUnits } from "../../api/productsApi";
import {
  adjustUnitInventory,
  createProductUnitHierarchy,
  getProductUnitHierarchy,
  getUnitHierarchyInventoryBreakdown,
  syncUnitHierarchyInventory
} from "../../api/unitHierarchyApi";
import styles from "./UnitHierarchyManagement.module.css";

const EMPTY_LEVEL = { unit_id: "", conversion_factor: "" };

function buildInitialLevels() {
  return [{ ...EMPTY_LEVEL }, { ...EMPTY_LEVEL, conversion_factor: 1 }];
}

export default function UnitHierarchyManagement() {
  const [products, setProducts] = useState([]);
  const [units, setUnits] = useState([]);
  const [selectedProductId, setSelectedProductId] = useState("");
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [hierarchy, setHierarchy] = useState([]);
  const [inventory, setInventory] = useState(null);
  const [levels, setLevels] = useState(buildInitialLevels);
  const [adjustForm, setAdjustForm] = useState({
    unit_level_id: "",
    qty_change: "",
    reason: "Manual adjustment"
  });
  const [activeTab, setActiveTab] = useState("structure");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  useEffect(() => {
    let active = true;

    async function loadBaseData() {
      try {
        setLoading(true);
        const [productsRes, unitsRes] = await Promise.all([getProducts(), getProductUnits()]);
        if (!active) return;
        setProducts(Array.isArray(productsRes?.data) ? productsRes.data : []);
        setUnits(Array.isArray(unitsRes?.data) ? unitsRes.data : []);
      } catch (error) {
        if (!active) return;
        setMessage({
          type: "error",
          text: error?.response?.data?.message || error?.message || "Failed to load data"
        });
      } finally {
        if (active) setLoading(false);
      }
    }

    loadBaseData();
    return () => {
      active = false;
    };
  }, []);

  const hierarchySummary = useMemo(() => {
    if (!hierarchy.length) return "";

    return hierarchy
      .map((level, index) => {
        if (index === 0) return level.unit_name;
        return `${level.conversion_factor} ${level.unit_name}`;
      })
      .join(" -> ");
  }, [hierarchy]);

  const loadProductDetails = async (productId) => {
    const [productRes, hierarchyRes] = await Promise.all([
      getProductById(productId),
      getProductUnitHierarchy(productId).catch(() => ({ data: { unit_levels: [] } }))
    ]);

    const product = productRes?.data || null;
    const unitLevels = Array.isArray(hierarchyRes?.data?.unit_levels)
      ? hierarchyRes.data.unit_levels
      : [];

    setSelectedProduct(product);
    setHierarchy(unitLevels);

    if (unitLevels.length) {
      setLevels(
        unitLevels.map((level, index) => ({
          unit_id: Number(level.unit_id),
          conversion_factor: index === 0 ? "" : Number(level.conversion_factor)
        }))
      );
    } else {
      setLevels(buildInitialLevels());
    }

    if (product?.has_unit_hierarchy === 1) {
      const breakdownRes = await getUnitHierarchyInventoryBreakdown(productId);
      setInventory(breakdownRes?.data || null);
    } else {
      setInventory(null);
    }

    setAdjustForm({
      unit_level_id: unitLevels[unitLevels.length - 1]?.id || "",
      qty_change: "",
      reason: "Manual adjustment"
    });
  };

  const handleSelectProduct = async (event) => {
    const productId = Number(event.target.value);
    setSelectedProductId(event.target.value);
    setMessage({ type: "", text: "" });

    if (!productId) {
      setSelectedProduct(null);
      setHierarchy([]);
      setInventory(null);
      setLevels(buildInitialLevels());
      return;
    }

    try {
      setLoading(true);
      await loadProductDetails(productId);
    } catch (error) {
      setMessage({
        type: "error",
        text: error?.response?.data?.message || error?.message || "Failed to load product"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLevelChange = (index, field, value) => {
    setLevels((current) =>
      current.map((level, currentIndex) =>
        currentIndex === index ? { ...level, [field]: value } : level
      )
    );
  };

  const handleAddLevel = () => {
    setLevels((current) => [...current, { ...EMPTY_LEVEL, conversion_factor: 1 }]);
  };

  const handleRemoveLevel = (index) => {
    setLevels((current) => current.filter((_, currentIndex) => currentIndex !== index));
  };

  const handleSaveHierarchy = async () => {
    if (!selectedProductId) {
      setMessage({ type: "error", text: "Select a product first" });
      return;
    }

    try {
      setSaving(true);
      setMessage({ type: "", text: "" });

      const payload = levels.map((level, index) => ({
        unit_id: Number(level.unit_id),
        conversion_factor: index === 0 ? 1 : Number(level.conversion_factor)
      }));

      await createProductUnitHierarchy(selectedProductId, payload);
      await loadProductDetails(Number(selectedProductId));
      setMessage({ type: "success", text: "Unit hierarchy saved" });
    } catch (error) {
      setMessage({
        type: "error",
        text: error?.response?.data?.message || error?.message || "Failed to save hierarchy"
      });
    } finally {
      setSaving(false);
    }
  };

  const handleAdjustInventory = async () => {
    if (!selectedProductId || !adjustForm.unit_level_id || !adjustForm.qty_change) {
      setMessage({ type: "error", text: "Complete the stock adjustment form" });
      return;
    }

    try {
      setSaving(true);
      setMessage({ type: "", text: "" });
      await adjustUnitInventory(
        selectedProductId,
        Number(adjustForm.unit_level_id),
        Number(adjustForm.qty_change),
        adjustForm.reason
      );
      await loadProductDetails(Number(selectedProductId));
      setAdjustForm((current) => ({
        ...current,
        qty_change: "",
        reason: "Manual adjustment"
      }));
      setMessage({ type: "success", text: "Inventory updated" });
    } catch (error) {
      setMessage({
        type: "error",
        text: error?.response?.data?.message || error?.message || "Failed to adjust inventory"
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSyncInventory = async () => {
    if (!selectedProductId) return;

    try {
      setSaving(true);
      setMessage({ type: "", text: "" });
      await syncUnitHierarchyInventory(selectedProductId);
      await loadProductDetails(Number(selectedProductId));
      setMessage({ type: "success", text: "Traditional stock moved into the smallest unit" });
    } catch (error) {
      setMessage({
        type: "error",
        text: error?.response?.data?.message || error?.message || "Failed to sync stock"
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <div>
          <p className={styles.eyebrow}>Inventory Extension</p>
          <h1>Unit Hierarchy</h1>
          <p className={styles.description}>
            Define per-product unit chains such as carton to pack to piece and manage stock
            at each level without breaking the existing sales flow.
          </p>
        </div>
      </section>

      {message.text ? (
        <div className={message.type === "error" ? styles.error : styles.success}>
          {message.text}
        </div>
      ) : null}

      <section className={styles.panel}>
        <div className={styles.selectorRow}>
          <label htmlFor="unit-hierarchy-product">Product</label>
          <select
            id="unit-hierarchy-product"
            value={selectedProductId}
            onChange={handleSelectProduct}
            disabled={loading || saving}
          >
            <option value="">Select a product</option>
            {products.map((product) => (
              <option key={product.id} value={product.id}>
                {product.icon} {product.name}
                {Number(product.has_unit_hierarchy) === 1 ? " [configured]" : ""}
              </option>
            ))}
          </select>
        </div>

        {selectedProduct ? (
          <div className={styles.productCard}>
            <div>
              <p className={styles.productTitle}>
                {selectedProduct.icon} {selectedProduct.name}
              </p>
              <p className={styles.productMeta}>
                Base stock: {Number(selectedProduct.stock || 0)} smallest units
              </p>
            </div>
            <div className={styles.badges}>
              <span className={styles.badge}>
                {Number(selectedProduct.has_unit_hierarchy) === 1 ? "Hierarchy enabled" : "No hierarchy"}
              </span>
            </div>
          </div>
        ) : null}

        {selectedProduct ? (
          <>
            <div className={styles.tabs}>
              <button
                type="button"
                className={activeTab === "structure" ? styles.activeTab : styles.tab}
                onClick={() => setActiveTab("structure")}
              >
                Structure
              </button>
              <button
                type="button"
                className={activeTab === "stock" ? styles.activeTab : styles.tab}
                onClick={() => setActiveTab("stock")}
              >
                Stock
              </button>
            </div>

            {activeTab === "structure" ? (
              <div className={styles.grid}>
                <div className={styles.card}>
                  <h3>Define levels</h3>
                  <p className={styles.helper}>
                    Order levels from the largest unit to the smallest unit. For each child
                    level, enter how many child units fit inside one parent unit.
                  </p>

                  <div className={styles.levelList}>
                    {levels.map((level, index) => (
                      <div key={`${index}-${level.unit_id || "new"}`} className={styles.levelRow}>
                        <div className={styles.formGroup}>
                          <label>Level {index + 1}</label>
                          <select
                            value={level.unit_id}
                            onChange={(event) =>
                              handleLevelChange(index, "unit_id", event.target.value)
                            }
                          >
                            <option value="">Select unit</option>
                            {units.map((unit) => (
                              <option key={unit.id} value={unit.id}>
                                {unit.name} ({unit.short_name})
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className={styles.formGroup}>
                          <label>
                            {index === 0 ? "Root unit" : "Units inside level " + index}
                          </label>
                          <input
                            type="number"
                            min={index === 0 ? 1 : 2}
                            step="1"
                            disabled={index === 0}
                            value={index === 0 ? 1 : level.conversion_factor}
                            onChange={(event) =>
                              handleLevelChange(index, "conversion_factor", event.target.value)
                            }
                          />
                        </div>

                        <button
                          type="button"
                          className={styles.removeBtn}
                          onClick={() => handleRemoveLevel(index)}
                          disabled={levels.length <= 2}
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className={styles.actions}>
                    <button type="button" className={styles.secondaryBtn} onClick={handleAddLevel}>
                      Add level
                    </button>
                    <button
                      type="button"
                      className={styles.primaryBtn}
                      onClick={handleSaveHierarchy}
                      disabled={saving}
                    >
                      {saving ? "Saving..." : "Save hierarchy"}
                    </button>
                  </div>
                </div>

                <div className={styles.card}>
                  <h3>Current chain</h3>
                  {hierarchy.length ? (
                    <>
                      <p className={styles.summary}>{hierarchySummary}</p>
                      <div className={styles.chainList}>
                        {hierarchy.map((level, index) => (
                          <div key={level.id} className={styles.chainItem}>
                            <strong>{level.unit_name}</strong>
                            <span>
                              {index === 0
                                ? "Largest unit"
                                : `${level.conversion_factor} per parent`}
                            </span>
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    <p className={styles.empty}>No hierarchy configured for this product yet.</p>
                  )}
                </div>
              </div>
            ) : (
              <div className={styles.grid}>
                <div className={styles.card}>
                  <h3>Unit stock</h3>
                  {inventory?.unit_levels?.length ? (
                    <div className={styles.stockTable}>
                      <div className={styles.stockHeader}>
                        <span>Unit</span>
                        <span>Qty</span>
                        <span>Smallest-unit value</span>
                      </div>
                      {inventory.unit_levels.map((level) => (
                        <div key={level.id} className={styles.stockRow}>
                          <span>
                            {level.unit_name} ({level.unit_short_name})
                          </span>
                          <span>{level.current_qty}</span>
                          <span>{level.current_qty * level.smallest_unit_multiplier}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className={styles.empty}>Save a hierarchy before managing unit stock.</p>
                  )}

                  {inventory ? (
                    <p className={styles.total}>
                      Total stock: {Number(inventory.total_in_smallest_units || 0)} smallest units
                    </p>
                  ) : null}
                </div>

                <div className={styles.card}>
                  <h3>Adjust stock</h3>
                  <div className={styles.formStack}>
                    <div className={styles.formGroup}>
                      <label>Unit level</label>
                      <select
                        value={adjustForm.unit_level_id}
                        onChange={(event) =>
                          setAdjustForm((current) => ({
                            ...current,
                            unit_level_id: event.target.value
                          }))
                        }
                        disabled={!hierarchy.length}
                      >
                        <option value="">Select unit level</option>
                        {hierarchy.map((level) => (
                          <option key={level.id} value={level.id}>
                            {level.unit_name} ({level.unit_short_name})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className={styles.formGroup}>
                      <label>Quantity change</label>
                      <input
                        type="number"
                        step="1"
                        value={adjustForm.qty_change}
                        onChange={(event) =>
                          setAdjustForm((current) => ({
                            ...current,
                            qty_change: event.target.value
                          }))
                        }
                        placeholder="Use negative values to remove stock"
                      />
                    </div>

                    <div className={styles.formGroup}>
                      <label>Reason</label>
                      <input
                        type="text"
                        value={adjustForm.reason}
                        onChange={(event) =>
                          setAdjustForm((current) => ({
                            ...current,
                            reason: event.target.value
                          }))
                        }
                      />
                    </div>

                    <div className={styles.actions}>
                      <button
                        type="button"
                        className={styles.primaryBtn}
                        onClick={handleAdjustInventory}
                        disabled={saving || !hierarchy.length}
                      >
                        {saving ? "Updating..." : "Apply stock change"}
                      </button>
                    </div>
                  </div>

                  {Number(selectedProduct.has_unit_hierarchy) === 1 &&
                  Number(selectedProduct.stock || 0) >
                    Number(inventory?.total_in_smallest_units || 0) ? (
                    <div className={styles.syncBox}>
                      <p>
                        Existing legacy stock can be pushed into the smallest unit level without
                        affecting the total stock value.
                      </p>
                      <button
                        type="button"
                        className={styles.secondaryBtn}
                        onClick={handleSyncInventory}
                        disabled={saving}
                      >
                        {saving ? "Syncing..." : "Sync legacy stock"}
                      </button>
                    </div>
                  ) : null}
                </div>
              </div>
            )}
          </>
        ) : null}
      </section>
    </div>
  );
}
