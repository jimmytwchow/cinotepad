import {
  GlobalSettingOption,
  GLOBAL_SETTING_OPTION_DESC,
  GLOBAL_SETTING_SPACE_STYLE_DESC,
  DEFAULT_GLOBAL_SETTING_OPTION,
  GLOBAL_SETTING_FLAG_DISP_PARTIAL_MATCH,
  GLOBAL_SETTING_FLAG_DISP_FULL_MATCH,
  GLOBAL_SETTING_FLAG_VERTICAL_SELECTION,
  GLOBAL_SETTING_SPACE_STYLE,
  TITLE_GLOBAL_SETTING,
} from "../globalsetting";
import m from "mithril";
import iconArrowBack from "mmsvg/google/msvg/navigation/arrow-back";
import {
  Toolbar,
  ToolbarTitle,
  Dialog,
  IconButton,
  List,
  ListTile,
} from "polythene-mithril";

interface GlobalSettingOptionListAttrs {
  onChange?(newState: { event: Event; value: GlobalSettingOption }): void;
}

const GlobalSettingOptionList: m.Component<GlobalSettingOptionListAttrs> = {
  view(vnode) {
    return m(List, {
      tiles: [
        GlobalSettingOption.FOLLOW_CIN_FILE,
        GlobalSettingOption.YES,
        GlobalSettingOption.NO,
      ].map((value) =>
        m(ListTile, {
          title: GLOBAL_SETTING_OPTION_DESC[value],
          events: {
            onclick: (event: Event) => {
              if (vnode.attrs.onChange) {
                vnode.attrs.onChange({ event, value });
              }
              Dialog.hide();
            },
          },
        })
      ),
    });
  },
};

interface GlobalSettingSpaceStyleListAttrs {
  onChange?(newState: { event: Event; value: number }): void;
}

const GlobalSettingSpaceStyleList: m.Component<GlobalSettingSpaceStyleListAttrs> =
  {
    view(vnode) {
      return m(List, {
        tiles: [0, 1, 2, 4].map((value) =>
          m(ListTile, {
            title: GLOBAL_SETTING_SPACE_STYLE_DESC[value],
            events: {
              onclick: (event: Event) => {
                if (vnode.attrs.onChange) {
                  vnode.attrs.onChange({ event, value });
                }
                Dialog.hide();
              },
            },
          })
        ),
      });
    },
  };

const Setting: m.Component = {
  view(vnode) {
    return [
      m(Toolbar, { border: true }, [
        m(IconButton, {
          icon: {
            svg: { content: iconArrowBack },
          },
          element: m.route.Link,
          url: { href: "/" },
        }),
        m(ToolbarTitle, { text: "返回" }),
      ]),
      m(List, {
        border: true,
        tiles: (() => {
          const result = [
            GLOBAL_SETTING_FLAG_DISP_FULL_MATCH,
            GLOBAL_SETTING_FLAG_DISP_PARTIAL_MATCH,
            GLOBAL_SETTING_FLAG_VERTICAL_SELECTION,
          ].map((v) =>
            m(ListTile, {
              title: TITLE_GLOBAL_SETTING[v],
              subtitle:
                GLOBAL_SETTING_OPTION_DESC[
                  parseInt(
                    localStorage.getItem(v) ??
                      String(DEFAULT_GLOBAL_SETTING_OPTION)
                  )
                ],
              events: {
                onclick: () => {
                  Dialog.show({
                    menu: m(GlobalSettingOptionList, {
                      onChange: ({ value }) =>
                        localStorage.setItem(v, String(value)),
                    }),
                  });
                },
              },
            })
          );
          result.push(
            m(ListTile, {
              title: TITLE_GLOBAL_SETTING[GLOBAL_SETTING_SPACE_STYLE],
              subtitle:
                GLOBAL_SETTING_SPACE_STYLE_DESC[
                  parseInt(
                    localStorage.getItem(GLOBAL_SETTING_SPACE_STYLE) ??
                      String(DEFAULT_GLOBAL_SETTING_OPTION)
                  )
                ],
              events: {
                onclick: () => {
                  Dialog.show({
                    menu: m(GlobalSettingSpaceStyleList, {
                      onChange: ({ value }) =>
                        localStorage.setItem(
                          GLOBAL_SETTING_SPACE_STYLE,
                          String(value)
                        ),
                    }),
                  });
                },
              },
            })
          );
          return result;
        })(),
      }),
      m(Dialog),
    ];
  },
};

export { Setting };
