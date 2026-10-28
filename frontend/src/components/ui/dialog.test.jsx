import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { Dialog } from './dialog.jsx';

function DialogHarness({ onClose = vi.fn() }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Open preview
      </button>
      <Dialog
        open={open}
        onClose={() => {
          onClose();
          setOpen(false);
        }}
        labelledBy="dialog-title"
      >
        <h2 id="dialog-title">Preview</h2>
        <button type="button">First</button>
        <button type="button">Last</button>
      </Dialog>
    </>
  );
}

describe('Dialog', () => {
  it('is modal, traps keyboard focus, locks scroll, closes with Escape, and restores focus', () => {
    const onClose = vi.fn();
    const { unmount } = render(<DialogHarness onClose={onClose} />);
    const opener = screen.getByRole('button', { name: 'Open preview' });
    opener.focus();
    fireEvent.click(opener);
    const dialog = screen.getByRole('dialog', { name: 'Preview' });

    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(document.body.style.overflow).toBe('hidden');
    expect(screen.getByRole('button', { name: 'First' })).toHaveFocus();

    screen.getByRole('button', { name: 'Last' }).focus();
    fireEvent.keyDown(document, { key: 'Tab' });
    expect(screen.getByRole('button', { name: 'First' })).toHaveFocus();
    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true });
    expect(screen.getByRole('button', { name: 'Last' })).toHaveFocus();

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledOnce();
    expect(opener).toHaveFocus();
    expect(document.body.style.overflow).toBe('');
    unmount();
  });
});
