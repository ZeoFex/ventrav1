"use client";

import { useState } from "react";
import { StaffForm, type StaffFormInitialValues } from "./staff-form";

/* Build initial empty form */
function buildInitial(): StaffFormInitialValues {
  return {
    firstName: "",
    lastName: "",
    phone: "",
    role: "",
    branchId: "",
    status: "active",
    imageSrc: null,
  };
}

export function StaffNewView() {
  const [initial] = useState(buildInitial);

  return (
    <StaffForm
      mode="new"
      initial={initial}
      title="Add staff"
      shellDescription="Create a new staff account with their own login credentials and specific menu permissions."
    />
  );
}