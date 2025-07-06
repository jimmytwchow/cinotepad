import m from "mithril";
import { ListTile } from "polythene-mithril";

interface FileInputAttrs {
  title?: string;
  events?: { onchange?(e: Event): void; oncancel?(e: Event): void };
}

const FileInput: m.Component<FileInputAttrs> = {
  view(vnode) {
    return m(ListTile, {
      title: vnode.attrs.title,
      events: {
        onclick: (e: Event) => {
          const tileEl = (e.target as HTMLElement).closest("div.pe-list-tile");
          if (tileEl) {
            const el = (tileEl as HTMLElement).querySelector("input");
            if (el && el instanceof HTMLInputElement) {
              (el as HTMLInputElement).click();
            }
          }
        },
      },
      before: m("input.pe-hidden", {
        type: "file",
        accept: ".cin",
        onchange: vnode.attrs.events?.onchange ?? (() => {}),
        oncancel: vnode.attrs.events?.oncancel ?? (() => {}),
      }),
    });
  },
};

export { FileInput };
