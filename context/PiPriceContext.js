
import { createContext, useContext, useState, useEffect } from 'react';

const PiPriceContext = createContext();

export function PiPriceProvider({ children }) {
  const [piPrice, setPiPrice] = useState(null);

  useEffect(() => {
    const fetchPrice = async () => {
      try {
        const res = await fetch('/api/pi-price');
        const data = await res.json();
        if (data.price) setPiPrice(data.price);
      } catch (err) {
        console.error('Price fetch failed', err);
      }
    };

    fetchPrice();
    const interval = setInterval(fetchPrice, 600000);
    return () => clearInterval(interval);
  }, []);

  return (
    <PiPriceContext.Provider value={piPrice}>
      {children}
    </PiPriceContext.Provider>
  );
}

export const usePiPrice = () => useContext(PiPriceContext);
