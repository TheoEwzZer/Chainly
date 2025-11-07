import type { ChangeEvent, ReactElement, ReactNode } from "react";
import { Button } from "./button";
import { PlusIcon, SearchIcon } from "lucide-react";
import Link from "next/link";
import { Spinner } from "./spinner";
import { InputGroup, InputGroupInput, InputGroupAddon } from "./input-group";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "./pagination";

type EntityHeaderProps = {
  title: string;
  description?: string;
  newButtonLabel?: string;
  disabled?: boolean;
  isCreating?: boolean;
} & (
  | { onNew: () => void; newButtonHref?: never }
  | { newButtonHref: string; onNew?: never }
  | { onNew?: never; newButtonHref?: never }
);

export const EntityHeader = ({
  title,
  description,
  newButtonLabel,
  disabled,
  isCreating,
  onNew,
  newButtonHref,
}: EntityHeaderProps): ReactElement => {
  return (
    <div className="flex flex-row items-center justify-between gap-x-4">
      <div className="flex flex-col">
        <h1 className="text-lg md:text-xl font-semibold">{title}</h1>
        {description && (
          <p className="text-xs md:text-sm text-muted-foreground">
            {description}
          </p>
        )}
      </div>
      {onNew && !newButtonHref && (
        <Button onClick={onNew} disabled={isCreating || disabled} size="sm">
          {isCreating && <Spinner />}
          {!isCreating && <PlusIcon className="size-4" />}
          {newButtonLabel}
        </Button>
      )}
      {newButtonHref && (
        <Button asChild size="sm">
          <Link href={newButtonHref} prefetch>
            <PlusIcon className="size-4" />
            {newButtonLabel}
          </Link>
        </Button>
      )}
    </div>
  );
};

type EntityContainerProps = {
  children: ReactNode;
  header: ReactElement;
  search: ReactElement;
  pagination: ReactElement;
};

export const EntityContainer = ({
  children,
  header,
  search,
  pagination,
}: EntityContainerProps): ReactElement => {
  return (
    <div className="p-4 md:px-10 md:py-6 h-full">
      <div className="mx-auto max-w-7xl w-full flex flex-col gap-y-8 h-full">
        {header}
        <div className="flex flex-col gap-y-4 h-full">
          {search}
          {children}
        </div>
        {pagination}
      </div>
    </div>
  );
};

interface EntitySearchProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export const EntitySearch = ({
  value,
  onChange,
  placeholder = "Search",
}: EntitySearchProps): ReactElement => {
  return (
    <div className="relative ml-auto">
      <InputGroup className="bg-background border-border shadow-none ">
        <InputGroupInput
          value={value}
          onChange={(e: ChangeEvent<HTMLInputElement>): void =>
            onChange(e.target.value)
          }
          placeholder={placeholder}
        />
        <InputGroupAddon>
          <SearchIcon />
        </InputGroupAddon>
      </InputGroup>
    </div>
  );
};

interface EntityPaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  disabled?: boolean;
}

const generatePageNumbers = (
  currentPage: number,
  totalPages: number
): (number | "ellipsis")[] => {
  if (totalPages <= 7) {
    return Array.from(
      { length: totalPages },
      (_: unknown, i: number): number => i + 1
    );
  }

  if (currentPage <= 3) {
    return [
      ...Array.from({ length: 5 }, (_: unknown, i: number): number => i + 1),
      "ellipsis",
      totalPages,
    ];
  }

  if (currentPage >= totalPages - 2) {
    const startPage: number = Math.max(2, totalPages - 4);
    const pageCount: number = totalPages - startPage + 1;
    return [
      1,
      "ellipsis",
      ...Array.from(
        { length: pageCount },
        (_: unknown, i: number): number => startPage + i
      ),
    ];
  }

  return [
    1,
    "ellipsis",
    currentPage - 1,
    currentPage,
    currentPage + 1,
    "ellipsis",
    totalPages,
  ];
};

export const EntityPagination = ({
  page,
  totalPages,
  onPageChange,
  disabled,
}: EntityPaginationProps): ReactElement => {
  if (totalPages === 0) {
    return (
      <div className="flex items-center justify-center w-full py-4">
        <p className="text-sm text-muted-foreground">No results found</p>
      </div>
    );
  }

  const pageNumbers: (number | "ellipsis")[] = generatePageNumbers(
    page,
    totalPages
  );
  const isFirstPage: boolean = page === 1;
  const isLastPage: boolean = page === totalPages;

  return (
    <div className="flex flex-col gap-y-4 w-full">
      <Pagination>
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious
              onClick={
                !isFirstPage && !disabled
                  ? (): void => onPageChange(Math.max(1, page - 1))
                  : undefined
              }
              className={
                isFirstPage || disabled ? "pointer-events-none opacity-50" : ""
              }
            />
          </PaginationItem>

          {pageNumbers.map(
            (pageNum: number | "ellipsis", index: number): ReactElement => {
              if (pageNum === "ellipsis") {
                return (
                  <PaginationItem key={`ellipsis-${index}`}>
                    <PaginationEllipsis />
                  </PaginationItem>
                );
              }

              return (
                <PaginationItem key={pageNum}>
                  <PaginationLink
                    isActive={pageNum === page}
                    onClick={
                      !disabled && pageNum !== page
                        ? (): void => onPageChange(pageNum)
                        : undefined
                    }
                    className={
                      disabled && pageNum !== page
                        ? "pointer-events-none opacity-50"
                        : ""
                    }
                  >
                    {pageNum}
                  </PaginationLink>
                </PaginationItem>
              );
            }
          )}

          <PaginationItem>
            <PaginationNext
              onClick={
                !isLastPage && !disabled
                  ? (): void => onPageChange(Math.min(totalPages, page + 1))
                  : undefined
              }
              className={
                isLastPage || disabled ? "pointer-events-none opacity-50" : ""
              }
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </div>
  );
};
