import {
  createLoader,
  type LoaderFunction,
  type SingleParserBuilder,
} from "nuqs/server";
import { credentialsParams } from "../params";

export type ParseServerSideValue = string | string[] | undefined;

export const credentialsParamsLoader: LoaderFunction<{
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
}> = createLoader(credentialsParams);
