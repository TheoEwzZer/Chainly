import {
  SingleParserBuilder,
  useQueryStates,
  UseQueryStatesReturn,
} from "nuqs";
import { workflowsParams } from "../params";
import { ParseServerSideValue } from "../server/params-loader";

export const useWorkflowsParams: () => UseQueryStatesReturn<{
  page: Omit<SingleParserBuilder<number>, "parseServerSide"> & {
    readonly defaultValue: number;
    parseServerSide(value: ParseServerSideValue): number;
  };
  pageSize: Omit<SingleParserBuilder<number>, "parseServerSide"> & {
    readonly defaultValue: number;
    parseServerSide(value: ParseServerSideValue): number;
  };
  search: Omit<SingleParserBuilder<string>, "parseServerSide"> & {
    readonly defaultValue: string;
    parseServerSide(value: ParseServerSideValue): string;
  };
}> = () => {
  return useQueryStates(workflowsParams);
};
