import m from "mithril";
import { vars } from "polythene-theme";
import iconKeyboardArrowUp from "mmsvg/google/msvg/hardware/keyboard-arrow-up";
import iconKeyboardArrowDown from "mmsvg/google/msvg/hardware/keyboard-arrow-down";
import { Button, Card, Icon, SVG } from "polythene-mithril";
import { ButtonCSS } from "polythene-css";

type CandidateRecord = { selkey: string; candidate: string; keynames: string };

const ATTR_OFFSET_H_DEFAULT: string = "0px";
const ATTR_OFFSET_V_DEFAULT: string = "0px";
const ATTR_SHOW_DEFAULT: boolean = false;
const ATTR_VERTICAL_SELECTION_DEFAULT: boolean = false;
const ATTR_IME_NAME_DEFAULT: string = "";
const ATTR_KEYNAMES_DEFAULT: string = "";
const ATTR_CANDIDATES_DEFAULT = [] as CandidateRecord[];
const ATTR_CURRENT_PAGE_DEFAULT: number = 1;
const ATTR_TOTAL_PAGES_DEFAULT: number = 1;

interface CandidateSelectedEvent extends Event {
  selkey: string;
  candidate: string;
}

interface CandidatesAttrs {
  offsetH?: string;
  offsetV?: string;
  show?: boolean;
  verticalSelection?: boolean;
  imeName?: string;
  keynames?: string;
  candidates?: CandidateRecord[];
  currentPage?: number;
  totalPages?: number;
  events?: {
    oncandidateselected?(e: CandidateSelectedEvent): void;
    onprevpage?(e: Event): void;
    onnextpage?(e: Event): void;
  };
}

ButtonCSS.addStyle(".cinotepad-candidates-button", {
  min_width: 2 * vars.grid_unit_component,
  padding_h: 0.5 * vars.grid_unit,
  text_transform: "none",
  outer_padding_v: 1,
});

const Candidates: m.Component<CandidatesAttrs> = {
  view(vnode) {
    return m(
      ".pe-absolute" +
        (vnode.attrs.show ?? ATTR_SHOW_DEFAULT ? "" : ".pe-hidden"),
      {
        style: {
          "z-index": "999",
          top: vnode.attrs.offsetV ?? ATTR_OFFSET_V_DEFAULT,
          left: vnode.attrs.offsetH ?? ATTR_OFFSET_H_DEFAULT,
        },
      },
      m(Card, {
        content: [
          {
            text: {
              content: m("div", { style: { "min-height": "3em" } }, [
                m("div.layout", [
                  m("span", vnode.attrs.imeName ?? ATTR_IME_NAME_DEFAULT),
                  m("span.pe-inline-block", { style: { width: "1em" } }),
                  m(
                    "span.flex.one",
                    vnode.attrs.keynames ?? ATTR_KEYNAMES_DEFAULT
                  ),
                  m("span.pe-inline-block", { style: { width: "1em" } }),
                  m(
                    "span",
                    vnode.attrs.totalPages > 1
                      ? `(${vnode.attrs.currentPage}/${vnode.attrs.totalPages})`
                      : ""
                  ),
                ]),
                m(
                  "div",
                  (() => {
                    const result = vnode.attrs.candidates.map((v) =>
                      m(
                        Button,
                        {
                          className:
                            "cinotepad-candidates-button " +
                            (vnode.attrs.verticalSelection ??
                            ATTR_VERTICAL_SELECTION_DEFAULT
                              ? "pe-block"
                              : "pe-inline"),
                          events: {
                            onclick: (e: Event) => {
                              if (vnode.attrs.events?.oncandidateselected) {
                                const cse: CandidateSelectedEvent = {
                                  ...e,
                                  selkey: v.selkey,
                                  candidate: v.candidate,
                                };
                                vnode.attrs.events?.oncandidateselected(cse);
                              }
                            },
                          },
                        },
                        [
                          m(
                            "span.pe-inline-block",
                            {
                              style: {
                                width: "1em",
                                "text-align": "right",
                                color: "darkgrey",
                              },
                            },
                            v.selkey
                          ),
                          m("span", {
                            style: {
                              width: vnode.attrs.verticalSelection
                                ? "1em"
                                : "auto",
                            },
                          }),
                          m(
                            "span.flex.one",
                            { style: { "text-align": "left" } },
                            v.candidate
                          ),
                          m(
                            "span",
                            {
                              style: {
                                "font-size": "x-small",
                                color: "lightblue",
                              },
                            },
                            v.keynames.replace(vnode.attrs.keynames, "")
                          ),
                        ]
                      )
                    );
                    if (
                      (vnode.attrs.totalPages ?? ATTR_TOTAL_PAGES_DEFAULT) > 1
                    ) {
                      result.push(
                        m(
                          Button,
                          {
                            className: "cinotepad-candidates-button",
                            events: {
                              onclick:
                                vnode.attrs.events?.onprevpage ?? (() => {}),
                            },
                          },
                          m(
                            Icon,
                            { size: "small" },
                            m(SVG, iconKeyboardArrowUp)
                          )
                        )
                      );
                      result.push(
                        m(
                          Button,
                          {
                            className: "cinotepad-candidates-button",
                            events: {
                              onclick:
                                vnode.attrs.events?.onnextpage ?? (() => {}),
                            },
                          },
                          m(
                            Icon,
                            { size: "small" },
                            m(SVG, iconKeyboardArrowDown)
                          )
                        )
                      );
                    }
                    return result;
                  })()
                ),
              ]),
            },
          },
        ],
      })
    );
  },
};

export { Candidates, CandidateRecord };
