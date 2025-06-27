import JSTextDecoderStream from "../stream/jstextdecoderstream";
import JSLineStream from "../stream/jslinestream";
import { SpaceStyle, Keynames, QuickRecord, CharDefRecord, Cin } from "./cin";

function indexOfWhiteSpace(line: string): number {
  let wspIdx: number;
  const spIdx: number = line.indexOf(" ");
  const tabIdx: number = line.indexOf("\t");
  if (tabIdx == -1 || (spIdx > -1 && spIdx < tabIdx)) {
    wspIdx = spIdx;
  } else {
    wspIdx = tabIdx;
  }
  return wspIdx;
}

function handleComment(line: string): string {
  let i: number = line.indexOf("#");
  if (i > -1) {
    line = line.substring(0, i).trim();
  }
  return line;
}

async function handleKeynameSection(
  reader: ReadableStreamDefaultReader,
  cin: Cin
): Promise<Cin> {
  const { done, value }: ReadableStreamReadResult<any> = await reader.read();
  if (done) {
    return cin;
  } else {
    if (value) {
      const line = value as string;
      if (line.length > 0) {
        if (line.startsWith("%keyname end")) {
          return cin;
        } else if (line.startsWith(" # ") && line.length > 3) {
          cin.keyname["#"] = line.substring(3);
        } else {
          const whitespaceIndex: number = indexOfWhiteSpace(line);
          if (whitespaceIndex > 0 && whitespaceIndex < line.length - 1) {
            cin.keyname[line.substring(0, whitespaceIndex)] = line
              .substring(whitespaceIndex + 1)
              .trim();
          }
        }
      }
    }
    return await handleKeynameSection(reader, cin);
  }
}

async function handleQuickSection(
  reader: ReadableStreamDefaultReader,
  cin: Cin
): Promise<Cin> {
  const { done, value }: ReadableStreamReadResult<any> = await reader.read();
  if (done) {
    return cin;
  } else {
    if (value) {
      const line = value as string;
      let keycode: string, candidates: string;
      if (line.length > 0 && cin.unwrittenQuickList) {
        const unwrittenQuickList = cin.unwrittenQuickList as QuickRecord[];
        if (line.startsWith("%quick end")) {
          return cin;
        } else if (line.startsWith(" # ") && line.length > 3) {
          keycode = "#";
          candidates = line.substring(3).trim();
          unwrittenQuickList.push({ keycode, candidates });
        } else {
          const whitespaceIndex: number = indexOfWhiteSpace(line);
          if (whitespaceIndex > 0 && whitespaceIndex < line.length - 1) {
            keycode = line.substring(0, whitespaceIndex);
            candidates = line.substring(whitespaceIndex + 1).trim();
            unwrittenQuickList.push({ keycode, candidates });
            cin.maxNumOfKeys = Math.max(cin.maxNumOfKeys, keycode.length);
          }
        }
      }
    }
    return await handleQuickSection(reader, cin);
  }
}

async function handleCharDefSection(
  reader: ReadableStreamDefaultReader,
  cin: Cin
): Promise<Cin> {
  const { done, value }: ReadableStreamReadResult<any> = await reader.read();
  if (done) {
    return cin;
  } else {
    if (value) {
      const line = value as string;
      let keycode: string, candidate: string;
      if (line.length > 0 && cin.unwrittenCharDefList) {
        const unwrittenCharDefList =
          cin.unwrittenCharDefList as CharDefRecord[];
        if (line.startsWith("%chardef end")) {
          return cin;
        } else if (line.startsWith(" # ") && line.length > 3) {
          keycode = "#";
          candidate = line.substring(3).trim();
          unwrittenCharDefList.push({ keycode, candidate });
        } else {
          const whitespaceIndex: number = indexOfWhiteSpace(line);
          if (whitespaceIndex > 0 && whitespaceIndex < line.length - 1) {
            keycode = line.substring(0, whitespaceIndex);
            candidate = line.substring(whitespaceIndex + 1).trim();
            unwrittenCharDefList.push({ keycode, candidate });
            cin.maxNumOfKeys = Math.max(cin.maxNumOfKeys, keycode.length);
          }
        }
      }
    }
    return await handleCharDefSection(reader, cin);
  }
}

async function handleSection(
  reader: ReadableStreamDefaultReader,
  cin: Cin
): Promise<Cin> {
  const { done, value }: ReadableStreamReadResult<any> = await reader.read();
  if (done) {
    if (cin.dupsel < 0 || isNaN(cin.dupsel)) {
      cin.dupsel = cin.selkey.length;
    }
    if (!cin.keepKeyCase) {
      const oldKeyname: Keynames = cin.keyname;
      cin.keyname = {};
      for (let key in oldKeyname) {
        cin.keyname[key.toLowerCase()] = oldKeyname[key];
      }
      if (cin.unwrittenQuickList) {
        const unwrittenQuickList = cin.unwrittenQuickList as QuickRecord[];
        for (let i = 0; i < unwrittenQuickList.length; i++) {
          unwrittenQuickList[i].keycode =
            unwrittenQuickList[i].keycode.toLowerCase();
        }
      }
      if (cin.unwrittenCharDefList) {
        const unwrittenCharDefList =
          cin.unwrittenCharDefList as CharDefRecord[];
        for (let i = 0; i < unwrittenCharDefList.length; i++) {
          unwrittenCharDefList[i].keycode =
            unwrittenCharDefList[i].keycode.toLowerCase();
        }
      }
    }
    return cin;
  } else {
    if (value) {
      let line = value as string;
      line = handleComment(line);
      if (line.length > 0) {
        if (line.startsWith("%gen_inp")) {
          // temporarily unused (means general input module)
        } else if (line.startsWith("%ename ")) {
          cin.ename = line.substring("%ename ".length);
        } else if (line.startsWith("%cname ")) {
          cin.cname = line.substring("%cname ".length);
        } else if (line.startsWith("%prompt ")) {
          cin.prompt = line.substring("%prompt ".length);
        } else if (line.startsWith("%selkey ")) {
          cin.selkey = line.substring("%selkey ".length);
        } else if (line.startsWith("%dupsel ")) {
          cin.dupsel = parseInt(line.substring("%dupsel ".length)); //e.g. %dupsel 9
        } else if (line.startsWith("%endkey ")) {
          cin.endkey = line.substring("%endkey ".length);
        } else if (line.startsWith("%space_style ")) {
          let spaceStyle = parseInt(line.substring("%space_style ".length));
          if ([1, 2, 4].indexOf(spaceStyle) < 0) {
            cin.spaceStyle = 4;
          } else {
            cin.spaceStyle = spaceStyle as SpaceStyle;
          }
        } else if (line.startsWith("%keep_key_case")) {
          cin.keepKeyCase = true;
        } else if (line.startsWith("%symbol_kbm")) {
          cin.symbolKbm = true;
        } else if (line.startsWith("%phase_auto_skip_endkey")) {
          cin.phaseAutoSkipEndKey = true;
        } else if (line.startsWith("%flag_auto_select_by_phrase")) {
          cin.flagAutoSelectByPhase = true;
        } else if (line.startsWith("%flag_disp_partial_match")) {
          cin.flagDispPartialMatch = true;
        } else if (line.startsWith("%flag_disp_full_match")) {
          cin.flagDispFullMatch = true;
        } else if (line.startsWith("%flag_vertical_selection")) {
          cin.flagVerticalSelection = true;
        } else if (line.startsWith("%flag_press_full_auto_send")) {
          cin.flagPressFullAutoSend = true;
        } else if (line.startsWith("%flag_unique_auto_send")) {
          cin.flagUniqueAutoSend = true;
        } else if (line.startsWith("%keyname begin")) {
          cin.keyname = {};
          cin = await handleKeynameSection(reader, cin);
        } else if (line.startsWith("%quick begin")) {
          cin.unwrittenQuickList = [];
          cin = await handleQuickSection(reader, cin);
        } else if (line.startsWith("%chardef begin")) {
          cin.unwrittenCharDefList = [];
          cin = await handleCharDefSection(reader, cin);
        }
      }
    }
    return await handleSection(reader, cin);
  }
}

async function writeToDB(cin: Cin, dbName: string): Promise<Cin> {
  // Open database first
  let db: IDBDatabase = await new Promise<IDBDatabase>((resolve, reject) => {
    let openReq: IDBOpenDBRequest = indexedDB.open(dbName);
    openReq.onsuccess = function (event) {
      resolve(openReq.result as IDBDatabase);
    };
    openReq.onupgradeneeded = function (event) {
      // TODO only create store when it is not created.
      // TODO may need to check version for further updates.
      const db: IDBDatabase = openReq.result;
      let objS: IDBObjectStore = db.createObjectStore("settings", {
        keyPath: "name",
      });
      objS = db.createObjectStore("keyname", { keyPath: "key" });
      objS = db.createObjectStore("quick", { keyPath: "keycode" });
      objS = db.createObjectStore("chardef", { autoIncrement: true });
      objS.createIndex("keycode", "keycode", { unique: false });
    };
    openReq.onerror = function () {
      reject(`Cannot open IndexedDB for the file ${dbName}`);
    };
  });

  cin.db = db;
  cin.dbName = dbName;

  // trunc tables if they exist
  await new Promise<void>((resolve, reject) => {
    let transaction: IDBTransaction = db.transaction(
      ["settings", "keyname", "quick", "chardef"],
      "readwrite"
    );
    transaction.objectStore("settings").clear();
    transaction.objectStore("keyname").clear();
    transaction.objectStore("quick").clear();
    transaction.objectStore("chardef").clear();
    transaction.oncomplete = (event: Event) => {
      resolve();
    };
    transaction.onerror = (event: Event) => {
      reject("Error when clearing old data...");
    };
  });

  // write to db
  // 1. write settings
  let promiseSettings = new Promise<void>((resolve, reject) => {
    let transaction: IDBTransaction = db.transaction("settings", "readwrite");
    transaction
      .objectStore("settings")
      .add({ name: "%ename", value: cin.ename });
    transaction
      .objectStore("settings")
      .add({ name: "%cname", value: cin.cname });
    transaction
      .objectStore("settings")
      .add({ name: "%prompt", value: cin.prompt });
    transaction
      .objectStore("settings")
      .add({ name: "%selkey", value: cin.selkey });
    transaction
      .objectStore("settings")
      .add({ name: "%dupsel", value: cin.dupsel });
    transaction
      .objectStore("settings")
      .add({ name: "%endkey", value: cin.endkey });
    transaction
      .objectStore("settings")
      .add({ name: "%space_style", value: cin.spaceStyle });
    transaction
      .objectStore("settings")
      .add({ name: "%keep_key_case", value: cin.keepKeyCase });
    transaction
      .objectStore("settings")
      .add({ name: "%symbol_kbm", value: cin.symbolKbm });
    transaction.objectStore("settings").add({
      name: "%phase_auto_skip_endkey",
      value: cin.phaseAutoSkipEndKey,
    });
    transaction.objectStore("settings").add({
      name: "%flag_auto_select_by_phrase",
      value: cin.flagAutoSelectByPhase,
    });
    transaction.objectStore("settings").add({
      name: "%flag_disp_partial_match",
      value: cin.flagDispPartialMatch,
    });
    transaction.objectStore("settings").add({
      name: "%flag_disp_full_match",
      value: cin.flagDispFullMatch,
    });
    transaction.objectStore("settings").add({
      name: "%flag_vertical_selection",
      value: cin.flagVerticalSelection,
    });
    transaction.objectStore("settings").add({
      name: "%flag_press_full_auto_send",
      value: cin.flagPressFullAutoSend,
    });
    transaction.objectStore("settings").add({
      name: "%flag_unique_auto_send",
      value: cin.flagUniqueAutoSend,
    });
    transaction.oncomplete = (event: Event) => {
      resolve();
    };
    transaction.onerror = (event: Event) => {
      reject("Cannot handle settings...");
    };
  });

  // 2. write keynames
  let promiseKeyname = new Promise<void>((resolve, reject) => {
    if (Object.keys(cin.keyname).length == 0) {
      resolve();
    } else {
      let transaction: IDBTransaction = db.transaction("keyname", "readwrite");
      for (let key in cin.keyname) {
        transaction.objectStore("keyname").add({
          key,
          keyname: cin.keyname[key],
        });
      }
      transaction.oncomplete = (event: Event) => {
        resolve();
      };
      transaction.onerror = (event: Event) => {
        reject("Cannot handle keyname section...");
      };
    }
  });
  // 3. write quick
  let promiseQuick = new Promise<void>((resolve, reject) => {
    if (
      !cin.unwrittenQuickList ||
      (cin.unwrittenQuickList as QuickRecord[]).length == 0
    ) {
      resolve();
    } else {
      let transaction: IDBTransaction = db.transaction("quick", "readwrite");
      for (let value of cin.unwrittenQuickList as QuickRecord[]) {
        transaction.objectStore("quick").add(value);
      }
      transaction.oncomplete = (event: Event) => {
        resolve();
      };
      transaction.onerror = (event: Event) => {
        reject("Cannot handle quick section...");
      };
    }
  });
  // 4. write chardef
  let promiseCharDef = new Promise<void>((resolve, reject) => {
    if (
      !cin.unwrittenCharDefList ||
      (cin.unwrittenCharDefList as CharDefRecord[]).length == 0
    ) {
      resolve();
    } else {
      let transaction: IDBTransaction = db.transaction("chardef", "readwrite");
      for (let value of cin.unwrittenCharDefList as CharDefRecord[]) {
        transaction.objectStore("chardef").add(value);
      }
      transaction.oncomplete = (event: Event) => {
        resolve();
      };
      transaction.onerror = (event: Event) => {
        reject("Cannot handle chardef section...");
      };
    }
  });
  // 5. clear quick and chardef arrays
  await Promise.all([
    promiseSettings,
    promiseKeyname,
    promiseQuick,
    promiseCharDef,
  ]);
  delete cin.unwrittenQuickList;
  delete cin.unwrittenCharDefList;
  return cin;
}

async function loadFromStream(
  cinID: string,
  readStream: ReadableStream
): Promise<Cin> {
  const lineReadStream: ReadableStream = readStream
    .pipeThrough(new JSTextDecoderStream())
    .pipeThrough(new JSLineStream());
  const reader = lineReadStream.getReader() as ReadableStreamDefaultReader;

  const dbName: string = `cin_${cinID}`; // TODO: use URL resource name as filename for xhr stream

  let cin = new Cin();
  cin.dupsel = -1; // Unset dupsel before reading data from cin file.
  cin = await handleSection(reader, cin);
  cin = await writeToDB(cin, dbName);
  return cin;
}

async function deleteFromDB(cin: Cin): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    if (cin.dbName) {
      const deleteReq: IDBOpenDBRequest = indexedDB.deleteDatabase(
        cin.dbName as string
      );
      deleteReq.onsuccess = function () {
        resolve();
      };
      deleteReq.onerror = function () {
        reject(`Cannot delete IndexedDB for the file ${cin.dbName}`);
      };
    } else {
      reject("CIN file was not loaded to IndexedDB before.");
    }
  });
}

export { loadFromStream, deleteFromDB };
