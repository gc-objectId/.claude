// @ts-ignore
import logo from "../logo-footer.png";
import React from "react";
import { ReleaseNoteViewer } from "./ReleaseNoteViewer";
import DigitalClock from "./DigitalClock";
import "./Footer.scss";

function Footer({ clinical = false }: { clinical?: boolean }) {
  const year = new Date().getFullYear();

  if (clinical) {
    return (
      <footer className="mt-auto px-3 py-3 footer bg-white mt-3 fixed-bottom AppFooter">
        <div className="d-flex justify-content-between w-100 align-items-center">
          <div>
            <ReleaseNoteViewer />
            <DigitalClock />
          </div>
          <div>
            <div className="d-flex">
              <div className="small text-end me-2">
                GuidedOR recommendations are not a substitute for clinical
                judgment.
                <br />
                &copy; {year} Guided Clinical Solutions Inc.
              </div>
              <img
                src={logo}
                alt="Guided Clinical Solutions Logo"
                width={35}
                height={34}
                style={{ marginTop: "1px" }}
              />
            </div>
          </div>
        </div>
      </footer>
    );
  }

  return (
    <footer className="app-footer">
      <div className="app-footer__group">
        <ReleaseNoteViewer />
        <DigitalClock className="app-footer__clock" />
      </div>
      <div className="app-footer__group text-end">
        <span>
          GuidedOR recommendations are not a substitute for clinical judgment.
          &copy; {year} Guided Clinical Solutions Inc.
        </span>
        <img
          src={logo}
          alt="Guided Clinical Solutions Logo"
          className="app-footer__logo"
        />
      </div>
    </footer>
  );
}

export default Footer;
