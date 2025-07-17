import "./style";
import { initDefaultGlobalSettings } from "./globalsetting";
import { loadAllFromDB } from "./cin/cinloader";
import { state } from "./state";
import { App } from "./page/app";
import { Setting } from "./page/setting";
import m from "mithril";
import { addLayoutStyles, addTypography } from "polythene-css";

addLayoutStyles();
addTypography();

initDefaultGlobalSettings();

loadAllFromDB().then((cins) => {
  state.cins = cins;
  m.route(document.body, "/", {
    "/": { view: () => m(App, { state }) },
    "/setting": Setting,
  });
});

// Register service worker
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("./service-worker.js")
      .then((registration) => console.log("SW registered."))
      .catch((registrationError) =>
        console.error("SW registration failed: ", registrationError)
      );
  });
}
