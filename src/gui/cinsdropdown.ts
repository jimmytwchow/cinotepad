import m from "mithril";
import iconDelete from "mmsvg/google/msvg/action/delete";
import {
  Button,
  Dialog,
  IconButton,
  List,
  ListTile,
  Menu,
} from "polythene-mithril";
import { IconButtonCSS } from "polythene-css";
import { Cin } from "../cin/cin";
import { FileInput } from "./fileinput";
import { URLInput } from "./urlinput";
import { showMessageDialog, showWaitingDialog } from "./dialog";

const ATTR_CINS_DEFAULT = [] as Cin[];

interface CinSelectedEvent extends Event {
  cin: Cin;
}

interface CinDeletedEvent extends Event {
  cin: Cin;
}

interface CinImportedEvent extends Event {
  cinID: string;
  stream: ReadableStream;
}

interface CinsDropDownAttrs {
  activeCin?: Cin;
  cins?: Cin[];
  events?: {
    oncinselected?(e: CinSelectedEvent): void;
    oncindeleted?(e: CinDeletedEvent): void;
    oncinimported?(e: CinImportedEvent): void;
  };
}

interface CinsDropDownState {
  open: boolean;
  buttonId: string;
}

IconButtonCSS.addStyle(".cinsdropdown-delete-button", {
  padding_compact: 2,
});

let buttonCnt: number = 0;

const CinsDropDown: m.Component<CinsDropDownAttrs, CinsDropDownState> = {
  oninit(vnode) {
    vnode.state.open = false;
    vnode.state.buttonId = `cins-drop-down-button-${++buttonCnt}`;
  },
  view(vnode) {
    return m("div", { style: { position: "relative" } }, [
      m(Menu, {
        target: `#${vnode.state.buttonId}`,
        show: vnode.state.open,
        didHide: (id: string) => (vnode.state.open = false),
        origin: "top",
        width: 3,
        content: m(List, {
          tiles: (() => {
            const resultTiles = (vnode.attrs.cins ?? ATTR_CINS_DEFAULT).map(
              (cin) =>
                m(ListTile, {
                  title: cin.cname,
                  events: {
                    onclick: (e: Event) => {
                      if (vnode.attrs.events?.oncinselected) {
                        const cse: CinSelectedEvent = { ...e, cin };
                        vnode.attrs.events?.oncinselected(cse);
                      }
                    },
                  },
                  secondary: {
                    content: m(IconButton, {
                      className: "cinsdropdown-delete-button",
                      icon: { svg: { content: iconDelete }, size: "small" },
                      compact: true,
                      events: {
                        onclick: (e: Event) => {
                          if (vnode.attrs.events?.oncindeleted) {
                            const cde: CinDeletedEvent = { ...e, cin };
                            vnode.attrs.events?.oncindeleted(cde);
                          }
                        },
                      },
                    }),
                  },
                })
            );
            resultTiles.push(
              m(FileInput, {
                title: "匯入CIN檔案…",
                events: {
                  onchange: (e: Event) => {
                    const btnLoadEl = e.target as HTMLInputElement;
                    if (btnLoadEl.files) {
                      const files = btnLoadEl.files as FileList;

                      if (files.length > 0) {
                        const cinFile: File = files[0];
                        if (cinFile.size > 2e6) {
                          // 2MB file size limit
                          showMessageDialog("不能上傳超過2MB的檔案");
                          return;
                        }

                        showWaitingDialog();
                        const fileReadStream: ReadableStream = cinFile.stream();
                        if (vnode.attrs.events?.oncinimported) {
                          const cie: CinImportedEvent = {
                            ...e,
                            cinID: cinFile.name,
                            stream: fileReadStream,
                          };
                          vnode.attrs.events?.oncinimported(cie);
                        }
                      }
                    }
                  },
                },
              })
            );
            resultTiles.push(
              m(URLInput, {
                title: "從URL匯入…",
                textFieldLabel: "CIN檔案的URL",
                pattern: "https{0,1}://.+/.+\\.cin",
                error: "必須輸入有效URL([http|https]://[主機]/[路徑]/*.cin)",
                mappings: [
                  {
                    pattern:
                      "^https://github.com/(.+)/(.+)/blob/(.+/.+)\\.cin$",
                    replacement: "https://cdn.jsdelivr.net/gh/$1/$2@$3.cin",
                  },
                ],
                events: {
                  onchange: (e) => {
                    showWaitingDialog();
                    fetch(e.url)
                      .then((response) => {
                        if (response.ok) {
                          if (vnode.attrs.events?.oncinimported) {
                            const cie: CinImportedEvent = {
                              ...(e as Event),
                              cinID: e.url,
                              stream: response.body,
                            };
                            vnode.attrs.events?.oncinimported(cie);
                          }
                        } else {
                          const errMsg =
                            response.status == 404
                              ? "資源不存在"
                              : `網絡回應錯誤。狀態碼: ${response.status}`;
                          Dialog.hide().then(() => showMessageDialog(errMsg));
                          m.redraw();
                        }
                      })
                      .catch((error: Error) =>
                        Dialog.hide().then(() => {
                          console.error(error);
                          showMessageDialog(error.message);
                        })
                      );
                  },
                },
              })
            );
            return resultTiles;
          })(),
        }),
      }),
      m(Button, {
        id: vnode.state.buttonId,
        label: vnode.attrs.activeCin?.cname ?? "請選擇輸入法…",
        dropdown: { open: vnode.state.open },
        events: {
          onclick: () => {
            vnode.state.open = true;
          },
        },
      }),
    ]);
  },
};

export { CinsDropDown };
