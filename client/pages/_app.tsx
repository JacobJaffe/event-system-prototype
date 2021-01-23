import React, { FunctionComponent } from "react";
import type { AppProps } from "next/app";
import "../globalStyles.css";

const MyApp: FunctionComponent<AppProps> = ({ Component, pageProps }) => (
  <div suppressHydrationWarning>
    {typeof window === "undefined" ? null : <Component {...pageProps} />}
  </div>
);

export default MyApp;
