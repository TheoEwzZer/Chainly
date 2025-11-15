import {
  createLoader,
  type LoaderFunction,
  type SingleParserBuilder,
} from "nuqs/server";
import { executionsParams } from "../params";

export type ParseServerSideValue = string | string[] | undefined;

export const executionsParamsLoader: LoaderFunction<{
  page: Omit<SingleParserBuilder<number>, "parseServerSide"> & {
    readonly defaultValue: number;
    parseServerSide(value: ParseServerSideValue): number;
  };
  pageSize: Omit<SingleParserBuilder<number>, "parseServerSide"> & {
    readonly defaultValue: number;
    parseServerSide(value: ParseServerSideValue): number;
  };
}> = createLoader(executionsParams);
