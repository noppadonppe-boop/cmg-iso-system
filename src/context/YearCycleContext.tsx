import React, { createContext, useContext, useState, useEffect } from "react";
import type { YearCycle } from "@/lib/types";
import { getYearCycles } from "@/lib/db";

type YearCycleContextType = {
  yearCycles: YearCycle[];
  selectedYear: YearCycle | null;
  setSelectedYear: (yc: YearCycle) => void;
  isLoading: boolean;
  refresh: () => void;
};

const YearCycleContext = createContext<YearCycleContextType | undefined>(undefined);

export function YearCycleProvider({ children }: { children: React.ReactNode }) {
  const [yearCycles, setYearCycles] = useState<YearCycle[]>([]);
  const [selectedYear, setSelectedYear] = useState<YearCycle | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  async function fetchYearCycles() {
    setIsLoading(true);
    try {
      const data = await getYearCycles();
      setYearCycles(data);
      const active = data.find((yc) => yc.isActive) ?? data[0] ?? null;
      setSelectedYear(prev => prev ? (data.find(y => y.id === prev.id) ?? active) : active);
    } catch (err) {
      console.error("Failed to fetch year cycles", err);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => { fetchYearCycles(); }, []);

  return (
    <YearCycleContext.Provider
      value={{ yearCycles, selectedYear, setSelectedYear, isLoading, refresh: fetchYearCycles }}
    >
      {children}
    </YearCycleContext.Provider>
  );
}

export function useYearCycle() {
  const ctx = useContext(YearCycleContext);
  if (!ctx) throw new Error("useYearCycle must be used inside YearCycleProvider");
  return ctx;
}
