import { State } from "../state";
import { Cin, CharDefRecord } from "../cin/cin";
import { loadFromStream, deleteFromDB } from "../cin/cinloader";
import m from "mithril";
import iconSettings from "mmsvg/google/msvg/action/settings";
import iconGitHub from "mmsvg/templarian/msvg/github";
import {
  Toolbar,
  ToolbarTitle,
  Button,
  IconButton,
  Dialog,
  onChangeTextFieldState,
} from "polythene-mithril";
import { CinsDropDown } from "../gui/cinsdropdown";
import { CinTextArea } from "../gui/cintextarea";
import { showMessageDialog } from "../gui/dialog";

interface AppAttrs {
  state: State;
}

interface AppState {
  needCandidatesSizeChecking: boolean;
  onChangeTextFieldState?: onChangeTextFieldState;
}

function initCinEventHandlers(
  cin: Cin,
  vnode: m.Vnode<AppAttrs, AppState>
): void {
  cin.onKeynamesChange = function (keynames: string) {
    vnode.attrs.state.keynames = keynames;
    vnode.state.needCandidatesSizeChecking = true;
    m.redraw();
  };

  cin.onCurrentCandidatesChange = function (candidates: CharDefRecord[]) {
    vnode.attrs.state.candidates = candidates;
    vnode.state.needCandidatesSizeChecking = true;
    m.redraw();
  };

  cin.onCommit = function (text: string) {
    if (vnode.state.onChangeTextFieldState) {
      const { setInputState, el: element } = vnode.state
        .onChangeTextFieldState as onChangeTextFieldState;
      const el = element as HTMLTextAreaElement;
      const newSelectionPos: number = el.selectionStart + text.length;
      const leftText: string = el.value.substring(0, el.selectionStart);
      const rightText: string = el.value.substring(el.selectionEnd);
      setInputState({
        focus: true,
        value: leftText + text + rightText,
      });
      el.setSelectionRange(newSelectionPos, newSelectionPos);
      m.redraw();
    }
  };
}

function focusTextField(vnode: m.Vnode<AppAttrs, AppState>) {
  if (vnode.state.onChangeTextFieldState) {
    const { setInputState, value } = vnode.state
      .onChangeTextFieldState as onChangeTextFieldState;
    setInputState({ focus: true, value });
  }
}

const App: m.Component<AppAttrs, AppState> = {
  oninit(vnode) {
    vnode.state.needCandidatesSizeChecking = false;
    for (let cin of vnode.attrs.state.cins) {
      initCinEventHandlers(cin, vnode);
      cin.enable = vnode.attrs.state.cinEnable;
    }
  },
  view(vnode) {
    let needCandidatesSizeChecking = vnode.state.needCandidatesSizeChecking;
    vnode.state.needCandidatesSizeChecking = false;
    return [
      m(".cinotepad-app.layout.vertical", [
        m(Toolbar, { className: "cinotepad-toolbar", border: true }, [
          m(ToolbarTitle, { text: "CINotepad" }),
          m(CinsDropDown, {
            activeCin: vnode.attrs.state.activeCin,
            cins: vnode.attrs.state.cins,
            events: {
              oncinselected: (e) => {
                vnode.attrs.state.activeCin = e.cin;
                vnode.attrs.state.activeCin.enable =
                  vnode.attrs.state.cinEnable;
                focusTextField(vnode);
              },
              oncindeleted: (e) => {
                deleteFromDB(e.cin).catch((err: Error) => {
                  showMessageDialog(err.message);
                  console.error(err);
                });
                vnode.attrs.state.cins.splice(
                  vnode.attrs.state.cins.indexOf(e.cin),
                  1
                );
                if (vnode.attrs.state.activeCin == e.cin) {
                  delete vnode.attrs.state.activeCin;
                }
                focusTextField(vnode);
              },
              oncinimported: (e) => {
                loadFromStream(e.cinID, e.stream)
                  .then((cin) => {
                    Dialog.hide();

                    vnode.attrs.state.activeCin = cin;
                    vnode.attrs.state.cins.push(cin);

                    initCinEventHandlers(cin, vnode);

                    cin.enable = vnode.attrs.state.cinEnable;

                    focusTextField(vnode);

                    m.redraw();
                  })
                  .catch((err: Error) => {
                    Dialog.hide().then(() => {
                      showMessageDialog(err.message);
                      console.error(err);
                    });
                  });
              },
            },
          }),
          m(Button, {
            className: "cinotepad-toolbar-button",
            label: vnode.attrs.state.cinEnable ? "中" : "英",
            events: {
              onclick: (e: Event) => {
                vnode.attrs.state.cinEnable = !vnode.attrs.state.cinEnable;
                if (vnode.attrs.state.activeCin) {
                  const cin = vnode.attrs.state.activeCin as Cin;
                  cin.enable = vnode.attrs.state.cinEnable;
                }
                focusTextField(vnode);
              },
            },
          }),
          m(IconButton, {
            className: "cinotepad-toolbar-icon-button",
            icon: {
              svg: { content: iconSettings },
            },
            element: m.route.Link,
            url: { href: "/setting" },
          }),
        ]),
        m(CinTextArea, {
          activeCin: vnode.attrs.state.activeCin,
          keynames: vnode.attrs.state.keynames,
          candidates: vnode.attrs.state.candidates,
          needCandidatesSizeChecking,
          onChange: (state: onChangeTextFieldState) => {
            if (!vnode.state.onChangeTextFieldState) {
              const { setInputState, el: element } = state;
              const el = element as HTMLTextAreaElement;
              setInputState({
                focus: true,
                value: vnode.attrs.state.textContent,
              });
              el.setSelectionRange(
                vnode.attrs.state.selectionPos,
                vnode.attrs.state.selectionPos
              );
              el.onselectionchange = () => {
                vnode.attrs.state.selectionPos = el.selectionStart;
              };
            }
            vnode.state.onChangeTextFieldState = state;
            vnode.attrs.state.textContent = state.value;
          },
        }),
        m(".cinotepad-footer.flex.none.layout", [
          m(".flex.one.self-center", [
            "© 2025 jimmytwchow. CINotepad is licensed under ",
            m(
              "a",
              {
                href: "https://github.com/jimmytwchow/cinotepad/blob/main/LICENSE",
                target: "_blank",
              },
              "MIT License"
            ),
            ".",
          ]),
          m(".flex.none.self-center", "Repository: "),
          m(IconButton, {
            className: "cinotepad-toolbar-icon-button",
            icon: {
              svg: { content: iconGitHub },
              size: "small",
            },
            compact: true,
            element: "a[target='_blank']",
            url: {
              href: "https://github.com/jimmytwchow/cinotepad",
            },
          }),
        ]),
      ]),
      m(Dialog),
    ];
  },
};

export { App };
