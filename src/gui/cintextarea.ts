import { Cin } from "../cin/cin";
import m from "mithril";
import { TextField, onChangeTextFieldState } from "polythene-mithril";
import { Options as TextFieldOptions } from "polythene-core-textfield";
import getCaretCoordinates from "textarea-caret";
import { Candidates, CandidateRecord } from "./candidates";

const ATTR_KEYNAMES_DEFAULT: string = "";
const ATTR_CANDIDATES_DEFAULT: string[] = [] as string[];

interface CinTextAreaAttrs {
  activeCin?: Cin;
  keynames?: string;
  candidates?: string[];
  needCandidatesSizeChecking?: boolean;
  onChange?(state: onChangeTextFieldState): void;
}

interface CinTextAreaState {
  candidatesWidth: number;
  candidatesHeight: number;
  onChangeTextFieldState?: onChangeTextFieldState;
  prevKeynames: string;
  prevCandidates: string[];
  prevCurrentPage: number;
  prevTotalPages: number;
  prevCandidatesOffsetH: number;
  prevCandidatesOffsetV: number;
}

function getCandidatesListOffsets(
  candidatesWidth: number,
  candidatesHeight: number,
  keynames: string,
  textAreaEl?: HTMLElement,
  needCandidatesSizeChecking: boolean = false
): { offsetH: number; offsetV: number } {
  let offsetH, offsetV;

  if (
    !needCandidatesSizeChecking &&
    keynames.length > 0 &&
    textAreaEl &&
    textAreaEl instanceof HTMLTextAreaElement
  ) {
    const taEl = textAreaEl as HTMLTextAreaElement;

    const { top: taTop, width: taWidth } = taEl.getBoundingClientRect();
    const { top: caretTop, left: caretLeft } = getCaretCoordinates(
      taEl,
      taEl.selectionEnd
    );
    const { scrollTop, scrollLeft } = taEl;

    offsetH = caretLeft - scrollLeft;
    offsetV = caretTop + 36 - scrollTop;

    if (offsetH - scrollLeft + candidatesWidth > taWidth - 5) {
      offsetH = scrollLeft + taWidth - candidatesWidth - 5;
    }
    if (taTop + offsetV + candidatesHeight > window.innerHeight + 12) {
      offsetV = caretTop - scrollTop - candidatesHeight + 12;
    }
  } else {
    offsetH = 0;
    offsetV = 0;
  }
  return { offsetH, offsetV };
}

const CinTextArea: m.Component<CinTextAreaAttrs, CinTextAreaState> = {
  oninit(vnode) {
    vnode.state.candidatesWidth = 0;
    vnode.state.candidatesHeight = 0;
    vnode.state.prevKeynames = "";
    vnode.state.prevCandidates = [] as string[];
    vnode.state.prevCurrentPage = 0;
    vnode.state.prevTotalPages = 0;
    vnode.state.prevCandidatesOffsetH = 0;
    vnode.state.prevCandidatesOffsetV = 0;
  },
  onupdate(vnode) {
    if (vnode.attrs.needCandidatesSizeChecking) {
      if (vnode.dom) {
        const dom = vnode.dom as Element;
        const cardEl = dom.querySelector(".candidates-template .pe-card");
        if (cardEl && cardEl instanceof HTMLElement) {
          const { width, height } = (
            cardEl as HTMLElement
          ).getBoundingClientRect();
          vnode.state.candidatesWidth = width;
          vnode.state.candidatesHeight = height;
        }
      }
      m.redraw();
    }
  },
  view(vnode) {
    const { offsetH, offsetV } = getCandidatesListOffsets(
      vnode.state.candidatesWidth,
      vnode.state.candidatesHeight,
      vnode.attrs.keynames ?? ATTR_KEYNAMES_DEFAULT,
      vnode.state.onChangeTextFieldState?.el,
      vnode.attrs.needCandidatesSizeChecking
    );

    // construct the result Vnode
    let textFieldAttrs: TextFieldOptions = {
      id: "ta_cinotepad",
      label: "請輸入…",
      multiLine: true,
      rows: 20,
      onChange: (state: onChangeTextFieldState) => {
        vnode.state.onChangeTextFieldState = state;
        if (vnode.attrs.onChange) {
          vnode.attrs.onChange(state);
        }
      },
    };

    let childElements: m.Vnode<any, any>[] = [m(TextField, textFieldAttrs)];

    if (vnode.attrs.activeCin) {
      const cin = vnode.attrs.activeCin as Cin;

      const keynames = vnode.attrs.keynames ?? ATTR_KEYNAMES_DEFAULT;
      const candidates = vnode.attrs.candidates ?? ATTR_CANDIDATES_DEFAULT;
      const currentPage = cin.currentPage;
      const totalPages = cin.totalPage;

      const displayKeynames = vnode.attrs.needCandidatesSizeChecking
        ? vnode.state.prevKeynames
        : keynames;
      const displayCandidates = vnode.attrs.needCandidatesSizeChecking
        ? vnode.state.prevCandidates
        : candidates;
      const displayCurrentPage = vnode.attrs.needCandidatesSizeChecking
        ? vnode.state.prevCurrentPage
        : currentPage;
      const displayTotalPages = vnode.attrs.needCandidatesSizeChecking
        ? vnode.state.prevTotalPages
        : totalPages;
      const displayOffsetH = vnode.attrs.needCandidatesSizeChecking
        ? vnode.state.prevCandidatesOffsetH
        : offsetH;
      const displayOffsetV = vnode.attrs.needCandidatesSizeChecking
        ? vnode.state.prevCandidatesOffsetV
        : offsetV;

      textFieldAttrs.events = {
        onbeforeinput: (e: InputEvent) => {
          if (e.inputType == "insertText") {
            cin.pushKey(e.data as string);
            e.preventDefault();
          } else if (e.inputType == "deleteContentBackward") {
            if (cin.deleteContentBackward()) {
              e.preventDefault();
            }
          }
        },
        onkeydown: (e: KeyboardEvent) => {
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
        },
      };

      childElements.push(
        m(Candidates, {
          offsetH: String(displayOffsetH) + "px",
          offsetV: String(displayOffsetV) + "px",
          show: displayCandidates.length > 0 || displayKeynames.length > 0,
          verticalSelection: cin.flagVerticalSelection,
          imeName: cin.cname,
          keynames: displayKeynames,
          candidates: ((selkey, values, prependSpace): CandidateRecord[] =>
            values.map((v, i) => ({
              selkey:
                prependSpace && i == 0 ? " " : selkey[prependSpace ? i - 1 : i],
              candidate: v,
            })))(cin.selkey, displayCandidates, cin.spaceStyle == 1),
          currentPage: displayCurrentPage,
          totalPages: displayTotalPages,
          events: {
            onprevpage: () => cin.previousCandidateList(),
            onnextpage: () => cin.nextCandidateList(),
          },
        })
      );

      childElements.push(
        m(
          "div",
          {
            className: "candidates-template",
            style: {
              visibility: "hidden",
            },
          },
          m(Candidates, {
            offsetH: "0px",
            offsetV: "0px",
            show: candidates.length > 0 || keynames.length > 0,
            // show: true,
            verticalSelection: cin.flagVerticalSelection,
            imeName: cin.cname,
            keynames: keynames,
            candidates: ((selkey, values, prependSpace): CandidateRecord[] =>
              values.map((v, i) => ({
                selkey:
                  prependSpace && i == 0
                    ? " "
                    : selkey[prependSpace ? i - 1 : i],
                candidate: v,
              })))(cin.selkey, candidates, cin.spaceStyle == 1),
            currentPage: currentPage,
            totalPages: totalPages,
          })
        )
      );

      vnode.state.prevKeynames = keynames;
      vnode.state.prevCandidates = candidates;
      vnode.state.prevCurrentPage = currentPage;
      vnode.state.prevTotalPages = totalPages;
      vnode.state.prevCandidatesOffsetH = offsetH;
      vnode.state.prevCandidatesOffsetV = offsetV;
    }

    return m("div", { style: { position: "relative" } }, childElements);
  },
};

export { CinTextArea };
