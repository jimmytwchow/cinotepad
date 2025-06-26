import m from "mithril";
import { Button, List, ListTile, Menu } from "polythene-mithril";
import { Cin } from "../cin/cin";

const ATTR_CINS_DEFAULT = [] as Cin[];

interface CinSelectedEvent extends Event {
  cin: Cin;
}

interface CinsDropDownAttrs {
  activeCin?: Cin;
  cins?: Cin[];
  events?: {
    oncinselected?(e: CinSelectedEvent): void;
  };
}

interface CinsDropDownState {
  open: boolean;
  buttonId: string;
}

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
          tiles: (vnode.attrs.cins ?? ATTR_CINS_DEFAULT).map((cin) =>
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
            })
          ),
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
