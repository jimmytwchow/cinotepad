//import { CinLoader } from "./cinloader.js";
import CinLoader from "./cin.js";

document.getElementById("btn_load").addEventListener("change", (e) => {
  if (e.target.files.length > 0) {
    e.target.disabled = true;
    const cinFile = e.target.files[0];
    document.getElementById("lbl_btn_load").textContent = "上傳中…";
    const fileReadStream = cinFile.stream();
    CinLoader.load(cinFile.name, fileReadStream)
      .then((cin) => {
        document.getElementById("lbl_btn_load").textContent = "完成";
        cin.onKeynamesChange = function (keynames) {
          document.getElementById("lbl_composing_text").textContent = keynames;
        };
        cin.onCurrentCandidatesChange = function (candidates) {
          // TODO: may have security problem. HTML script injection
          let innerHTML = "";
          let selectIndex;
          for (let i in candidates) {
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
          document.getElementById("lbl_candidate").innerHTML = innerHTML;
        };
        cin.onCommit = function (text) {
          const textAreaEle = document.getElementById("ta_cinotepad");
          const newSelectionPos = textAreaEle.selectionStart + text.length;
          const leftText = textAreaEle.value.substring(
            0,
            textAreaEle.selectionStart
          );
          const rightText = textAreaEle.value.substring(
            textAreaEle.selectionEnd
          );
          textAreaEle.value = leftText + text + rightText;
          textAreaEle.setSelectionRange(newSelectionPos, newSelectionPos);
        };
        document.getElementById("lbl_im_name").textContent = cin.cname + " ";
        document.getElementById("ta_cinotepad").onbeforeinput = function (e) {
          if (e.inputType == "insertText") {
            cin.pushKey(e.data);
            e.preventDefault();
          } else if (e.inputType == "deleteContentBackward") {
            if (cin.deleteContentBackward()) {
              e.preventDefault();
            }
          }
        };
        document.getElementById("ta_cinotepad").onkeydown = function (e) {
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
        cin.enable = document.getElementById("checkbox_enable").checked;
        document.getElementById("checkbox_enable").onchange = function (e) {
          cin.enable = e.target.checked;
        };
      })
      .catch((error) => {
        e.target.disabled = false;
        Promise.reject(error);
      });
  }
});
