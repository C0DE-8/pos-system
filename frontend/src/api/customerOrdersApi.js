import API from "./api";

export const getIncomingCustomerOrders = async () => {
  const { data } = await API.get("/menu/admin/orders");
  return data;
};

export const getHeldCustomerOrders = async () => {
  const { data } = await API.get("/menu/admin/orders");
  return data;
};

export const getCheckoutQueueCustomerOrders = async () => {
  const { data } = await API.get("/menu/admin/orders");
  return data;
};

export const getCustomerOrderById = async (id) => {
  const { data } = await API.get(`/menu/admin/orders/${id}`);
  return data;
};

export const holdCustomerOrder = async (id) => {
  const { data } = await API.patch(`/menu/admin/orders/${id}/status`, {
    fulfillment_status: "pending",
    payment_status: "unpaid"
  });
  return data;
};

export const resumeCustomerOrder = async (id) => {
  const { data } = await API.patch(`/menu/admin/orders/${id}/status`, {
    fulfillment_status: "confirmed"
  });
  return data;
};

export const checkoutCustomerOrder = async (id) => {
  const { data } = await API.patch(`/menu/admin/orders/${id}/status`, {
    payment_status: "paid"
  });
  return data;
};

export const updateCustomerOrderStatus = async (id, payload) => {
  const { data } = await API.patch(`/menu/admin/orders/${id}/status`, payload);
  return data;
};
