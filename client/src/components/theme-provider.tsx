import { createContext, useContext, useEffect, useState } from "react";

type Theme = "dark" | "light";

type ThemeProviderProps = {
  children: React.ReactNode;
  defaultTheme?: Theme;
};

type ThemeProviderState = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
};

const ThemeProviderContext = createContext<ThemeProviderState>({
  theme: "light",
  setTheme: () => {},
});

export function ThemeProvider({ children }: ThemeProviderProps) {
  useEffect(() => {
    if (typeof window !== "undefined") {
      const root = window.document.documentElement;
      root.classList.remove("dark");
      root.classList.add("light");
    }
  }, []);

  return (
    <ThemeProviderContext.Provider value={{ theme: "light", setTheme: () => {} }}>
      {children}
    </ThemeProviderContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeProviderContext);
}
