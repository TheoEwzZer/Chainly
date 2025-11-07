import { createLoader, LoaderFunction, SingleParserBuilder } from "nuqs/server";
import { workflowsParams } from "../params";

export type ParseServerSideValue = string | string[] | undefined;

export const workflowsParamsLoader: LoaderFunction<{
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
}> = createLoader(workflowsParams);
