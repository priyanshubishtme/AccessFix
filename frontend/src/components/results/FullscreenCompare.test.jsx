import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FullscreenCompare } from './FullscreenCompare.jsx';

const scan = (after = true) => ({
  id: 's_compare',
  shots: { before: true, after },
  viewport: { width: 1280, height: 720 },
  marks: [{ violationId: 'v1', place: 'pin', x: 0.3, y: 0.4, w: 0.1, h: 0.1 }],
  violations: [
    {
      id: 'v1',
      impact: 'serious',
      ruleId: 'image-alt',
      title: 'Image needs alternative text',
      explanation: 'People using a screen reader need a text equivalent.',
      node: { target: ['img.hero'], html: '<img class="hero">' },
    },
  ],
  manualReview: [],
});

function openDialog(props = {}) {
  render(<FullscreenCompare scan={scan()} {...props} />);
  fireEvent.click(screen.getByRole('button', { name: 'Full screen' }));
  return screen.getByRole('dialog', { name: 'Full-screen comparison' });
}

describe('full-screen comparison', () => {
  beforeEach(() => localStorage.clear());

  it('opens a labelled modal with slider as the default and all four modes', () => {
    const dialog = openDialog();
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(screen.getByRole('button', { name: 'Slider' })).toHaveAttribute('aria-pressed', 'true');
    for (const label of ['Side by side', 'Before only', 'After only']) {
      expect(screen.getByRole('button', { name: label })).toBeInTheDocument();
    }
    expect(
      within(dialog).getByRole('slider', { name: 'Before and after comparison' }),
    ).toHaveAttribute('aria-valuenow', '50');
  });

  it('moves the slider by keyboard and pointer and announces its value', () => {
    const slider = openDialog().querySelector('[role="slider"]');
    fireEvent.keyDown(slider, { key: 'ArrowRight' });
    expect(slider).toHaveAttribute('aria-valuenow', '51');
    fireEvent.keyDown(slider, { key: 'ArrowRight', shiftKey: true });
    expect(slider).toHaveAttribute('aria-valuenow', '61');
    fireEvent.keyDown(slider, { key: 'Home' });
    expect(slider).toHaveAttribute('aria-valuenow', '0');
    fireEvent.keyDown(slider, { key: 'End' });
    expect(slider).toHaveAttribute('aria-valuenow', '100');

    vi.spyOn(slider, 'getBoundingClientRect').mockReturnValue({
      left: 20,
      width: 200,
      top: 0,
      height: 100,
      right: 220,
      bottom: 100,
    });
    fireEvent.pointerDown(slider, { pointerId: 1, pointerType: 'touch', clientX: 120, buttons: 1 });
    expect(slider).toHaveAttribute('aria-valuenow', '50');
    fireEvent.pointerMove(slider, { pointerId: 1, pointerType: 'touch', clientX: 170, buttons: 1 });
    expect(slider).toHaveAttribute('aria-valuenow', '75');
    expect(screen.getByText('Showing 75% of the after image.')).toBeInTheDocument();
  });

  it('remembers the selected compare mode and labels verified issue status', () => {
    const verification = {
      resolved: [scan().violations[0]],
      remaining: [],
      regressions: [],
    };
    const dialog = openDialog({ verification });
    fireEvent.click(screen.getByRole('button', { name: 'Side by side' }));
    expect(localStorage.getItem('accessfix.compare-mode')).toBe('side');
    expect(within(dialog).getAllByText('Before').length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole('button', { name: 'Close full-screen comparison' }));
    fireEvent.click(screen.getByRole('button', { name: 'Full screen' }));
    expect(screen.getByRole('button', { name: 'Side by side' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getAllByText('Resolved').length).toBeGreaterThan(0);
  });

  it('applies the selected color simulation to both compare images', () => {
    openDialog({ colorFilter: 'grayscale(1)' });
    expect(screen.getByAltText('Page before fixes')).toHaveStyle({ filter: 'grayscale(1)' });
    expect(screen.getByAltText('Page after verified fixes')).toHaveStyle({ filter: 'grayscale(1)' });
  });

  it('bounds zoom, resets to fit, and navigates issues', () => {
    openDialog();
    const zoomIn = screen.getByRole('button', { name: 'Zoom in' });
    for (let index = 0; index < 12; index += 1) fireEvent.click(zoomIn);
    expect(screen.getByText('250%')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Fit' }));
    expect(screen.getByText('100%', { selector: '[aria-live="polite"]' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Next issue' })).toBeEnabled();
  });

  it('shows the before image before fixes, and an actionable expired-screenshot state', () => {
    const beforeOnly = scan(false);
    render(<FullscreenCompare scan={beforeOnly} onRescan={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Full screen' }));
    expect(
      screen.getByText(/Apply verified fixes to create an after screenshot/),
    ).toBeInTheDocument();
    fireEvent.error(screen.getByAltText('Page before fixes'));
    expect(screen.getByRole('heading', { name: 'Screenshot expired' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Rescan to refresh' })).toBeInTheDocument();
  });
});
