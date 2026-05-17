"use client";

import React from "react";
import { useGetProfile } from "@/app/components/hooks/user/useGetProfile";
import { ForecastContent } from "@/app/components/dashboard/forecast/ForecastContent";

export default function ForecastInsightsPage(): React.ReactElement {
  const { data: user } = useGetProfile();
  const firstName = user?.first_name ?? "there";

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      <ForecastContent firstName={firstName} />
    </div>
  );
}
