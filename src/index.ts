import "./style.ts";
import { Cin } from "./cin/cin";
import { loadFromStream } from "./cin/cinloader";
import m from "mithril";
import {
  Toolbar,
  ToolbarTitle,
  Button,
  MaterialDesignSpinner as Spinner,
  Dialog,
  onChangeTextFieldState,
} from "polythene-mithril";
import { addLayoutStyles, addTypography } from "polythene-css";
import getCaretCoordinates from "textarea-caret";
import { FileInput } from "./gui/fileinput";
import { CinTextArea } from "./gui/cintextarea";

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
  needCandidatesSizeChecking: boolean;
  onChangeTextFieldState?: onChangeTextFieldState;
}

const App: m.Component<AppAttrs, AppState> = {
  oninit(vnode) {
    vnode.state.btnLoadElLabel = "上傳CIN檔案";
    vnode.state.btnLoadElDisabled = false;
    vnode.state.cinEnable = true;
    vnode.state.keynames = "";
    vnode.state.candidates = [];
    vnode.state.needCandidatesSizeChecking = false;
  },
  view(vnode) {
    let needCandidatesSizeChecking = vnode.state.needCandidatesSizeChecking;
    vnode.state.needCandidatesSizeChecking = false;
    return [
      m(Toolbar, { border: true }, [
        m(ToolbarTitle, { text: "CINotepad" }),
        m(Button, {
          label: vnode.state.cinEnable ? "中" : "英",
          events: {
            onclick: (e: Event) => {
              vnode.state.cinEnable = !vnode.state.cinEnable;
              if (vnode.state.activeCin) {
                const cin = vnode.state.activeCin as Cin;
                cin.enable = vnode.state.cinEnable;
              }
              if (vnode.state.onChangeTextFieldState) {
                const { setInputState, value } = vnode.state
                  .onChangeTextFieldState as onChangeTextFieldState;
                setInputState({ focus: true, value });
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
                        vnode.state.needCandidatesSizeChecking = true;
                        m.redraw();
                      };
                      cin.onCurrentCandidatesChange = function (
                        candidates: string[]
                      ) {
                        vnode.state.candidates = candidates;
                        vnode.state.needCandidatesSizeChecking = true;
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
                          el.setSelectionRange(
                            newSelectionPos,
                            newSelectionPos
                          );
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
      ]),
      m(CinTextArea, {
        activeCin: vnode.state.activeCin,
        keynames: vnode.state.keynames,
        candidates: vnode.state.candidates,
        needCandidatesSizeChecking,
        onChange: (state: onChangeTextFieldState) => {
          vnode.state.onChangeTextFieldState = state;
        },
      }),
      m(Dialog),
    ];
  },
};

m.mount((document.getElementsByTagName("body") as HTMLCollection)[0], App);
