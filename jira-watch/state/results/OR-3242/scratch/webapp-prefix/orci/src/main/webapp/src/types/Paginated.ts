import { Array, Number, Record, Runtype } from "runtypes";

export const Paginated = <T extends Runtype>(innerType: T) =>
  Record({
    content: Array(innerType),
    page: Record({
      size: Number,
      totalElements: Number,
      totalPages: Number,
      number: Number,
    }),
  });

export type Paginated<T> = {
  content: T[];
  page: {
    size: number;
    totalElements: number;
    totalPages: number;
    number: number;
  };
};

export function isLastPage(p: Paginated<any> | undefined): boolean {
  return p !== undefined && p.page.number == p.page.totalPages - 1;
}

export type PagedResponse<T> = {
  content?: T[];
  page?: {
    size?: number;
    totalElements?: number;
    totalPages?: number;
    number?: number;
  };
};

export function toPaginated<T>(
  data: PagedResponse<T> | undefined,
  requestedPage: number,
  requestedSize: number,
): Paginated<T> {
  return {
    content: data?.content ?? [],
    page: {
      size: data?.page?.size ?? requestedSize,
      totalElements: data?.page?.totalElements ?? 0,
      totalPages: data?.page?.totalPages ?? 0,
      number: data?.page?.number ?? requestedPage,
    },
  };
}
