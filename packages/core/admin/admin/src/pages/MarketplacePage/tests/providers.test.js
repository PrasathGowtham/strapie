import React from 'react';
import {
  render,
  waitFor,
  getByPlaceholderText,
  screen,
  getByText,
  queryByText,
  getByLabelText,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { IntlProvider } from 'react-intl';
import { QueryClient, QueryClientProvider } from 'react-query';
import { ThemeProvider, lightTheme } from '@strapi/design-system';

import { Router } from 'react-router-dom';
import { createMemoryHistory } from 'history';

import MarketPlacePage from '../index';
import server from './server';

// Increase the jest timeout to accommodate long running tests
jest.setTimeout(50000);
const toggleNotification = jest.fn();
jest.mock('../../../hooks/useNavigatorOnLine', () => jest.fn(() => true));
jest.mock('@strapi/helper-plugin', () => ({
  ...jest.requireActual('@strapi/helper-plugin'),
  useNotification: jest.fn(() => {
    return toggleNotification;
  }),
  pxToRem: jest.fn(),
  CheckPagePermissions: ({ children }) => children,
  useTracking: jest.fn(() => ({ trackUsage: jest.fn() })),
  useAppInfos: jest.fn(() => ({
    autoReload: true,
    dependencies: {
      '@strapi/plugin-documentation': '4.2.0',
      '@strapi/provider-upload-cloudinary': '4.2.0',
    },
    useYarn: true,
  })),
}));

const client = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

const waitForReload = async () => {
  await waitFor(
    () => {
      expect(screen.queryByTestId('loader')).toBe(null);
    },
    { timeout: 5000 }
  );
};

describe('Marketplace page - providers tab', () => {
  let renderedContainer;
  let history;

  beforeAll(() => server.listen());

  afterEach(() => {
    server.resetHandlers();
    // Clear the cache to isolate each test
    client.clear();
  });

  afterAll(() => server.close());

  beforeEach(async () => {
    history = createMemoryHistory();
    // Make sure each test isolated
    const { container } = render(
      <QueryClientProvider client={client}>
        <IntlProvider locale="en" messages={{}} textComponent="span">
          <ThemeProvider theme={lightTheme}>
            <Router history={history}>
              <MarketPlacePage />
            </Router>
          </ThemeProvider>
        </IntlProvider>
      </QueryClientProvider>
    );

    await waitForReload();

    const user = userEvent.setup();
    const providersTab = screen.getByRole('tab', { name: /providers/i });
    await user.click(providersTab);

    renderedContainer = container;
  });

  it('renders and matches the providers tab snapshot', async () => {
    // Check snapshot
    expect(renderedContainer.firstChild).toMatchSnapshot();

    const button = screen.getByRole('tab', { selected: true });
    const providersTabActive = getByText(button, /providers/i);

    const tabPanel = screen.getByRole('tabpanel');
    const providerCardText = getByText(tabPanel, 'Cloudinary');
    const pluginCardText = queryByText(tabPanel, 'Comments');
    const submitProviderText = queryByText(renderedContainer, 'Submit provider');

    expect(providersTabActive).not.toBe(null);
    expect(providerCardText).toBeVisible();
    expect(submitProviderText).toBeVisible();
    expect(pluginCardText).toEqual(null);
  });

  it('should return providers search results matching the query', async () => {
    const user = userEvent.setup();
    const input = getByPlaceholderText(renderedContainer, 'Search');
    await user.type(input, 'cloudina');
    const match = screen.getByText('Cloudinary');
    const notMatch = screen.queryByText('Mailgun');
    const plugin = screen.queryByText('Comments');

    expect(match).toBeVisible();
    expect(notMatch).toEqual(null);
    expect(plugin).toEqual(null);
  });

  it('should return empty providers search results given a bad query', async () => {
    const user = userEvent.setup();
    const providersTab = screen.getByRole('tab', { name: /providers/i });
    await user.click(providersTab);
    const input = getByPlaceholderText(renderedContainer, 'Search');
    const badQuery = 'asdf';
    await user.type(input, badQuery);
    const noResult = screen.getByText(`No result for "${badQuery}"`);

    expect(noResult).toBeVisible();
  });

  it('shows the installed text for installed providers', async () => {
    const user = userEvent.setup();
    // Open providers tab
    const providersTab = screen.getByRole('tab', { name: /providers/i });
    await user.click(providersTab);

    // Provider that's already installed
    const alreadyInstalledCard = screen
      .getAllByTestId('npm-package-card')
      .find((div) => div.innerHTML.includes('Cloudinary'));
    const alreadyInstalledText = queryByText(alreadyInstalledCard, /installed/i);
    expect(alreadyInstalledText).toBeVisible();

    // Provider that's not installed
    const notInstalledCard = screen
      .getAllByTestId('npm-package-card')
      .find((div) => div.innerHTML.includes('Rackspace'));
    const notInstalledText = queryByText(notInstalledCard, /copy install command/i);
    expect(notInstalledText).toBeVisible();
  });

  it('shows providers filters popover', async () => {
    const user = userEvent.setup();
    const filtersButton = screen.getByTestId('filters-button');

    // Only show collections filters on providers
    const providersTab = screen.getByRole('tab', { name: /providers/i });
    await user.click(providersTab);
    await user.click(filtersButton);
    screen.getByLabelText(/no collections selected/i);
  });

  it('shows the collections filter options', async () => {
    const user = userEvent.setup();
    const filtersButton = screen.getByTestId('filters-button');
    await user.click(filtersButton);

    const collectionsButton = screen.getByTestId('Collections-button');

    await user.click(collectionsButton);

    const mockedServerCollections = {
      'Made by official partners': 0,
      'Made by Strapi': 6,
      'Made by the community': 2,
      Verified: 6,
    };

    Object.entries(mockedServerCollections).forEach(([collectionName, count]) => {
      const option = screen.getByTestId(`${collectionName}-${count}`);
      expect(option).toBeVisible();
    });
  });

  it('filters a collection option', async () => {
    const user = userEvent.setup();
    const filtersButton = screen.getByTestId('filters-button');
    await user.click(filtersButton);

    const collectionsButton = screen.getByTestId('Collections-button');
    await user.click(collectionsButton);

    const option = screen.getByRole('option', { name: `Made by Strapi (6)` });
    await user.click(option);

    await waitForReload();

    const optionTag = screen.getByRole('button', { name: 'Made by Strapi' });
    expect(optionTag).toBeVisible();

    const collectionCards = screen.getAllByTestId('npm-package-card');
    expect(collectionCards.length).toEqual(2);

    const collectionPlugin = screen.getByText('Amazon SES');
    const notCollectionPlugin = screen.queryByText('Cloudinary');
    expect(collectionPlugin).toBeVisible();
    expect(notCollectionPlugin).toEqual(null);
  });

  it('filters multiple collection options', async () => {
    const user = userEvent.setup();

    await user.click(screen.getByTestId('filters-button'));
    await user.click(screen.getByTestId('Collections-button'));
    await user.click(screen.getByRole('option', { name: `Made by Strapi (6)` }));

    await waitForReload();

    await user.click(screen.getByTestId('filters-button'));
    await user.click(screen.getByRole('button', { name: `1 collection selected Made by Strapi` }));
    await user.click(screen.getByRole('option', { name: `Verified (6)` }));

    await waitForReload();

    const madeByStrapiTag = screen.getByRole('button', { name: 'Made by Strapi' });
    const verifiedTag = screen.getByRole('button', { name: 'Verified' });
    expect(madeByStrapiTag).toBeVisible();
    expect(verifiedTag).toBeVisible();
    expect(screen.getAllByTestId('npm-package-card').length).toEqual(3);
    expect(screen.getByText('Amazon SES')).toBeVisible();
    expect(screen.getByText('Nodemailer')).toBeVisible();
    expect(screen.queryByText('Cloudinary')).toEqual(null);
  });

  it('removes a filter option tag', async () => {
    const user = userEvent.setup();
    const filtersButton = screen.getByTestId('filters-button');
    await user.click(filtersButton);

    const collectionsButton = screen.getByTestId('Collections-button');
    await user.click(collectionsButton);

    const option = screen.getByRole('option', { name: `Made by Strapi (6)` });
    await user.click(option);

    await waitForReload();

    const optionTag = screen.getByRole('button', { name: 'Made by Strapi' });
    expect(optionTag).toBeVisible();

    await user.click(optionTag);

    expect(optionTag).not.toBeVisible();
    expect(history.location.search).toBe('?npmPackageType=provider&sort=name:asc');
  });

  it('only filters in the providers tab', async () => {
    const user = userEvent.setup();
    const filtersButton = screen.getByTestId('filters-button');
    await user.click(filtersButton);

    const collectionsButton = screen.getByTestId('Collections-button');
    await user.click(collectionsButton);

    const option = screen.getByRole('option', { name: `Made by Strapi (6)` });
    await user.click(option);

    await waitForReload();

    const collectionCards = screen.getAllByTestId('npm-package-card');
    expect(collectionCards.length).toBe(2);

    await user.click(screen.getByRole('tab', { name: /plugins/i }));

    const pluginCards = screen.getAllByTestId('npm-package-card');
    expect(pluginCards.length).toBe(5);

    await user.click(screen.getByRole('tab', { name: /providers/i }));
    expect(collectionCards.length).toBe(2);
  });

  it('shows the correct options on sort select', async () => {
    const user = userEvent.setup();
    const sortButton = screen.getByRole('button', { name: /Sort by/i });
    await user.click(sortButton);

    const alphabeticalOption = screen.getByRole('option', { name: 'Alphabetical order' });
    const newestOption = screen.getByRole('option', { name: 'Newest' });

    expect(alphabeticalOption).toBeVisible();
    expect(newestOption).toBeVisible();
  });

  it('changes the url on sort option select', async () => {
    const user = userEvent.setup();
    const sortButton = screen.getByRole('button', { name: /Sort by/i });
    await user.click(sortButton);

    const newestOption = screen.getByRole('option', { name: 'Newest' });
    await user.click(newestOption);
    expect(history.location.search).toEqual('?npmPackageType=provider&sort=submissionDate:desc');
  });

  it('shows github stars and weekly downloads count for each provider', async () => {
    const user = userEvent.setup();
    const providersTab = screen.getByRole('tab', { name: /providers/i });
    await user.click(providersTab);

    const cloudinaryCard = screen
      .getAllByTestId('npm-package-card')
      .find((div) => div.innerHTML.includes('Cloudinary'));

    const githubStarsLabel = getByLabelText(
      cloudinaryCard,
      /this provider was starred \d+ on GitHub/i
    );
    expect(githubStarsLabel).toBeVisible();

    const downloadsLabel = getByLabelText(
      cloudinaryCard,
      /this provider has \d+ weekly downloads/i
    );
    expect(downloadsLabel).toBeVisible();
  });
});
