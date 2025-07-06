import m from "mithril";
import { Button, Dialog, ListTile, TextField } from "polythene-mithril";

interface URLChangedEvent extends Event {
  url: string;
}

interface URLInputAttrs {
  title?: string;
  textFieldLabel?: string;
  pattern?: string;
  error?: string;
  mappings?: { pattern: string; replacement: string }[];
  events?: { onchange?(e: URLChangedEvent): void; oncancel?(e: Event): void };
}

interface URLInputState {
  uploadURL: { value: string; valid: boolean };
}

const URLInput: m.Component<URLInputAttrs, URLInputState> = {
  oninit(vnode) {
    vnode.state.uploadURL = { value: "", valid: false };
  },
  view(vnode) {
    return m(ListTile, {
      title: vnode.attrs.title,
      events: {
        onclick: (event: Event) => {
          vnode.state.uploadURL = { value: "", valid: false };
          Dialog.show(() => ({
            backdrop: true,
            body: m(TextField, {
              label: vnode.attrs.textFieldLabel,
              floatingLabel: true,
              required: true,
              type: "url",
              pattern: vnode.attrs.pattern,
              error: vnode.attrs.error,
              onChange: (newState) => {
                vnode.state.uploadURL = {
                  value: newState.value,
                  valid: !newState.invalid,
                };
              },
            }),
            footerButtons: [
              m(Button, {
                label: "取消",
                events: {
                  onclick: (e: Event) => {
                    Dialog.hide().then(() =>
                      (vnode.attrs.events?.oncancel ?? ((e: Event) => {}))(e)
                    );
                  },
                },
              }),
              m(Button, {
                label: "匯入",
                disabled: !vnode.state.uploadURL.valid,
                events: {
                  onclick: (e: Event) => {
                    if (vnode.state.uploadURL.valid) {
                      Dialog.hide().then(() => {
                        if (vnode.attrs.events?.onchange) {
                          let url = vnode.state.uploadURL.value;
                          if (vnode.attrs.mappings) {
                            for (let mapping of vnode.attrs.mappings ?? []) {
                              url = vnode.state.uploadURL.value.replace(
                                new RegExp(mapping.pattern),
                                mapping.replacement
                              );
                              if (url != vnode.state.uploadURL.value) {
                                break;
                              }
                            }
                          }
                          const uce: URLChangedEvent = {
                            ...e,
                            url,
                          };
                          vnode.attrs.events?.onchange(uce);
                        }
                      });
                    }
                  },
                },
              }),
            ],
          }));
        },
      },
    });
  },
};

export { URLInput };
