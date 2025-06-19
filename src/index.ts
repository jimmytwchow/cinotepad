import { Cin } from "./cin";
import { loadFromStream } from "./cinloader";
import m from "mithril";
import iconUpload from "mmsvg/google/msvg/file/file-upload";
import {
  IconButton,
  Button,
  TextField,
  MaterialDesignSpinner as Spinner,
  Dialog,
  onChangeTextFieldState,
} from "polythene-mithril";
import { addLayoutStyles, addTypography } from "polythene-css";

addLayoutStyles();
addTypography();

interface AppAttrs {}

interface AppState {
  activeCin?: Cin;
  btnLoadElLabel: string;
  btnLoadElDisabled: boolean;
  cinEnable: boolean;
  keynames: string;
  candidates: string[];
  onChangeTextFieldState?: onChangeTextFieldState;
}

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
      // raised: true,
      disabled: vnode.attrs.disabled ?? false,
      events: {
        onclick: (e: Event) => {
          let previousEl = (e.target as HTMLElement).previousElementSibling;
          if (previousEl && previousEl instanceof HTMLInputElement) {
            (previousEl as HTMLInputElement).click();
          } else {
            // handle the case when user clicks the label.
            previousEl = previousEl.previousElementSibling;
            if (previousEl && previousEl instanceof HTMLInputElement) {
              (previousEl as HTMLInputElement).click();
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

const App: m.Component<AppAttrs, AppState> = {
  oninit(vnode) {
    vnode.state.btnLoadElLabel = "上傳CIN檔案";
    vnode.state.btnLoadElDisabled = false;
    vnode.state.cinEnable = true;
    vnode.state.keynames = "";
    vnode.state.candidates = [];
  },
  view(vnode) {
    return [
      m(Button, {
        label: vnode.state.cinEnable ? "中" : "英",
        events: {
          onclick: (e: Event) => {
            vnode.state.cinEnable = !vnode.state.cinEnable;
            if (vnode.state.activeCin) {
              const cin = vnode.state.activeCin as Cin;
              cin.enable = vnode.state.cinEnable;
            }
          },
        },
      }),
      m(FileInput, {
        label: vnode.state.btnLoadElLabel,
        disabled: vnode.state.btnLoadElDisabled,
        events: {
          onchange: (e: Event) => {
            const btnLoadEle = e.target as HTMLInputElement;
            if (btnLoadEle.files) {
              const files = btnLoadEle.files as FileList;

              if (files.length > 0) {
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
                vnode.state.btnLoadElLabel = "上傳中…";
                vnode.state.btnLoadElDisabled = true;

                const cinFile: File = files[0];
                const fileReadStream: ReadableStream = cinFile.stream();

                loadFromStream(cinFile.name, fileReadStream)
                  .then((cin) => {
                    Dialog.hide();

                    vnode.state.activeCin = cin;

                    vnode.state.btnLoadElLabel = "完成";

                    cin.onKeynamesChange = function (keynames: string) {
                      vnode.state.keynames = keynames;
                      m.redraw();
                    };
                    cin.onCurrentCandidatesChange = function (
                      candidates: string[]
                    ) {
                      vnode.state.candidates = candidates;
                      m.redraw();
                    };
                    cin.onCommit = function (text: string) {
                      if (vnode.state.onChangeTextFieldState) {
                        const { setInputState, el: element } = vnode.state
                          .onChangeTextFieldState as onChangeTextFieldState;
                        const el = element as HTMLTextAreaElement;
                        const newSelectionPos: number =
                          el.selectionStart + text.length;
                        const leftText: string = el.value.substring(
                          0,
                          el.selectionStart
                        );
                        const rightText: string = el.value.substring(
                          el.selectionEnd
                        );
                        setInputState({
                          focus: true,
                          value: leftText + text + rightText,
                        });
                        el.setSelectionRange(newSelectionPos, newSelectionPos);
                      }
                      m.redraw();
                    };

                    cin.enable = vnode.state.cinEnable;

                    if (vnode.state.onChangeTextFieldState) {
                      const { setInputState, value } = vnode.state
                        .onChangeTextFieldState as onChangeTextFieldState;
                      setInputState({ focus: true, value });
                    }

                    m.redraw();
                  })
                  .catch((error: Error) => {
                    vnode.state.btnLoadElDisabled = false;
                    Dialog.hide();
                    m.redraw();
                    Promise.reject(error);
                  });
              }
            }
          },
        },
      }),
      m("div", { style: "min-height: 3em" }, [
        m("div", [
          m("span", vnode.state.activeCin?.cname ?? ""),
          m("span.pe-inline-block", { style: "width:1em;" }),
          m("span", vnode.state.keynames),
        ]),
        m(
          "div",
          (() => {
            const result = vnode.state.candidates
              .map((v, i) => {
                if (vnode.state.activeCin) {
                  const cin = vnode.state.activeCin as Cin;
                  if (cin.spaceStyle == 1) {
                    i--;
                  }
                  return [
                    m(
                      "span.pe-inline-block",
                      {
                        style: "width:1em; text-align:right;",
                      },
                      i < 0 ? " " : cin.selkey.charAt(i)
                    ),
                    m("span", v),
                  ];
                } else {
                  return [];
                }
              })
              .flat();
            if (vnode.state.activeCin) {
              const cin = vnode.state.activeCin as Cin;
              if (cin.totalPage > 1) {
                result.push(
                  m(
                    "a.pe-inline-block",
                    {
                      href: "#",
                      style: "width:1.5em; text-align:center;",
                      onclick: () => cin.previousCandidateList(),
                    },
                    "<"
                  )
                );
                result.push(
                  m(
                    "a.pe-inline-block",
                    {
                      href: "#",
                      style: "width:1.5em; text-align:center;",
                      onclick: () => cin.nextCandidateList(),
                    },
                    ">"
                  )
                );
              }
            }
            return result;
          })()
        ),
      ]),
      m(TextField, {
        label: "請輸入…",
        multiLine: true,
        rows: 20,
        onChange: (state: onChangeTextFieldState) => {
          vnode.state.onChangeTextFieldState = state;
        },
        events: {
          onbeforeinput: (e: InputEvent) => {
            if (vnode.state.activeCin) {
              const cin = vnode.state.activeCin as Cin;
              if (e.inputType == "insertText") {
                cin.pushKey(e.data as string);
                e.preventDefault();
              } else if (e.inputType == "deleteContentBackward") {
                if (cin.deleteContentBackward()) {
                  e.preventDefault();
                }
              }
            }
          },
          onkeydown: (e: KeyboardEvent) => {
            if (vnode.state.activeCin) {
              const cin = vnode.state.activeCin as Cin;
              if (e.key == "Escape") {
                cin.resetKeys();
                e.preventDefault();
              } else if (e.key == "PageUp") {
                if (cin.previousCandidateList()) {
                  e.preventDefault();
                }
              } else if (e.key == "PageDown") {
                if (cin.nextCandidateList()) {
                  e.preventDefault();
                }
              }
            }
          },
        },
      }),
      m(Dialog),
    ];
  },
};

m.mount((document.getElementsByTagName("body") as HTMLCollection)[0], App);
