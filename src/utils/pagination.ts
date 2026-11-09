export interface PageParams {
  page: number;
  limit: number;
}

export interface PaginationMeta extends PageParams {
  total: number;
  pages: number;
}

export const toSkip = ({ page, limit }: PageParams) => (page - 1) * limit;

export const buildPaginationMeta = ({ page, limit }: PageParams, total: number): PaginationMeta => ({
  page,
  limit,
  total,
  pages: Math.max(1, Math.ceil(total / limit)),
});
