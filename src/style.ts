import { styler } from "polythene-core-css";

const styles = [
  {
    body: {
      "background-color": "whitesmoke",
      padding: "0px",
      margin: "0px",
    },
    ".cinotepad-app": {
      height: ["100vh", "100dvh"],
    },
    ".cinotepad-footer": { padding: "7px" },
    ".cinotepad-cintextarea": { position: "relative", height: "100%" },
    ".cinotepad-textfield, .cinotepad-textfield *": {
      height: "100%",
    },
    ".cinotepad-candidates-button": {
      "vertical-align": "bottom",
    },
  },
];

styler.add("app_styles", styles);
