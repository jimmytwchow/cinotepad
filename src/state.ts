import { Cin, CharDefRecord } from "./cin/cin";

type State = {
  activeCin?: Cin;
  cins: Cin[];
  cinEnable: boolean;
  keynames: string;
  candidates: CharDefRecord[];
  textContent: string;
  selectionPos: number;
};

const state: State = {
  cins: [] as Cin[],
  cinEnable: true,
  keynames: "",
  candidates: [] as CharDefRecord[],
  textContent: "",
  selectionPos: 0,
};

export { state, State };
