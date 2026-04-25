const keyFor = (businessSlug, branchSlug) => `menu_cart_${businessSlug}_${branchSlug}`;

export const getStoredCart = (businessSlug, branchSlug) => {
  try {
    const raw = localStorage.getItem(keyFor(businessSlug, branchSlug));
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    return [];
  }
};

export const saveStoredCart = (businessSlug, branchSlug, cart) => {
  localStorage.setItem(keyFor(businessSlug, branchSlug), JSON.stringify(cart || []));
};

export const clearStoredCart = (businessSlug, branchSlug) => {
  localStorage.removeItem(keyFor(businessSlug, branchSlug));
};