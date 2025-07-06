import m from "mithril";
import {
  Button,
  Dialog,
  MaterialDesignSpinner as Spinner,
  TextField,
} from "polythene-mithril";

function showMessageDialog(message: string) {
  Dialog.show({
    backdrop: true,
    body: message,
    footerButtons: m(Button, {
      label: "關閉",
      events: {
        onclick: () => Dialog.hide(),
      },
    }),
  });
}

function showWaitingDialog() {
  Dialog.show({
    backdrop: true,
    modal: true,
    disableEscape: true,
    title: "載入中，請等候…",
    body: m(
      "div",
      { style: { height: "60px" } },
      m(Spinner, {
        style: { margin: "auto" },
        permanent: true,
        size: "large",
      })
    ),
  });
}

export { showMessageDialog, showWaitingDialog };
