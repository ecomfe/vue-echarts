import { analyzeOption } from "../utils/analyzeOption";
import type { AnalyzeRequest, AnalyzeResponse } from "./option.types";

self.onmessage = async (event: MessageEvent<AnalyzeRequest>) => {
  const { id, code } = event.data;
  const response = await analyzeOption(code);
  (self as unknown as Worker).postMessage({
    id,
    ...response,
  } satisfies AnalyzeResponse);
};
