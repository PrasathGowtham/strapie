import React from 'react';
import { IntlProvider } from 'react-intl';
import { render as renderTL, fireEvent, screen, waitFor } from '@testing-library/react';
import { ThemeProvider, lightTheme } from '@strapi/design-system';
import axios from 'axios';

import LogoInput from '../index';

const getFakeSize = jest.fn(() => ({
  width: 500,
  height: 500,
}));

global.Image = class extends Image {
  constructor() {
    super();
    setTimeout(() => {
      const { width, height } = getFakeSize();
      this.width = width;
      this.height = height;
      this.onload();
    }, 100);
  }
};

jest.mock('axios', () => ({
  ...jest.requireActual('axios'),
  get: jest.fn().mockResolvedValue({
    data: new Blob(['my-image'], { type: 'image/png' }),
    headers: {
      'content-type': 'image/png',
    },
    config: {
      url: 'some-png',
    },
  }),
}));

const render = (props) =>
  renderTL(
    <ThemeProvider theme={lightTheme}>
      <IntlProvider locale="en" messages={{}} textComponent="span">
        <LogoInput
          {...props}
          defaultLogo="/admin/defaultLogo.png"
          onChangeLogo={jest.fn()}
          onResetMenuLogo={jest.fn()}
        />
      </IntlProvider>
    </ThemeProvider>
  );

describe('ApplicationsInfosPage || LogoInput', () => {
  describe('logo input', () => {
    it('should match snapshot', () => {
      render();

      expect(document.body).toMatchSnapshot();
    });
  });

  describe('from computer', () => {
    it('should render upload modal with from computer tab', () => {
      render();
      const changeLogoButton = document.querySelector('button');
      fireEvent.click(changeLogoButton);

      expect(document.body).toMatchSnapshot();
    });

    it('should show error message when uploading wrong file format', async () => {
      render();
      const changeLogoButton = document.querySelector('button');
      fireEvent.click(changeLogoButton);

      const file = new File(['(⌐□_□)'], 'michka.gif', { type: 'image/gif' });
      const fileInput = document.querySelector('[type="file"]');

      fireEvent.change(fileInput, {
        target: { files: [file] },
      });

      await waitFor(() =>
        expect(
          screen.getByText('Wrong format uploaded (accepted formats only: jpeg, jpg, png, svg).')
        ).toBeInTheDocument()
      );
    });

    it('should show error message when uploading unauthorized width/height', async () => {
      getFakeSize.mockImplementationOnce(() => ({
        width: 5000,
        height: 5000,
      }));

      render({ initialStep: 'upload' });
      const changeLogoButton = document.querySelector('button');
      fireEvent.click(changeLogoButton);

      const file = new File(['(⌐□_□)'], 'michka.png', { type: 'image/png' });
      const fileInput = document.querySelector('[type="file"]');

      fireEvent.change(fileInput, {
        target: { files: [file] },
      });

      await waitFor(() =>
        expect(
          screen.getByText(
            'The file uploaded is too large (max dimension: 750x750, max file size: 100KB)'
          )
        ).toBeInTheDocument()
      );
    });

    it('should show error message when uploading unauthorized file size', async () => {
      render({ initialStep: 'upload' });
      const changeLogoButton = document.querySelector('button');
      fireEvent.click(changeLogoButton);

      const file = new File([new Blob(['1'.repeat(1024 * 1024 + 1)])], 'michka.png', {
        type: 'image/png',
      });

      const fileInput = document.querySelector('[type="file"]');

      fireEvent.change(fileInput, {
        target: { files: [file] },
      });

      await waitFor(() =>
        expect(
          screen.getByText(
            'The file uploaded is too large (max dimension: 750x750, max file size: 100KB)'
          )
        ).toBeInTheDocument()
      );
    });

    it('should accept upload and lead user to next modal', async () => {
      render({ initialStep: 'upload' });
      const changeLogoButton = document.querySelector('button');
      fireEvent.click(changeLogoButton);

      const file = new File(['(⌐□_□)'], 'michka.png', { type: 'image/png' });

      const fileInput = document.querySelector('[type="file"]');

      fireEvent.change(fileInput, {
        target: { files: [file] },
      });

      await waitFor(() => expect(screen.getByText('Pending logo')).toBeInTheDocument());
    });

    it('should let user choose another logo', async () => {
      render({ initialStep: 'upload' });
      const changeLogoButton = document.querySelector('button');
      fireEvent.click(changeLogoButton);

      const file = new File(['(⌐□_□)'], 'michka.png', { type: 'image/png' });

      const fileInput = document.querySelector('[type="file"]');

      fireEvent.change(fileInput, {
        target: { files: [file] },
      });

      await waitFor(() => expect(screen.getByText('Pending logo')).toBeInTheDocument());

      fireEvent.click(screen.getByText('Choose another logo'));

      await waitFor(() => expect(screen.getByText('Upload logo')).toBeInTheDocument());
    });
  });

  describe('from url', () => {
    it('should render upload modal with from url tab', async () => {
      render();
      const changeLogoButton = document.querySelector('button');
      fireEvent.click(changeLogoButton);

      fireEvent.click(screen.getByText('From url'));

      expect(document.body).toMatchSnapshot();
    });

    it('should show error message when uploading wrong file format', async () => {
      axios.get.mockResolvedValueOnce({
        data: new Blob(['my-image'], { type: 'image/gif' }),
        headers: {
          'content-type': 'image/gif',
        },
        config: {
          url: 'some-gif',
        },
      });

      render();
      const changeLogoButton = screen.getByRole('button');
      fireEvent.click(changeLogoButton);
      fireEvent.click(screen.getByText('From url'));

      fireEvent.click(screen.getByText('Next'));

      await waitFor(() =>
        expect(
          screen.getByText('Wrong format uploaded (accepted formats only: jpeg, jpg, png, svg).')
        ).toBeInTheDocument()
      );
    });

    it('should show error message when uploading unauthorized width/height', async () => {
      getFakeSize.mockImplementationOnce(() => ({
        width: 850,
        height: 850,
      }));

      render();
      const changeLogoButton = document.querySelector('button');
      fireEvent.click(changeLogoButton);
      fireEvent.click(screen.getByText('From url'));
      fireEvent.click(screen.getByText('Next'));

      await waitFor(() =>
        expect(
          screen.getByText(
            'The file uploaded is too large (max dimension: 750x750, max file size: 100KB)'
          )
        ).toBeInTheDocument()
      );
    });

    it('should show error message when uploading unauthorized file-size', async () => {
      axios.get.mockResolvedValueOnce({
        data: new Blob(['1'.repeat(1024 * 1024 + 1)], { type: 'image/png' }),
        headers: {
          'content-type': 'image/png',
        },
        config: {
          url: 'some-png',
        },
      });

      render();

      const changeLogoButton = document.querySelector('button');
      fireEvent.click(changeLogoButton);
      fireEvent.click(screen.getByText('From url'));
      fireEvent.click(screen.getByText('Next'));

      await waitFor(() =>
        expect(
          screen.getByText(
            'The file uploaded is too large (max dimension: 750x750, max file size: 100KB)'
          )
        ).toBeInTheDocument()
      );
    });

    it('should accept upload and lead user to next modal', async () => {
      render();

      const changeLogoButton = document.querySelector('button');

      fireEvent.click(changeLogoButton);
      fireEvent.click(screen.getByText('From url'));
      fireEvent.click(screen.getByText('Next'));

      await waitFor(() => expect(screen.getByText('Pending logo')).toBeInTheDocument());
    });

    it('should let user choose another logo', async () => {
      render();
      const changeLogoButton = document.querySelector('button');
      fireEvent.click(changeLogoButton);
      fireEvent.click(screen.getByText('From url'));
      fireEvent.click(screen.getByText('Next'));

      await waitFor(() => expect(screen.getByText('Pending logo')).toBeInTheDocument());

      fireEvent.click(screen.getByText('Choose another logo'));

      await waitFor(() => expect(screen.getByText('Upload logo')).toBeInTheDocument());
    });
  });
});
