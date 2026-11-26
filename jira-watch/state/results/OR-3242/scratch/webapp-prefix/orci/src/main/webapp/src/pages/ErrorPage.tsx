import React from "react";
import { Interstitial } from "../components/Interstitial";

const ErrorPage = () => {
  return (
    <Interstitial title="Something went wrong" tone="danger">
      <p>Please try re-launching the application.</p>
    </Interstitial>
  );
};
export default ErrorPage;
