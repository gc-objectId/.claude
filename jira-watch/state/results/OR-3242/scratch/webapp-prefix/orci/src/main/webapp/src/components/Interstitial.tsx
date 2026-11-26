import React, { ReactNode } from "react";
import "./Interstitial.scss";

type Tone = "default" | "danger" | "muted";
type Announcement = "alert" | "status";

export function Interstitial({
  title,
  tone = "default",
  role = tone === "danger" ? "alert" : undefined,
  children,
}: {
  title: ReactNode;
  tone?: Tone;
  role?: Announcement;
  children?: ReactNode;
}) {
  return (
    <div className="guided-page interstitial">
      <section
        className={`guided-panel interstitial__panel interstitial__panel--${tone}`}
        role={role}
      >
        <p className="guided-product-mark interstitial__mark">GuidedOR</p>
        <h1 className="interstitial__title">{title}</h1>
        {children && <div className="interstitial__body">{children}</div>}
      </section>
    </div>
  );
}
