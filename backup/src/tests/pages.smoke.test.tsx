import React from 'react';
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import Home from '../pages/Home';
import { I18nextProvider } from 'react-i18next';
import i18n from '../i18n';

describe.skip('pages smoke (skipped)', () => {
  it('renders home headings', () => {
    const { getByText } = render(
      <I18nextProvider i18n={i18n}>
        <Home />
      </I18nextProvider>
    );
    expect(getByText(/Shop/i)).toBeTruthy();
  });
});
