import {
  GlobalSettingOption,
  GLOBAL_SETTING_FLAG_DISP_PARTIAL_MATCH,
  GLOBAL_SETTING_FLAG_DISP_FULL_MATCH,
  GLOBAL_SETTING_SPACE_STYLE,
} from "../globalsetting";

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
    this.flagDispPartialMatch = false;
    this.flagDispFullMatch = false;
    this.flagVerticalSelection = false;
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

  public candidateList: CharDefRecord[];
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
  public flagDispPartialMatch: boolean;
  public flagDispFullMatch: boolean;
  public flagVerticalSelection: boolean;
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
      if (
        Cin.getSettingValue<SpaceStyle>(
          GLOBAL_SETTING_SPACE_STYLE,
          this.spaceStyle
        ) == 1
      ) {
        listSize++;
      }
      return Math.ceil(this.candidateList.length / listSize);
    }
  }

  public get currentCandidateList(): CharDefRecord[] {
    if (this.candidateList.length > 0) {
      let listSize = this.dupsel;
      if (
        Cin.getSettingValue<SpaceStyle>(
          GLOBAL_SETTING_SPACE_STYLE,
          this.spaceStyle
        ) == 1
      ) {
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
  public static getFlagValue(globalSettingKey: string, flag: boolean): boolean {
    let returnValue: boolean;
    switch (
      parseInt(localStorage.getItem(globalSettingKey)) as GlobalSettingOption
    ) {
      case GlobalSettingOption.YES:
        returnValue = true;
        break;
      case GlobalSettingOption.NO:
        returnValue = false;
        break;
      default:
        returnValue = flag;
    }
    return returnValue;
  }

  public static getSettingValue<T extends number | string = string>(
    globalSettingKey: string,
    setting: T
  ): T {
    const globalSetting: string = localStorage.getItem(globalSettingKey);
    if (globalSetting == String(GlobalSettingOption.FOLLOW_CIN_FILE)) {
      return setting;
    } else {
      if (typeof setting == "number") {
        return parseInt(globalSetting) as T;
      } else {
        return globalSetting as T;
      }
    }
  }

  public getKeynamesFromKeys(keys: string): string {
    return keys
      .split("")
      .map((v) => this.keyname[v])
      .join("");
  }

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
    const flagDispFullMatch: boolean = Cin.getFlagValue(
      GLOBAL_SETTING_FLAG_DISP_FULL_MATCH,
      cin.flagDispFullMatch
    );
    const flagDispPartialMatch: boolean = Cin.getFlagValue(
      GLOBAL_SETTING_FLAG_DISP_PARTIAL_MATCH,
      cin.flagDispPartialMatch
    );
    const spaceStyle: SpaceStyle = Cin.getSettingValue(
      GLOBAL_SETTING_SPACE_STYLE,
      cin.spaceStyle
    );

    const getCandidatesFromQuick = async function (
      keys: string
    ): Promise<CharDefRecord[]> {
      return new Promise<CharDefRecord[]>(function (resolve, reject) {
        let candidateList: CharDefRecord[] = [];
        transaction.objectStore("quick").get(keys).onsuccess = function (
          event: Event
        ) {
          if ((event.target as IDBRequest).result) {
            const candidatesStr = (event.target as IDBRequest).result
              .candidates;
            if (typeof candidatesStr == "string" && candidatesStr.length > 0) {
              candidateList = candidateList.concat(
                candidatesStr
                  .split("")
                  .map((v) => ({ keycode: keys, candidate: v }))
              );
            }
          }
          resolve(candidateList);
        };
      });
    };

    const getCandidatesFromChardef = async function (
      keys: string,
      partialMatch: boolean = false,
      maxSize: number = 120
    ): Promise<CharDefRecord[]> {
      return new Promise<CharDefRecord[]>(function (resolve, reject) {
        const range: IDBKeyRange = partialMatch
          ? IDBKeyRange.lowerBound(keys)
          : IDBKeyRange.only(keys);
        const resultList: any[] = [];
        transaction
          .objectStore("chardef")
          .index("keycode")
          .openCursor(range).onsuccess = function (event: Event) {
          const cursor = (event.target as IDBRequest).result;
          if (
            cursor &&
            resultList.length < maxSize &&
            cursor.value.keycode.startsWith(keys)
          ) {
            const result = cursor.value;
            result.primaryKey = cursor.primaryKey;
            resultList.push(result);
            cursor.continue();
          } else {
            const candidateList: CharDefRecord[] = resultList
              .filter((v) => v.keycode == keys)
              .concat(
                resultList
                  .filter((v) => v.keycode != keys)
                  .sort(
                    (a, b) => parseInt(a.primaryKey) - parseInt(b.primaryKey)
                  )
              )
              .map((v) => ({ keycode: v.keycode, candidate: v.candidate }));
            resolve(candidateList);
          }
        };
      });
    };

    // start push key logic
    const originalKeys: string = cin._keys;
    const originalCandidateList: CharDefRecord[] = cin.candidateList;
    const originalPage: number = cin.currentPage;
    switch (cin._status) {
      case Status.INPUT:
        let quickCandidateList: CharDefRecord[] = [];
        let chardefCandidateList: CharDefRecord[] = [];
        cin.candidateList = [] as CharDefRecord[];

        if (isKeyname) {
          cin._keys += key;

          if (
            flagDispFullMatch ||
            flagDispPartialMatch ||
            isEndKey ||
            (spaceStyle == 2 && cin._keys.length == cin.maxNumOfKeys)
          ) {
            quickCandidateList = await getCandidatesFromQuick(cin._keys);

            if (quickCandidateList.length < 1) {
              chardefCandidateList = await getCandidatesFromChardef(
                cin._keys,
                flagDispPartialMatch && !isEndKey
              );
            }
          }
        } else if (isSpace && cin._keys.length > 0) {
          chardefCandidateList = await getCandidatesFromChardef(
            cin._keys,
            flagDispPartialMatch && spaceStyle == 1
          );
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
          cin.onKeynamesChange(cin.getKeynamesFromKeys(cin._keys));
        }

        if (
          (flagDispFullMatch || flagDispPartialMatch) &&
          !(cin.candidateList.length == 0 && originalCandidateList.length == 0)
        ) {
          cin._fireCandidateChange();
        }

        if (
          isEndKey ||
          isSpace ||
          (spaceStyle == 2 && cin._keys.length == cin.maxNumOfKeys)
        ) {
          if (cin.candidateList.length > 1) {
            if (isSpace && spaceStyle == 1) {
              commitText(cin.candidateList[0].candidate);
              return;
            } else {
              cin._status = Status.SELECT;
              if (!flagDispFullMatch && !flagDispPartialMatch) {
                cin._fireCandidateChange();
              }
              if (typeof cin.onEndKey == "function") {
                cin.onEndKey(cin.currentCandidateList);
              }
              return;
            }
          } else if (cin.candidateList.length == 1) {
            commitText(cin.candidateList[0].candidate);
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
          cin.currentPage = originalPage;

          let selectIndex: number = cin.selkey.indexOf(key);
          if (spaceStyle == 1) {
            selectIndex++;
          }

          if (cin.currentCandidateList.length > selectIndex) {
            commitText(cin.currentCandidateList[selectIndex].candidate);
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
          if (spaceStyle == 1) {
            selectIndex++;
          }
          if (cin.currentCandidateList.length > selectIndex) {
            commitText(cin.currentCandidateList[selectIndex].candidate);
          }
          return;
        } else if (isSpace) {
          if (cin.totalPage > 1) {
            cin.nextCandidateList();
            return;
          } else {
            // TODO may be based on space style (e.g. cangjie), no action
            commitText(cin.currentCandidateList[0].candidate);
            return;
          }
        } else {
          commitText(cin.currentCandidateList[0].candidate);
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
  public onCandidatesChange(candidates: CharDefRecord[]) {}
  public onCurrentCandidatesChange(candidates: CharDefRecord[]) {}
  public onEndKey(candidates: CharDefRecord[]) {}
  public onCommit(text: string) {}
  // End of overrided methods
}

export { SpaceStyle, Keynames, QuickRecord, CharDefRecord, Cin };
