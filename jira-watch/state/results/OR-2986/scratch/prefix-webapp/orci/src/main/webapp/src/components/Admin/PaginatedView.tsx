import { isLastPage, Paginated } from "../../types/Paginated";
import React, { ReactNode, useMemo, useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { concat, identity, sortBy } from "lodash";
import { Button, Form, InputGroup } from "react-bootstrap";
import { ChevronLeft, ChevronRight } from "react-bootstrap-icons";
import { Either } from "purify-ts";
import { APIError } from "../../errors/APIError";
import { useDebounce } from "use-debounce";

/**
 * Adapt an in-memory data set to work with paginated view
 * @param data the list of data
 */
export function inMemory<T, S>(data: T[]): PaginatedViewProps<T, S>["queryFn"] {
  return async (page: number, size: number, sort?: string) => {
    const sortReversed = sort?.startsWith("-");
    const sortField = sortReversed ? sort?.slice(1) : sort;
    const sorted = sortBy(data, sortField || identity);
    const reversed = sortReversed ? sorted.reverse() : sorted;
    const pageContent = reversed.slice(page * size, (page + 1) * size);
    return {
      content: pageContent,
      page: {
        size,
        totalElements: data.length,
        totalPages: Math.floor(data.length / size),
        number: page,
      },
    } satisfies Paginated<T>;
  };
}

export type PaginatedViewProps<T, S> =
  | {
      queryKey: string[];
      searchable: false;
      pageSizeOptions?: number[];
      defaultPageSize?: number;
      sortable?: boolean;
      initialSort?: string;
      queryFn: (
        page: number,
        size: number,
        sort?: string,
      ) => Promise<Paginated<T> | Either<APIError, Paginated<T>>>;
      children: (c: {
        items: T[];
        loading: boolean;
        sort: string | undefined;
        setSort: (sort: string | undefined) => void;
      }) => ReactNode;
    }
  | {
      queryKey: string[];
      searchable: true;
      pageSizeOptions?: number[];
      defaultPageSize?: number;
      sortable?: boolean;
      initialSort?: string;
      initialSearchParams: S;
      queryFn: (
        page: number,
        size: number,
        searchParams: S,
        sort?: string,
      ) => Promise<Paginated<T> | Either<APIError, Paginated<T>>>;
      children: (c: {
        items: T[];
        loading: boolean;
        setSearchParams: (searchParams: S) => void;
        searchParams: S;
        sort: string | undefined;
        setSort: (sort: string | undefined) => void;
      }) => ReactNode;
    };

const DEFAULT_PAGE_SIZE = 10;

export function PaginatedView<T, S = undefined>(
  props: PaginatedViewProps<T, S>,
) {
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(props.defaultPageSize ?? DEFAULT_PAGE_SIZE);
  const [sort, _setSort] = useState<string | undefined>(props.initialSort);
  const setSort = (s: string | undefined) =>
    _setSort(s !== undefined && sort === s ? `-${s}` : s);
  const [searchParams, setSearchParams] = useState<S | undefined>(
    props.searchable ? props.initialSearchParams : undefined,
  );

  const [debouncedSearchParams] = useDebounce(searchParams, 300);

  // Reset to first page when size, sort, or search changes
  const resetKey = useMemo(
    () =>
      `${size}|${sort ?? ""}|${JSON.stringify(debouncedSearchParams ?? "")}`,
    [size, sort, debouncedSearchParams],
  );
  const [prevResetKey, setPrevResetKey] = useState(resetKey);
  if (prevResetKey !== resetKey) {
    setPrevResetKey(resetKey);
    if (page !== 0) setPage(0);
  }

  const listQ = useQuery({
    queryKey: concat(props.queryKey, [
      String(page),
      String(size),
      sort ?? "",
      debouncedSearchParams as unknown as string,
    ]),
    queryFn: async (): Promise<Paginated<T>> => {
      const resp = props.searchable
        ? await props.queryFn(page, size, debouncedSearchParams!, sort)
        : await props.queryFn(page, size, sort);
      if (Either.isEither(resp)) {
        return resp.caseOf({
          Left: (error) => {
            throw new Error(error.message);
          },
          Right: (data) => data,
        });
      } else {
        return resp;
      }
    },
    placeholderData: keepPreviousData,
  });

  const showSizeSelector = !!props.pageSizeOptions?.length;

  return (
    <div>
      {listQ.isPending ? (
        <div>Loading...</div>
      ) : listQ.isError ? (
        <div>Error: {listQ.error.message}</div>
      ) : (
        <>
          <div>
            {props.searchable
              ? props.children({
                  items: listQ.data.content,
                  setSearchParams,
                  loading: listQ.isFetching,
                  searchParams: searchParams!,
                  sort,
                  setSort,
                })
              : props.children({
                  items: listQ.data.content,
                  loading: listQ.isFetching,
                  sort,
                  setSort,
                })}
          </div>

          {listQ.data.page.totalPages > 0 && (
            <div className="d-flex justify-content-between align-items-center mt-3 flex-wrap gap-3">
              <div className="text-muted small">
                Showing {listQ.data.content.length} of{" "}
                {listQ.data.page.totalElements}
                {listQ.isFetching ? " (updating…)" : ""}
              </div>

              {listQ.data.page.totalPages > 1 && (
                <PaginationControls
                  currentPage={page}
                  totalPages={listQ.data.page.totalPages}
                  onPageChange={setPage}
                  disableNext={
                    listQ.isPlaceholderData || isLastPage(listQ.data)
                  }
                />
              )}

              {showSizeSelector && (
                <InputGroup style={{ maxWidth: "180px" }} size="sm">
                  <InputGroup.Text>Show</InputGroup.Text>
                  <Form.Select
                    value={size}
                    onChange={(e) => setSize(Number(e.target.value))}
                  >
                    {props.pageSizeOptions!.map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </Form.Select>
                </InputGroup>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function PaginationControls({
  currentPage,
  totalPages,
  onPageChange,
  disableNext,
}: {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  disableNext: boolean;
}) {
  return (
    <div className="d-flex align-items-center gap-2">
      <Button
        variant="outline-secondary"
        size="sm"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 0}
        aria-label="Previous page"
      >
        <ChevronLeft />
      </Button>
      <span className="text-muted small">
        Page {currentPage + 1} of {totalPages}
      </span>
      <Button
        variant="outline-secondary"
        size="sm"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={disableNext}
        aria-label="Next page"
      >
        <ChevronRight />
      </Button>
    </div>
  );
}
