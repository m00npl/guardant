import React from "react";
import { ColonyLeafletMap } from "../components/ColonyLeafletMap";

export const Map: React.FC = () => {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">
        Global Colony Map
      </h1>

      <div className="card p-6" style={{ minHeight: "700px" }}>
        <ColonyLeafletMap />
      </div>
    </div>
  );
};
