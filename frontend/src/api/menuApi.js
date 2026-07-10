import API from "./api";

export const getPublicMenu = async (businessSlug, branchSlug) => {
  const { data } = await API.get(`/menu/${businessSlug}/${branchSlug}/products`);

  return {
    business: {
      slug: businessSlug,
      name: businessSlug
    },
    branch: {
      slug: branchSlug,
      name: branchSlug
    },
    products: data?.data || []
  };
};

export const createCustomerOrder = async (businessSlug, branchSlug, payload) => {
  const { data } = await API.post(`/menu/${businessSlug}/${branchSlug}/orders`, payload);
  return data;
};

export const lookupMenuMember = async (businessSlug, branchSlug, payload) => {
  const { data } = await API.post(
    `/menu/${businessSlug}/${branchSlug}/members/lookup`,
    payload
  );
  return data;
};

export const registerMenuMember = async (businessSlug, branchSlug, payload) => {
  const { data } = await API.post(
    `/menu/${businessSlug}/${branchSlug}/members/register`,
    payload
  );
  return data;
};

export const createCustomerReservation = async (businessSlug, branchSlug, payload) => {
  const { data } = await API.post(
    `/menu/${businessSlug}/${branchSlug}/reservations`,
    payload
  );
  return data;
};

export const getCustomerOrderStatus = async (businessSlug, branchSlug, orderCode) => {
  const { data } = await API.get(`/menu/${businessSlug}/${branchSlug}/orders/${orderCode}`);
  return data;
};
