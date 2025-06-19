import { Cin } from "./cin";
import { loadFromStream } from "./cinloader";

if (
  document.getElementById("btn_load") &&
  document.getElementById("lbl_btn_load") &&
  document.getElementById("lbl_composing_text") &&
  document.getElementById("lbl_candidate") &&
  document.getElementById("ta_cinotepad") &&
  document.getElementById("checkbox_enable") &&
  document.getElementById("lbl_im_name")
) {
  const btnLoadEle = document.getElementById("btn_load") as HTMLInputElement;
  const lblBtnLoadEle = document.getElementById("lbl_btn_load") as HTMLElement;
  const lblComposingText = document.getElementById(
    "lbl_composing_text"
  ) as HTMLElement;
  const lblCandidateEle = document.getElementById(
    "lbl_candidate"
  ) as HTMLElement;
  const textAreaCinotepadEle = document.getElementById(
    "ta_cinotepad"
  ) as HTMLTextAreaElement;
  const checkboxEnableEle = document.getElementById(
    "checkbox_enable"
  ) as HTMLInputElement;
  const lblIMNameEle = document.getElementById("lbl_im_name") as HTMLElement;

  btnLoadEle.onchange = (e: Event) => {
    if (btnLoadEle.files) {
      const files = btnLoadEle.files as FileList;

      if (files.length > 0) {
        lblBtnLoadEle.textContent = "上傳中…";
        btnLoadEle.disabled = true;

        const cinFile: File = files[0];
        const fileReadStream: ReadableStream = cinFile.stream();

        loadFromStream(cinFile.name, fileReadStream)
          .then((cin) => {
            lblBtnLoadEle.textContent = "完成";

            cin.onKeynamesChange = function (keynames: string) {
              lblComposingText.textContent = keynames;
            };
            cin.onCurrentCandidatesChange = function (candidates: string[]) {
              // TODO: may have security problem. HTML script injection
              let innerHTML: string = "";
              let selectIndex: number;
              for (let i: number = 0; i < candidates.length; i++) {
                selectIndex = i;
                if (cin.spaceStyle == 1) {
                  selectIndex--;
                }
                innerHTML +=
                  `<span style="display:inline-block; width:1em; text-align:right;">` +
                  `${
                    selectIndex < 0 ? " " : cin.selkey.charAt(selectIndex)
                  }</span><span>${candidates[i]}</span>`;
              }
              lblCandidateEle.innerHTML = innerHTML;
            };
            cin.onCommit = function (text: string) {
              const newSelectionPos: number =
                textAreaCinotepadEle.selectionStart + text.length;
              const leftText: string = textAreaCinotepadEle.value.substring(
                0,
                textAreaCinotepadEle.selectionStart
              );
              const rightText: string = textAreaCinotepadEle.value.substring(
                textAreaCinotepadEle.selectionEnd
              );
              textAreaCinotepadEle.value = leftText + text + rightText;
              textAreaCinotepadEle.setSelectionRange(
                newSelectionPos,
                newSelectionPos
              );
            };

            lblIMNameEle.textContent = cin.cname + " ";

            textAreaCinotepadEle.onbeforeinput = function (e: InputEvent) {
              if (e.inputType == "insertText") {
                cin.pushKey(e.data as string);
                e.preventDefault();
              } else if (e.inputType == "deleteContentBackward") {
                if (cin.deleteContentBackward()) {
                  e.preventDefault();
                }
              }
            };
            textAreaCinotepadEle.onkeydown = function (e: KeyboardEvent) {
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
            };

            cin.enable = checkboxEnableEle.checked;
            checkboxEnableEle.onchange = function (e: Event) {
              cin.enable = checkboxEnableEle.checked;
            };
          })
          .catch((error: Error) => {
            btnLoadEle.disabled = false;
            Promise.reject(error);
          });
      }
    }
  };
} else {
  console.error("Some of HTML elements are not available.");
}
