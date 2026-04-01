"use client";

import { useState } from "react";
import {
  CustomerForm,
  type CustomerFormInitialValues,
} from "../customers/customers-form";

function buildInitial(): CustomerFormInitialValues {
  return {
    name: "",
    phone: "",
    email: "",
    status: "active",
  };
}

export function CustomersNewView() {
  const [initial] = useState(buildInitial);

  return (
    <CustomerForm
      mode="new"
      initial={initial}
      title="Add customer"
      shellDescription="Create a new customer profile. All details are saved securely to your database."
    />
  );
}