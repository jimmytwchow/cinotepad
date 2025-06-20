import m from "mithril";
import { Card } from "polythene-mithril";

type CandidateRecord = { selkey: string; candidate: string };

const ATTR_OFFSET_H_DEFAULT: string = "0px";
const ATTR_OFFSET_V_DEFAULT: string = "0px";
const ATTR_SHOW_DEFAULT: boolean = false;
const ATTR_VERTICAL_SELECTION_DEFAULT: boolean = false;
const ATTR_IME_NAME_DEFAULT: string = "";
const ATTR_KEYNAMES_DEFAULT: string = "";
const ATTR_CANDIDATES_DEFAULT: CandidateRecord[] = [] as CandidateRecord[];
const ATTR_CURRENT_PAGE_DEFAULT: number = 1;
const ATTR_TOTAL_PAGES_DEFAULT: number = 1;

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
  events?: { onprevpage?(e: Event): void; onnextpage?(e: Event): void };
}

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
              content: m("div", { style: "min-height: 3em" }, [
                m("div", [
                  m("span", vnode.attrs.imeName ?? ATTR_IME_NAME_DEFAULT),
                  m("span.pe-inline-block", { style: "width:1em;" }),
                  m("span", vnode.attrs.keynames ?? ATTR_KEYNAMES_DEFAULT),
                ]),
                m(
                  "div",
                  (() => {
                    const result = vnode.attrs.candidates.map((v) =>
                      m(
                        vnode.attrs.verticalSelection ??
                          ATTR_VERTICAL_SELECTION_DEFAULT
                          ? ".pe-block"
                          : "span",
                        [
                          m(
                            "span.pe-inline-block",
                            {
                              style:
                                "width:1em; text-align:right; color: darkgrey;",
                            },
                            v.selkey
                          ),
                          m("span", v.candidate),
                        ]
                      )
                    );
                    if (
                      (vnode.attrs.totalPages ??
                      ATTR_TOTAL_PAGES_DEFAULT) > 1
                    ) {
                      result.push(
                        m(
                          "a.pe-inline-block",
                          {
                            href: "#",
                            style: "width:1.5em; text-align:center;",
                            onclick:
                              vnode.attrs.events?.onprevpage ?? (() => {}),
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
                            onclick:
                              vnode.attrs.events?.onnextpage ?? (() => {}),
                          },
                          ">"
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
