function indexOfWhiteSpace(line) {
  let spIdx, tabIdx, wspIdx;
  spIdx = line.indexOf(" ");
  tabIdx = line.indexOf("\t");
  if (tabIdx == -1 || (spIdx > -1 && spIdx < tabIdx)) {
    wspIdx = spIdx;
  } else {
    wspIdx = tabIdx;
  }
  return wspIdx;
}

function handleComment(line) {
  let i = line.indexOf("#");
  if (i > -1) {
    line = line.substring(0, i).trim();
  }
  return line;
}

async function handleKeynameSection(reader, cin) {
  let { done, value: line } = await reader.read();
  if (done) {
    return cin;
  } else {
    if (line.length > 0) {
      if (line.startsWith("%keyname end")) {
        return cin;
      } else if (line.startsWith(" # ") && line.length > 3) {
        cin.keyname["#"] = line.substring(3);
      } else {
        let whitespaceIndex = indexOfWhiteSpace(line);
        if (whitespaceIndex > 0 && whitespaceIndex < line.length - 1) {
          cin.keyname[line.substring(0, whitespaceIndex)] = line
            .substring(whitespaceIndex + 1)
            .trim();
        }
      }
    }
    return await handleKeynameSection(reader, cin);
  }
}

async function handleQuickSection(reader, cin) {
  let { done, value: line } = await reader.read();
  if (done) {
    return cin;
  } else {
    let keycode, candidates;
    if (line.length > 0) {
      if (line.startsWith("%quick end")) {
        return cin;
      } else if (line.startsWith(" # ") && line.length > 3) {
        keycode = "#";
        candidates = line.substring(3).trim();
        cin.unwrittenQuickList.push({ keycode, candidates });
      } else {
        let whitespaceIndex = indexOfWhiteSpace(line);
        if (whitespaceIndex > 0 && whitespaceIndex < line.length - 1) {
          keycode = line.substring(0, whitespaceIndex);
          candidates = line.substring(whitespaceIndex + 1).trim();
          cin.unwrittenQuickList.push({ keycode, candidates });
          cin.maxNumOfKeys = Math.max(cin.maxNumOfKeys, keycode.length);
        }
      }
    }
    return await handleQuickSection(reader, cin);
  }
}

async function handleCharDefSection(reader, cin) {
  let { done, value: line } = await reader.read();
  if (done) {
    return cin;
  } else {
    let keycode, candidate;
    if (line.length > 0) {
      if (line.startsWith("%chardef end")) {
        return cin;
      } else if (line.startsWith(" # ") && line.length > 3) {
        keycode = "#";
        candidate = line.substring(3).trim();
        cin.unwrittenCharDefList.push({ keycode, candidate });
      } else {
        let whitespaceIndex = indexOfWhiteSpace(line);
        if (whitespaceIndex > 0 && whitespaceIndex < line.length - 1) {
          keycode = line.substring(0, whitespaceIndex);
          candidate = line.substring(whitespaceIndex + 1).trim();
          cin.unwrittenCharDefList.push({ keycode, candidate });
          cin.maxNumOfKeys = Math.max(cin.maxNumOfKeys, keycode.length);
        }
      }
    }
    return await handleCharDefSection(reader, cin);
  }
}

async function handleSection(reader, cin) {
  let { done, value: line } = await reader.read();
  if (done) {
    if (!cin.dupsel) {
      cin.dupsel = cin.selkey.length;
    }
    if (!cin.keepKeyCase) {
      const oldKeyname = cin.keyname;
      cin.keyname = {};
      for (let key in oldKeyname) {
        cin.keyname[key.toLowerCase()] = oldKeyname[key];
      }
      for (let i in cin.unwrittenQuickList) {
        cin.unwrittenQuickList[i].keycode =
          cin.unwrittenQuickList[i].keycode.toLowerCase();
      }
      for (let i in cin.unwrittenCharDefList) {
        cin.unwrittenCharDefList[i].keycode =
          cin.unwrittenCharDefList[i].keycode.toLowerCase();
      }
    }
    return cin;
  } else {
    line = handleComment(line);
    if (line.length > 0) {
      if (line.startsWith("%gen_inp")) {
        // temporarily unused (means general input module)
      } else if (line.startsWith("%ename ")) {
        cin.ename = line.substring("%ename ".length);
      } else if (line.startsWith("%cname ")) {
        cin.cname = line.substring("%cname ".length);
      } else if (line.startsWith("%prompt ")) {
        cin.cname = line.substring("%prompt ".length);
      } else if (line.startsWith("%selkey ")) {
        cin.selkey = line.substring("%selkey ".length);
      } else if (line.startsWith("%dupsel ")) {
        cin.dupsel = line.substring("%dupsel ".length); //e.g. %dupsel 9
      } else if (line.startsWith("%endkey ")) {
        cin.endkey = line.substring("%endkey ".length);
      } else if (line.startsWith("%space_style ")) {
        cin.spaceStyle = line.substring("%space_style ".length);
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
    return await handleSection(reader, cin);
  }
}

async function writeToDB(cin, dbName) {
  // Open database first
  let db = await new Promise((resolve, reject) => {
    let openReq = indexedDB.open(dbName);
    openReq.onsuccess = function (event) {
      resolve(event.target.result);
    };
    openReq.onupgradeneeded = function (event) {
      // TODO only create store when it is not created.
      // TODO may need to check version for further updates.
      let db = event.target.result;
      let objS = db.createObjectStore("settings", { keyPath: "name" });
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
  await new Promise((resolve, reject) => {
    let transaction = db.transaction(
      ["settings", "keyname", "quick", "chardef"],
      "readwrite"
    );
    transaction.objectStore("settings").clear();
    transaction.objectStore("keyname").clear();
    transaction.objectStore("quick").clear();
    transaction.objectStore("chardef").clear();
    transaction.oncomplete = (event) => {
      resolve();
    };
    transaction.onerror = (event) => {
      reject("Error when clearing old data...");
    };
  });

  // write to db
  // 1. write settings
  let promiseSettings = new Promise((resolve, reject) => {
    let transaction = db.transaction("settings", "readwrite");
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
    transaction.oncomplete = (event) => {
      resolve();
    };
    transaction.onerror = (event) => {
      reject("Cannot handle settings...");
    };
  });

  // 2. write keynames
  let promiseKeyname = new Promise((resolve, reject) => {
    if (!cin.keyname || Object.keys(cin.keyname).length == 0) {
      resolve();
    } else {
      let transaction = db.transaction("keyname", "readwrite");
      for (let key in cin.keyname) {
        transaction.objectStore("keyname").add({
          key,
          keyname: cin.keyname[key],
        });
      }
      transaction.oncomplete = (event) => {
        resolve();
      };
      transaction.onerror = (event) => {
        reject("Cannot handle keyname section...");
      };
    }
  });
  // 3. write quick
  let promiseQuick = new Promise((resolve, reject) => {
    if (!cin.unwrittenQuickList || cin.unwrittenQuickList.length == 0) {
      resolve();
    } else {
      let transaction = db.transaction("quick", "readwrite");
      for (let value of cin.unwrittenQuickList) {
        transaction.objectStore("quick").add(value);
      }
      transaction.oncomplete = (event) => {
        resolve();
      };
      transaction.onerror = (event) => {
        reject("Cannot handle quick section...");
      };
    }
  });
  // 4. write chardef
  let promiseCharDef = new Promise((resolve, reject) => {
    if (!cin.unwrittenCharDefList || cin.unwrittenCharDefList.length == 0) {
      resolve();
    } else {
      let transaction = db.transaction("chardef", "readwrite");
      for (let value of cin.unwrittenCharDefList) {
        transaction.objectStore("chardef").add(value);
      }
      transaction.oncomplete = (event) => {
        resolve();
      };
      transaction.onerror = (event) => {
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

export { handleSection, writeToDB };
