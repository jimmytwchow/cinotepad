import { rgba, styler } from "polythene-core-css";
import { ButtonCSS, IconButtonCSS, ToolbarCSS } from "polythene-css";
import { vars } from "polythene-theme";

const toolbar_color_light_text: string = vars.color_light_background;
const toolbar_color_light_background: string = "255, 0, 127"; //pink

const styles = [
  {
    body: {
      "background-color": rgba(vars.color_light_background),
      padding: "0px",
      margin: "0px",
    },
    ".cinotepad-app": {
      height: ["100vh", "100dvh"],
    },
    ".cinotepad-footer": {
      "background-color": rgba(toolbar_color_light_background),
      color: rgba(toolbar_color_light_text, vars.blend_light_text_primary),
      padding: "7px",
      "margin-top": "7px",
    },
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

ButtonCSS.addStyle(".cinotepad-toolbar-button", {
  color_light_text: rgba(
    toolbar_color_light_text,
    vars.blend_light_text_primary
  ),
  color_light_icon: rgba(
    toolbar_color_light_text,
    vars.blend_light_text_primary
  ),
});

IconButtonCSS.addStyle(".cinotepad-toolbar-icon-button", {
  color_light: rgba(toolbar_color_light_text, vars.blend_light_text_primary),
});

ToolbarCSS.addStyle(".cinotepad-toolbar", {
  color_light_text: rgba(
    toolbar_color_light_text,
    vars.blend_light_text_primary
  ),
  color_light_background: rgba(toolbar_color_light_background),
});
