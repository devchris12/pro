"use client";

import React from "react";
import { useGetProfile } from "@/app/components/hooks/user/useGetProfile";
import { ExpensesContent } from "@/app/components/dashboard/expenses/ExpensesContent";

export default function ExpensesPage(): React.ReactElement {
  const { data: user } = useGetProfile();
  const firstName = user?.first_name ?? "there";

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      <ExpensesContent firstName={firstName} />
    </div>
  );
}
