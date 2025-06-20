import m from "mithril";
import iconUpload from "mmsvg/google/msvg/file/file-upload";
import { IconButton } from "polythene-mithril";

interface FileInputAttrs {
  label?: string;
  disabled?: boolean;
  events?: { onchange?(e: Event): void; oncanel?(e: Event): void };
}

const FileInput: m.Component<FileInputAttrs> = {
  view(vnode) {
    return m(IconButton, {
      icon: { svg: { content: iconUpload } },
      label: vnode.attrs.label,
      disabled: vnode.attrs.disabled ?? false,
      events: {
        onclick: (e: Event) => {
          let previousEl = (e.target as HTMLElement).previousElementSibling;
          if (previousEl) {
            if (previousEl instanceof HTMLInputElement) {
              (previousEl as HTMLInputElement).click();
            } else {
              // handle the case when user clicks the label.
              previousEl = previousEl.previousElementSibling;
              if (previousEl && previousEl instanceof HTMLInputElement) {
                (previousEl as HTMLInputElement).click();
              }
            }
          }
        },
      },
      before: m("input.pe-hidden", {
        type: "file",
        onchange: vnode.attrs.events?.onchange ?? (() => {}),
      }),
    });
  },
};

export { FileInput };
