import { useState, useCallback } from 'react';
import { useApi } from './useApi.js';

export function usePagination(fetchFn, { limit = 15, defaultPage = 1, search = '', filter = 'all' } = {}) {
  const [page, setPage] = useState(defaultPage);
  const [searchValue, setSearchValue] = useState(search);
  const [filterValue, setFilterValue] = useState(filter);

  const buildParams = useCallback((p, s, f) => {
    const params = { page: p, limit };
    if (s) params.userId = s;
    if (f !== 'all') params.department = f;
    return params;
  }, [limit]);

  const { data, loading, refetch, setData } = useApi(
    () => fetchFn(buildParams(page, searchValue, filterValue)),
    { deps: [page, searchValue, filterValue] }
  );

  const items = data?.entries ?? data?.items ?? [];
  const pagination = data?.pagination ?? { page: 1, pages: 1, total: 0 };

  const goToPage = useCallback((p) => {
    setPage(Math.max(1, p));
  }, []);

  const nextPage = useCallback(() => {
    setPage((p) => Math.min(p + 1, pagination.pages));
  }, [pagination.pages]);

  const prevPage = useCallback(() => {
    setPage((p) => Math.max(1, p - 1));
  }, []);

  const applySearch = useCallback((value) => {
    setSearchValue(value);
    setPage(1);
  }, []);

  const applyFilter = useCallback((value) => {
    setFilterValue(value);
    setPage(1);
  }, []);

  return {
    items,
    pagination,
    page,
    search: searchValue,
    filter: filterValue,
    loading,
    setPage: goToPage,
    nextPage,
    prevPage,
    setSearch: applySearch,
    setFilter: applyFilter,
    refetch: () => refetch(),
    setData,
  };
}
