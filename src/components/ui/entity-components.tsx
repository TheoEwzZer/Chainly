import type { ChangeEvent, ReactElement, ReactNode } from "react";
import { Button } from "./button";
import {
  AlertTriangleIcon,
  MoreVerticalIcon,
  PackageOpenIcon,
  PlusIcon,
  SearchIcon,
  TrashIcon,
} from "lucide-react";
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
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "./empty";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardDescription, CardTitle } from "./card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./dropdown-menu";

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
}: EntityPaginationProps): ReactElement | null => {
  if (totalPages === 0) {
    return null;
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

interface StateViewProps {
  message?: string;
}

export const LoadingView = ({ message }: StateViewProps): ReactElement => {
  return (
    <div className="flex flex-col items-center justify-center h-full">
      <Spinner className="size-6 text-primary" />
      {Boolean(message) && (
        <p className="text-sm text-muted-foreground">{message}</p>
      )}
    </div>
  );
};

export const ErrorView = ({ message }: StateViewProps): ReactElement => {
  return (
    <div className="flex flex-col items-center justify-center h-full">
      <AlertTriangleIcon className="size-6 text-destructive" />
      {Boolean(message) && (
        <p className="text-sm text-muted-foreground">{message}</p>
      )}
    </div>
  );
};

interface EmptyViewProps extends StateViewProps {
  onNew: () => void;
}

export const EmptyView = ({ message, onNew }: EmptyViewProps): ReactElement => {
  return (
    <Empty className="border border-dashed bg-white">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <PackageOpenIcon />
        </EmptyMedia>
      </EmptyHeader>
      <EmptyTitle>No items</EmptyTitle>
      {Boolean(message) && <EmptyDescription>{message}</EmptyDescription>}
      {Boolean(onNew) && (
        <EmptyContent>
          <Button onClick={onNew}>Add item</Button>
        </EmptyContent>
      )}
    </Empty>
  );
};

interface EntityListProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => ReactElement;
  getKey?: (item: T, index: number) => string | number;
  emptyView?: ReactElement;
  className?: string;
}

export function EntityList<T>({
  items,
  renderItem,
  getKey,
  emptyView,
  className,
}: Readonly<EntityListProps<T>>): ReactElement {
  if (items.length === 0 && emptyView) {
    return (
      <div className="flex-1 flex justify-center items-center">
        <div className="maw-w-sm mx-auto">{emptyView}</div>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col gap-y-4", className)}>
      {items.map(
        (item: T, index: number): ReactElement => (
          <div key={getKey ? getKey(item, index) : index}>
            {renderItem(item, index)}
          </div>
        )
      )}
    </div>
  );
}

interface EntityItemProps {
  href: string;
  title: string;
  subtitle?: ReactNode;
  image?: ReactNode;
  actions?: ReactElement;
  onRemove?: () => void | Promise<void>;
  isRemoving?: boolean;
  className?: string;
}

export const EntityItem = ({
  href,
  title,
  subtitle,
  image,
  actions,
  onRemove,
  isRemoving,
  className,
}: EntityItemProps): ReactElement => {
  const handleRemove = async (
    e: React.MouseEvent<HTMLDivElement, MouseEvent>
  ): Promise<void> => {
    e.preventDefault();
    e.stopPropagation();

    if (isRemoving) {
      return;
    }

    if (onRemove) {
      await onRemove();
    }
  };

  return (
    <Link href={href} prefetch>
      <Card
        className={cn(
          "p-4 shadow-none hover:shadow cursor-pointer",
          isRemoving && "opacity-50 cursor-not-allowed",
          className
        )}
      >
        <CardContent className="flex flex-row items-center justify-between p-0">
          <div className="flex items-center gap-3">
            {image}
            <div>
              <CardTitle className="text-base font-medium">{title}</CardTitle>
              {Boolean(subtitle) && (
                <CardDescription className="text-xs">
                  {subtitle}
                </CardDescription>
              )}
            </div>
          </div>
          {(actions || onRemove) && (
            <div className="flex gap-x-4 items-center">
              {actions}
              {onRemove && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={(
                        e: React.MouseEvent<HTMLButtonElement, MouseEvent>
                      ): void => e.stopPropagation()}
                    >
                      <MoreVerticalIcon className="size-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="end"
                    onClick={(
                      e: React.MouseEvent<HTMLDivElement, MouseEvent>
                    ): void => e.stopPropagation()}
                  >
                    <DropdownMenuItem onClick={handleRemove}>
                      <TrashIcon className="size-4" /> Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
};
