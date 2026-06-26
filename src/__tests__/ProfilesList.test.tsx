import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import ProfilesList from '../components/profiles/ProfilesList';
import * as api from '../lib/api';
import { vi, describe, it, expect, beforeEach } from 'vitest';

vi.mock('@/lib/api');

describe('ProfilesList highlight', () => {
  beforeEach(() => {
    // @ts-ignore
    (api.getProfiles as any).mockResolvedValue({ results: [{ id: 123, position_title: 'Dev', client: 1, status: 'pending', priority: 'medium', service_type: 'full_time', positions_available: 1, salary_min: 0, salary_max: 0, salary_currency: 'USD', location: 'Remote', modality: 'remote', created_at: new Date().toISOString() }] });
  });

  it('scrolls to and highlights profile row when highlightId is provided', async () => {
    const scrollIntoViewMock = vi.fn();
    // Provide a mocked implementation of scrollIntoView for the test DOM
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    window.HTMLElement.prototype.scrollIntoView = scrollIntoViewMock;

    render(<ProfilesList highlightId={123} />);

    await waitFor(() => {
      expect(screen.getByText('Dev')).toBeInTheDocument();
    });

    // The row should exist and we should have called scrollIntoView
    const row = document.getElementById('profile-row-123');
    expect(row).not.toBeNull();
    expect(scrollIntoViewMock).toHaveBeenCalled();

    // Also expect highlight classes applied (ring class used in component)
    expect(row?.classList.contains('ring-2')).toBe(true);
  });
});
