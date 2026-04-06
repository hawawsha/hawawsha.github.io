import { PiPriceProvider } from '../context/PiPriceContext';

export default function App({ Component, pageProps }) {
  return (
    <PiPriceProvider>
      <Component {...pageProps} />
    </PiPriceProvider>
  );
}
