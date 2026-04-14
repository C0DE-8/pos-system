import React from "react";
import { Toaster } from "react-hot-toast";
import styles from "./CustomToaster.module.css";

export default function CustomToaster() {
  return (
    <Toaster
      position="top-right"
      reverseOrder={false}
      gutter={12}
      containerClassName={styles.toasterWrap}
      toastOptions={{
        duration: 3500,
        className: styles.toast,
        success: {
          className: `${styles.toast} ${styles.success}`
        },
        error: {
          className: `${styles.toast} ${styles.error}`
        },
        loading: {
          className: `${styles.toast} ${styles.loading}`
        }
      }}
    />
  );
}
