import React from 'react';
import { QueryClientProvider, QueryClient } from 'react-query';
import { renderHook, act } from '@testing-library/react-hooks';

import { axiosInstance } from '../../../../core/utils';
import { useRelation } from '../useRelation';

jest.mock('../../../../core/utils', () => ({
  ...jest.requireActual('../../../../core/utils'),
  axiosInstance: {
    get: jest.fn().mockResolvedValue({
      data: {
        results: [
          { id: 2, name: 'newest', publishedAt: null },
          { id: 1, name: 'oldest', publishedAt: null },
        ],
        pagination: { page: 1, pageCount: 10 },
      },
    }),
  },
}));

const client = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

// eslint-disable-next-line react/prop-types
const ComponentFixture = ({ children }) => (
  <QueryClientProvider client={client}>{children}</QueryClientProvider>
);

function setup(args, name = 'test') {
  return new Promise((resolve) => {
    act(() => {
      resolve(
        renderHook(
          () =>
            useRelation(name, {
              name,
              relation: {
                enabled: true,
                endpoint: '/',
                pageParams: {
                  limit: 10,
                  ...(args?.relation?.pageParams ?? {}),
                },
                normalizeArguments: {
                  mainFieldName: 'name',
                  shouldAddLink: false,
                  targetModel: 'api::tag.tag',
                },
                ...(args?.relation ?? {}),
              },

              search: {
                endpoint: '/',
                pageParams: {
                  limit: 10,
                  ...(args?.search?.pageParams ?? {}),
                },
                ...(args?.search ?? {}),
              },
            }),
          { wrapper: ComponentFixture }
        )
      );
    });
  });
}

describe('useRelation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('fetch relations and calls onLoadRelationsCallback', async () => {
    const onLoadMock = jest.fn();
    const { waitFor } = await setup({
      relation: {
        onLoad: onLoadMock,
      },
    });

    await waitFor(() => expect(axiosInstance.get).toBeCalledTimes(1));

    expect(axiosInstance.get).toBeCalledWith('/', {
      params: {
        limit: 10,
        page: 1,
      },
    });

    await waitFor(() =>
      expect(onLoadMock).toBeCalledWith({
        target: {
          name: 'test',
          value: [expect.objectContaining({ id: 1 }), expect.objectContaining({ id: 2 })],
        },
      })
    );
  });

  test('fetch and normalize relations for xToOne', async () => {
    const onLoadMock = jest.fn();

    const FIXTURE = {
      id: 1,
      title: 'xToOne relation',
    };

    axiosInstance.get = jest.fn().mockResolvedValueOnce({
      data: {
        data: FIXTURE,
      },
    });

    const { result, waitFor } = await setup({
      relation: {
        onLoad: onLoadMock,
      },
    });

    await waitFor(() => expect(result.current.relations.isSuccess).toBe(true));

    await waitFor(() =>
      expect(onLoadMock).toBeCalledWith({
        target: {
          name: 'test',
          value: [expect.objectContaining({ id: 1 })],
        },
      })
    );
  });

  test('fetch relations with different limit', async () => {
    const { waitForNextUpdate } = await setup({
      relation: { pageParams: { limit: 5 } },
    });

    await waitForNextUpdate();

    expect(axiosInstance.get).toBeCalledWith(expect.any(String), {
      params: {
        limit: 5,
        page: expect.any(Number),
      },
    });
  });

  test('does not fetch relations if it was not enabled', async () => {
    await setup({ relation: { enabled: false } });

    expect(axiosInstance.get).not.toBeCalled();
  });

  test('fetch relations', async () => {
    const { result, waitForNextUpdate } = await setup();

    await waitForNextUpdate();

    expect(result.current.relations.isSuccess).toBe(true);
    expect(axiosInstance.get).toBeCalledTimes(1);
    expect(axiosInstance.get).toBeCalledWith('/', {
      params: {
        limit: 10,
        page: 1,
      },
    });
  });

  test('fetch relations next page, if there is one', async () => {
    axiosInstance.get = jest.fn().mockResolvedValueOnce({
      data: {
        results: [],
        pagination: {
          page: 1,
          pageCount: 3,
        },
      },
    });

    const { result, waitForNextUpdate } = await setup();

    await waitForNextUpdate();

    act(() => {
      result.current.relations.fetchNextPage();
    });

    await waitForNextUpdate();

    expect(axiosInstance.get).toBeCalledTimes(2);
    expect(axiosInstance.get).toHaveBeenNthCalledWith(1, expect.any(String), {
      params: {
        limit: expect.any(Number),
        page: 1,
      },
    });
    expect(axiosInstance.get).toHaveBeenNthCalledWith(2, expect.any(String), {
      params: {
        limit: expect.any(Number),
        page: 2,
      },
    });
  });

  test("does not fetch relations next page, if there isn't one", async () => {
    axiosInstance.get = jest.fn().mockResolvedValueOnce({
      data: {
        results: [],
        pagination: {
          page: 1,
          pageCount: 1,
        },
      },
    });

    const { result, waitForNextUpdate } = await setup();

    await waitForNextUpdate();

    act(() => {
      result.current.relations.fetchNextPage();
    });

    await waitForNextUpdate();

    expect(axiosInstance.get).toBeCalledTimes(1);
  });

  test('does not fetch search by default', async () => {
    const { result, waitForNextUpdate } = await setup();

    await waitForNextUpdate();

    expect(result.current.search.isLoading).toBe(false);
  });

  test('does fetch search results once a term was provided', async () => {
    const { result, waitForNextUpdate } = await setup();

    await waitForNextUpdate();

    const spy = jest
      .fn()
      .mockResolvedValue({ data: { results: [], pagination: { page: 1, pageCount: 2 } } });
    axiosInstance.get = spy;

    act(() => {
      result.current.searchFor('something');
    });

    await waitForNextUpdate();

    expect(spy).toBeCalledTimes(1);
    expect(spy).toBeCalledWith('/', { params: { _q: 'something', limit: 10, page: 1 } });
  });

  test('does fetch search results with a different limit', async () => {
    const { result, waitForNextUpdate } = await setup({
      search: { pageParams: { limit: 5 } },
    });

    await waitForNextUpdate();

    const spy = jest
      .fn()
      .mockResolvedValue({ data: { values: [], pagination: { page: 1, pageCount: 2 } } });
    axiosInstance.get = spy;

    act(() => {
      result.current.searchFor('something');
    });

    await waitForNextUpdate();

    expect(spy).toBeCalledTimes(1);
    expect(spy).toBeCalledWith(expect.any(String), {
      params: {
        _q: 'something',
        limit: 5,
        page: expect.any(Number),
      },
    });
  });

  test('fetch search next page, if there is one', async () => {
    const { result, waitForNextUpdate } = await setup();

    const spy = jest
      .fn()
      .mockResolvedValue({ data: { results: [], pagination: { page: 1, pageCount: 2 } } });
    axiosInstance.get = spy;

    act(() => {
      result.current.searchFor('something');
    });

    await waitForNextUpdate();

    act(() => {
      result.current.search.fetchNextPage();
    });

    await waitForNextUpdate();

    expect(spy).toBeCalledTimes(2);
    expect(spy).toHaveBeenNthCalledWith(1, expect.any(String), {
      params: {
        _q: 'something',
        limit: expect.any(Number),
        page: 1,
      },
    });
    expect(spy).toHaveBeenNthCalledWith(2, expect.any(String), {
      params: {
        _q: 'something',
        limit: expect.any(Number),
        page: 2,
      },
    });
  });

  test("does not fetch search next page, if there isn't one", async () => {
    const { result, waitForNextUpdate } = await setup();

    const spy = jest.fn().mockResolvedValueOnce({
      data: { results: [], pagination: { page: 1, pageCount: 1 } },
    });
    axiosInstance.get = spy;

    act(() => {
      result.current.searchFor('something');
    });

    await waitForNextUpdate();

    act(() => {
      result.current.search.fetchNextPage();
    });

    await waitForNextUpdate();

    expect(spy).toBeCalledTimes(1);
  });
});
