import JSTextDecoderStream from "./jstextdecoderstream.js";
import JSLineStream from "./jslinestream.js";
import { handleSection, writeToDB } from "./cinloader.js";

// constants
const STATUS_INPUT = 0;
const STATUS_SEL = 1;

// private used functions
function _initDefaultSetting(cin) {
  cin.selkey = "1234567890";
  // cin.dupsel = cin.selkey.length;
  // cin.endkey = "";
  // space style:
  // 1 for dayi, noseeing
  // 2 for simplex
  // 4 for cangjie, array (default)
  cin.spaceStyle = 4;
  cin.keepKeyCase = false;
  cin.symbolKbm = false; //Not implement yet.
  cin.phaseAutoSkipEndKey = false; // Unused: No implementation of phrase input
  cin.flagAutoSelectByPhase = false; // Unused: No implementation of phrase input
  cin.flagDispPartialMatch = false; //Not implement yet.
  cin.flagDispFullMatch = false;
  cin.flagVerticalSelection = false; //Not implement yet.
  cin.flagPressFullAutoSend = false; //Not implement yet.
  cin.flagUniqueAutoSend = false; //Not implement yet.
}

function _fireCandidateChange(cin) {
  if (cin.totalPage == 0) {
    cin.currentPage = 0;
  } else {
    cin.currentPage = 1;
  }
  if (typeof cin.onCurrentCandidatesChange == "function") {
    cin.onCurrentCandidatesChange(cin.currentCandidateList);
  }
  if (typeof cin.onCandidatesChange == "function") {
    cin.onCandidatesChange(cin.candidateList);
  }
}

const _cin_wm = new WeakMap(); /* info holder */

// actual cin class definition
export default class Cin {
  constructor() {
    this.candidateList = [];
    this.currentPage = 0;
    this.maxNumOfKeys = 1;
    _initDefaultSetting(this);
    _cin_wm.set(this, { _enable: true, _status: STATUS_INPUT, _keys: "" });
  }

  set enable(v) {
    _cin_wm.get(this)._enable = v;
    if (!_cin_wm.get(this)._enable) {
      this.resetKeys();
    }
  }

  get enable() {
    return _cin_wm.get(this)._enable;
  }

  get totalPage() {
    if (!this.candidateList) {
      return 0;
    } else {
      let listSize = this.dupsel;
      if (this.spaceStyle == 1) {
        listSize++;
      }
      return Math.ceil(this.candidateList.length / listSize);
    }
  }

  get currentCandidateList() {
    if (this.candidateList || this.candidateList.length > 0) {
      let listSize = this.dupsel;
      if (this.spaceStyle == 1) {
        listSize++;
      }
      return this.candidateList.slice(
        (this.currentPage - 1) * listSize,
        Math.min(this.currentPage * listSize, this.candidateList.length)
      );
    } else {
      return this.candidateList;
    }
  }

  resetKeys() {
    _cin_wm.get(this)._keys = "";
    this.candidateList = [];
    _cin_wm.get(this)._status = STATUS_INPUT;
    if (typeof this.onKeynamesChange == "function") {
      this.onKeynamesChange("");
    }
    _fireCandidateChange(this);
  }

  deleteContentBackward() {
    if (this.enable) {
      if (_cin_wm.get(this)._status == STATUS_INPUT) {
        if (_cin_wm.get(this)._keys.length > 1) {
          const theLastKey = _cin_wm
            .get(this)
            ._keys.charAt(_cin_wm.get(this)._keys.length - 2);
          _cin_wm.get(this)._keys = _cin_wm
            .get(this)
            ._keys.substring(0, _cin_wm.get(this)._keys.length - 2);
          this.pushKey(theLastKey);
          return true;
        } else if (_cin_wm.get(this)._keys.length == 1) {
          this.resetKeys();
          return true;
        } else {
          return false;
        }
      } else if (_cin_wm.get(this)._status == STATUS_SEL) {
        this.resetKeys();
        return true;
      }
    } else {
      return false;
    }
  }

  async pushKey(key) {
    const cin = this;
    const commitText = function (text) {
      _cin_wm.get(cin)._keys = "";
      cin.candidateList = [];
      _cin_wm.get(cin)._status = STATUS_INPUT;
      if (typeof cin.onKeynamesChange == "function") {
        cin.onKeynamesChange("");
      }
      _fireCandidateChange(cin);
      if (typeof cin.onCommit == "function") {
        cin.onCommit(text);
      }
    };

    if (!cin.enable) {
      commitText(key);
      console.log(`Commit text:${key}`);
      return;
    } else {
      console.log(`Push key:${key}`);
    }

    // lookup candidate from indexedDB
    const transaction = cin.db.transaction(["quick", "chardef"]);
    const isSpace = key == " ";
    const isEndKey =
      typeof cin.endkey == "string" && cin.endkey.indexOf(key) > -1;
    const isSelKey =
      typeof cin.selkey == "string" && cin.selkey.indexOf(key) > -1;
    const isKeyname = typeof cin.keyname[key] == "string";

    const getKeynamesFromKeys = function (keys) {
      return keys
        .split("")
        .map((v) => cin.keyname[v])
        .join("");
    };

    const getCandidatesFromQuick = async function (keys) {
      return new Promise(function (resolve, reject) {
        const candidateList = [];
        transaction.objectStore("quick").get(keys).onsuccess = function (
          event
        ) {
          if (event.target.result) {
            const candidatesStr = event.target.result.candidates;
            if (typeof candidatesStr == "string" && candidatesStr.length > 0) {
              candidateList = candidateList.concat(candidatesStr.split(""));
            }
          }
          resolve(candidateList);
        };
      });
    };

    const getCandidatesFromChardef = async function (keys) {
      return new Promise(function (resolve, reject) {
        const candidateList = [];
        transaction
          .objectStore("chardef")
          .index("keycode")
          .openCursor(IDBKeyRange.only(keys)).onsuccess = function (event) {
          const cursor = event.target.result;
          if (cursor) {
            candidateList.push(cursor.value.candidate);
            cursor.continue();
          } else {
            resolve(candidateList);
          }
        };
      });
    };

    // start push key logic
    const originalKeys = _cin_wm.get(cin)._keys;
    const originalCandidateList = cin.candidateList;
    switch (_cin_wm.get(cin)._status) {
      case STATUS_INPUT:
        let quickCandidateList;
        let chardefCandidateList;
        cin.candidateList = undefined;

        if (isKeyname) {
          _cin_wm.get(cin)._keys += key;

          if (
            cin.flagDispFullMatch ||
            isEndKey ||
            (cin.spaceStyle == 2 &&
              _cin_wm.get(cin)._keys.length == cin.maxNumOfKeys)
          ) {
            quickCandidateList = await getCandidatesFromQuick(
              _cin_wm.get(cin)._keys
            );

            if (quickCandidateList.length < 1) {
              chardefCandidateList = await getCandidatesFromChardef(
                _cin_wm.get(cin)._keys
              );
            }
          }
        } else if (isSpace && !chardefCandidateList) {
          chardefCandidateList = await getCandidatesFromChardef(
            _cin_wm.get(cin)._keys
          );
        }

        if (quickCandidateList && quickCandidateList.length > 0) {
          cin.candidateList = quickCandidateList;
        } else {
          cin.candidateList = chardefCandidateList;
        }

        if (
          typeof cin.onKeynamesChange == "function" &&
          (!isSelKey ||
            !originalCandidateList ||
            originalCandidateList.length == 0)
        ) {
          cin.onKeynamesChange(getKeynamesFromKeys(_cin_wm.get(cin)._keys));
        }

        if (cin.flagDispFullMatch && cin.candidateList) {
          _fireCandidateChange(cin);
        }

        if (
          isEndKey ||
          isSpace ||
          (cin.spaceStyle == 2 &&
            _cin_wm.get(cin)._keys.length == cin.maxNumOfKeys)
        ) {
          if (cin.candidateList) {
            if (cin.candidateList.length > 1) {
              if (isSpace && cin.spaceStyle == 1) {
                commitText(cin.candidateList[0]);
                return;
              } else {
                _cin_wm.get(cin)._status = STATUS_SEL;
                if (!cin.flagDispFullMatch) {
                  _fireCandidateChange(cin);
                }
                if (typeof cin.onEndKey == "function") {
                  cin.onEndKey(cin.currentCandidateList);
                }
                return;
              }
            } else if (cin.candidateList.length == 1) {
              commitText(cin.candidateList[0]);
              return;
            }
          }
        }

        if (
          isSelKey &&
          originalKeys.length > 0 &&
          originalCandidateList &&
          originalCandidateList.length > 0
        ) {
          _cin_wm.get(cin)._keys = originalKeys;
          cin.candidateList = originalCandidateList;
          _fireCandidateChange(cin);

          let selectIndex = cin.selkey.indexOf(key);
          if (cin.spaceStyle == 1) {
            selectIndex++;
          }

          if (cin.currentCandidateList.length > selectIndex) {
            commitText(cin.currentCandidateList[selectIndex]);
          }
          return;
        }

        if (!isKeyname) {
          commitText(key);
          return;
        }

        // Dirty handling of endkey
        // if the mapping is not defined in cin file.
        // It should be handled in cin file.
        if (isEndKey && _cin_wm.get(cin)._keys.length == 1) {
          commitText(key);
          return;
        }
        // End of dirty handling

        break;

      case STATUS_SEL:
        if (isSelKey) {
          let selectIndex = cin.selkey.indexOf(key);
          if (cin.spaceStyle == 1) {
            selectIndex++;
          }
          if (cin.currentCandidateList.length > selectIndex) {
            commitText(cin.currentCandidateList[selectIndex]);
          }
          return;
        } else if (isSpace) {
          if (cin.totalPage > 1) {
            cin.nextCandidateList();
            return;
          } else {
            // TODO may be based on space style (e.g. cangjie), no action
            commitText(cin.currentCandidateList[0]);
            return;
          }
        } else {
          commitText(cin.currentCandidateList[0]);
          cin.pushKey(key);
          return;
        }
    }
    //end push key logic
  }

  previousCandidateList() {
    if (this.totalPage == 0) {
      this.currentPage = 0;
      return false;
    } else if (this.currentPage == 1) {
      this.currentPage = this.totalPage;
    } else {
      this.currentPage--;
    }
    if (typeof this.onCurrentCandidatesChange == "function") {
      this.onCurrentCandidatesChange(this.currentCandidateList);
    }
    return true;
  }

  nextCandidateList() {
    if (this.totalPage == 0) {
      this.currentPage = 0;
      return false;
    } else if (this.currentPage == this.totalPage) {
      this.currentPage = 1;
    } else {
      this.currentPage++;
    }
    if (typeof this.onCurrentCandidatesChange == "function") {
      this.onCurrentCandidatesChange(this.currentCandidateList);
    }
    return true;
  }

  static async load(cinID, readStream) {
    const lineReadStream = readStream
      .pipeThrough(new JSTextDecoderStream())
      .pipeThrough(new JSLineStream());
    const reader = lineReadStream.getReader();

    const dbName = `cin_${cinID}`; // TODO: use URL resource name as filename for xhr stream

    let cin = new Cin();
    cin = await handleSection(reader, cin);
    cin = await writeToDB(cin, dbName);
    return cin;
  }

  // Overrided methods
  //              onKeynamesChange(keynames) {}
  //              onCandidatesChange(candidates) {}
  //              onCurrentCandidatesChange(candidates) {}
  //              onEndKey(candidates) {}
  //              onCommit(text) {}
  // End of overrided methods
}
