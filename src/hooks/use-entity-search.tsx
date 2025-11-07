import { PAGINATION } from "@/config/constants";
import { useEffect, useState } from "react";

interface UseEntitySearchProps<
  T extends {
    search: string;
    page: number;
  }
> {
  params: T;
  setParams: (params: T) => void;
  debounceMs?: number;
}

export const useEntitySearch = <
  T extends {
    search: string;
    page: number;
  }
>({
  params,
  setParams,
  debounceMs = 500,
}: UseEntitySearchProps<T>) => {
  const [localSearch, setLocalSearch] = useState<string>(params.search);

  useEffect(() => {
    if (localSearch === "" && params.search !== "") {
      setParams({
        ...params,
        search: localSearch,
        page: PAGINATION.DEFAULT_PAGE,
      });
      return;
    }

    const timer: NodeJS.Timeout = setTimeout(() => {
      if (localSearch !== params.search) {
        setParams({
          ...params,
          search: localSearch,
          page: PAGINATION.DEFAULT_PAGE,
        });
      }
    }, debounceMs);

    return (): void => clearTimeout(timer);
  }, [debounceMs, localSearch, params, setParams]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLocalSearch(params.search);
  }, [params.search]);

  return {
    searchValue: localSearch,
    setSearchValue: setLocalSearch,
  };
};
