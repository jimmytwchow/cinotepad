// type definition
type SpaceStyle = 1 | 2 | 4;
type Keynames = {
  [index: string]: string;
};
type QuickRecord = { keycode: string; candidates: string };
type CharDefRecord = { keycode: string; candidate: string };
// end of type definition

// enum
enum Status {
  INPUT,
  SELECT,
}

// actual cin class definition
class Cin {
  public constructor() {
    this.candidateList = [];
    this.currentPage = 0;
    this.maxNumOfKeys = 1;

    this.ename = "";
    this.cname = "";
    this.prompt = "";

    // init default setting
    this.selkey = "1234567890";
    this.dupsel = this.selkey.length;
    this.endkey = "";
    this.spaceStyle = 4;
    this.keepKeyCase = false;
    this.symbolKbm = false; //Not implement yet.
    this.phaseAutoSkipEndKey = false; // Unused: No implementation of phrase input
    this.flagAutoSelectByPhase = false; // Unused: No implementation of phrase input
    this.flagDispPartialMatch = false; //Not implement yet.
    this.flagDispFullMatch = false;
    this.flagVerticalSelection = false; //Not implement yet.
    this.flagPressFullAutoSend = false; //Not implement yet.
    this.flagUniqueAutoSend = false; //Not implement yet.
    // end of init default setting

    this._enable = true;
    this._status = Status.INPUT;
    this._keys = "";
  }

  // Private members declaration
  private _enable: boolean;
  private _status: Status;
  private _keys: string;
  // End of private members declaration

  // Public members declaration
  public dbName?: string;
  public db?: IDBDatabase;

  public candidateList: string[];
  public currentPage: number;
  public maxNumOfKeys: number;

  // Public members declaration (cin file fields)
  public ename: string;
  public cname: string;
  public prompt: string;
  public selkey: string;
  public dupsel: number;
  public endkey: string;
  // space style:
  // 1 for dayi, noseeing
  // 2 for simplex
  // 4 for cangjie, array (default)
  public spaceStyle: SpaceStyle;
  public keepKeyCase: boolean;
  public symbolKbm: boolean; //Not implement yet.
  public phaseAutoSkipEndKey: boolean; // Unused: No implementation of phrase input
  public flagAutoSelectByPhase: boolean; // Unused: No implementation of phrase input
  public flagDispPartialMatch: boolean; //Not implement yet.
  public flagDispFullMatch: boolean;
  public flagVerticalSelection: boolean; //Not implement yet.
  public flagPressFullAutoSend: boolean; //Not implement yet.
  public flagUniqueAutoSend: boolean; //Not implement yet.

  public keyname: Keynames = {};
  public unwrittenQuickList?: QuickRecord[];
  public unwrittenCharDefList?: CharDefRecord[];
  // End of public members declaration (cin file fields)
  // End of public members declaration

  // Public getters/setters implementation
  public set enable(v: boolean) {
    this._enable = v;
    if (!this._enable) {
      this.resetKeys();
    }
  }

  public get enable(): boolean {
    return this._enable;
  }

  public get totalPage(): number {
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

  public get currentCandidateList(): string[] {
    if (this.candidateList.length > 0) {
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
  // End of public getters/setters implementation

  // Private used method
  private _fireCandidateChange() {
    if (this.totalPage == 0) {
      this.currentPage = 0;
    } else {
      this.currentPage = 1;
    }
    if (typeof this.onCurrentCandidatesChange == "function") {
      this.onCurrentCandidatesChange(this.currentCandidateList);
    }
    if (typeof this.onCandidatesChange == "function") {
      this.onCandidatesChange(this.candidateList);
    }
  }
  // End of private used method

  // Public methods implementation
  public resetKeys() {
    this._keys = "";
    this.candidateList = [];
    this._status = Status.INPUT;
    if (typeof this.onKeynamesChange == "function") {
      this.onKeynamesChange("");
    }
    this._fireCandidateChange();
  }

  public deleteContentBackward(): boolean {
    if (this.enable) {
      if (this._status == Status.INPUT) {
        if (this._keys.length > 1) {
          const theLastKey: string = this._keys.charAt(this._keys.length - 2);
          this._keys = this._keys.substring(0, this._keys.length - 2);
          this.pushKey(theLastKey);
          return true;
        } else if (this._keys.length == 1) {
          this.resetKeys();
          return true;
        } else {
          return false;
        }
      } else if (this._status == Status.SELECT) {
        this.resetKeys();
        return true;
      } else {
        return false;
      }
    } else {
      return false;
    }
  }

  public async pushKey(key: string): Promise<void> {
    const cin: Cin = this;

    const commitText = function (text: string) {
      cin._keys = "";
      cin.candidateList = [];
      cin._status = Status.INPUT;
      if (typeof cin.onKeynamesChange == "function") {
        cin.onKeynamesChange("");
      }
      cin._fireCandidateChange();
      if (typeof cin.onCommit == "function") {
        cin.onCommit(text);
      }
    };

    if (!cin.enable || !cin.db) {
      commitText(key);
      console.log(`Commit text:${key}`);
      return;
    } else {
      console.log(`Push key:${key}`);
    }

    // lookup candidate from indexedDB
    const transaction: IDBTransaction = (cin.db as IDBDatabase).transaction([
      "quick",
      "chardef",
    ]);
    const isSpace: boolean = key == " ";
    const isEndKey: boolean = cin.endkey.indexOf(key) > -1;
    const isSelKey: boolean = cin.selkey.indexOf(key) > -1;
    const isKeyname: boolean = typeof cin.keyname[key] == "string";

    const getKeynamesFromKeys = function (keys: string): string {
      return keys
        .split("")
        .map((v) => cin.keyname[v])
        .join("");
    };

    const getCandidatesFromQuick = async function (
      keys: string
    ): Promise<string[]> {
      return new Promise<string[]>(function (resolve, reject) {
        let candidateList: string[] = [];
        transaction.objectStore("quick").get(keys).onsuccess = function (
          event: Event
        ) {
          if ((event.target as IDBRequest).result) {
            const candidatesStr = (event.target as IDBRequest).result
              .candidates;
            if (typeof candidatesStr == "string" && candidatesStr.length > 0) {
              candidateList = candidateList.concat(candidatesStr.split(""));
            }
          }
          resolve(candidateList);
        };
      });
    };

    const getCandidatesFromChardef = async function (
      keys: string
    ): Promise<string[]> {
      return new Promise<string[]>(function (resolve, reject) {
        const candidateList: string[] = [];
        transaction
          .objectStore("chardef")
          .index("keycode")
          .openCursor(IDBKeyRange.only(keys)).onsuccess = function (
          event: Event
        ) {
          const cursor = (event.target as IDBRequest).result;
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
    const originalKeys: string = cin._keys;
    const originalCandidateList: string[] = cin.candidateList;
    switch (cin._status) {
      case Status.INPUT:
        let quickCandidateList: string[] = [];
        let chardefCandidateList: string[] = [];
        cin.candidateList = [];

        if (isKeyname) {
          cin._keys += key;

          if (
            cin.flagDispFullMatch ||
            isEndKey ||
            (cin.spaceStyle == 2 && cin._keys.length == cin.maxNumOfKeys)
          ) {
            quickCandidateList = await getCandidatesFromQuick(cin._keys);

            if (quickCandidateList.length < 1) {
              chardefCandidateList = await getCandidatesFromChardef(cin._keys);
            }
          }
        } else if (isSpace) {
          chardefCandidateList = await getCandidatesFromChardef(cin._keys);
        }

        if (quickCandidateList.length > 0) {
          cin.candidateList = quickCandidateList;
        } else {
          cin.candidateList = chardefCandidateList;
        }

        if (
          typeof cin.onKeynamesChange == "function" &&
          (!isSelKey || originalCandidateList.length == 0)
        ) {
          cin.onKeynamesChange(getKeynamesFromKeys(cin._keys));
        }

        if (
          cin.flagDispFullMatch &&
          !(cin.candidateList.length == 0 && originalCandidateList.length == 0)
        ) {
          cin._fireCandidateChange();
        }

        if (
          isEndKey ||
          isSpace ||
          (cin.spaceStyle == 2 && cin._keys.length == cin.maxNumOfKeys)
        ) {
          if (cin.candidateList.length > 1) {
            if (isSpace && cin.spaceStyle == 1) {
              commitText(cin.candidateList[0]);
              return;
            } else {
              cin._status = Status.SELECT;
              if (!cin.flagDispFullMatch) {
                cin._fireCandidateChange();
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

        if (
          isSelKey &&
          originalKeys.length > 0 &&
          originalCandidateList.length > 0
        ) {
          cin._keys = originalKeys;
          cin.candidateList = originalCandidateList;
          cin._fireCandidateChange();

          let selectIndex: number = cin.selkey.indexOf(key);
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
        if (isEndKey && cin._keys.length == 1) {
          commitText(key);
          return;
        }
        // End of dirty handling

        break;

      case Status.SELECT:
        if (isSelKey) {
          let selectIndex: number = cin.selkey.indexOf(key);
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

  public previousCandidateList(): boolean {
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

  public nextCandidateList(): boolean {
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
  // End of public methods implementation

  // Overrided methods
  public onKeynamesChange(keynames: string) {}
  public onCandidatesChange(candidates: string[]) {}
  public onCurrentCandidatesChange(candidates: string[]) {}
  public onEndKey(candidates: string[]) {}
  public onCommit(text: string) {}
  // End of overrided methods
}

export { SpaceStyle, Keynames, QuickRecord, CharDefRecord, Cin };
