import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { useKeyboardShortcuts } from '../useKeyboardShortcuts';

describe('useKeyboardShortcuts', () => {
  beforeEach(() => {
    // Clean up DOM
    document.body.innerHTML = '';
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should call handler on matching shortcut', () => {
    const handler = vi.fn();

    renderHook(() =>
      useKeyboardShortcuts([{ key: 'c', meta: true, handler }])
    );

    act(() => {
      const event = new KeyboardEvent('keydown', {
        key: 'c',
        metaKey: true,
      });
      document.dispatchEvent(event);
    });

    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('should support Ctrl as meta key (Windows)', () => {
    const handler = vi.fn();

    renderHook(() =>
      useKeyboardShortcuts([{ key: 'c', meta: true, handler }])
    );

    act(() => {
      const event = new KeyboardEvent('keydown', {
        key: 'c',
        ctrlKey: true,
      });
      document.dispatchEvent(event);
    });

    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('should not trigger when input is focused', () => {
    const handler = vi.fn();

    renderHook(() =>
      useKeyboardShortcuts([{ key: 'n', handler }])
    );

    // Simuliere fokussiertes Input
    const input = document.createElement('input');
    document.body.appendChild(input);
    input.focus();

    act(() => {
      const event = new KeyboardEvent('keydown', {
        key: 'n',
        bubbles: true,
      });
      input.dispatchEvent(event);
    });

    expect(handler).not.toHaveBeenCalled();

    document.body.removeChild(input);
  });

  it('should not trigger when textarea is focused', () => {
    const handler = vi.fn();

    renderHook(() =>
      useKeyboardShortcuts([{ key: 'n', handler }])
    );

    const textarea = document.createElement('textarea');
    document.body.appendChild(textarea);
    textarea.focus();

    act(() => {
      const event = new KeyboardEvent('keydown', {
        key: 'n',
        bubbles: true,
      });
      textarea.dispatchEvent(event);
    });

    expect(handler).not.toHaveBeenCalled();

    document.body.removeChild(textarea);
  });

  it('should support multiple keys', () => {
    const handler = vi.fn();

    renderHook(() =>
      useKeyboardShortcuts([{ key: ['Delete', 'Backspace'], handler }])
    );

    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Delete' }));
    });

    expect(handler).toHaveBeenCalledTimes(1);

    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Backspace' }));
    });

    expect(handler).toHaveBeenCalledTimes(2);
  });

  it('should respect disabled flag', () => {
    const handler = vi.fn();

    renderHook(() =>
      useKeyboardShortcuts([{ key: 'c', meta: true, handler, disabled: true }])
    );

    act(() => {
      const event = new KeyboardEvent('keydown', {
        key: 'c',
        metaKey: true,
      });
      document.dispatchEvent(event);
    });

    expect(handler).not.toHaveBeenCalled();
  });

  it('should support Alt key', () => {
    const handler = vi.fn();

    renderHook(() =>
      useKeyboardShortcuts([{ key: 'ArrowRight', alt: true, handler }])
    );

    act(() => {
      const event = new KeyboardEvent('keydown', {
        key: 'ArrowRight',
        altKey: true,
      });
      document.dispatchEvent(event);
    });

    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('should not trigger Alt shortcut without Alt key', () => {
    const handler = vi.fn();

    renderHook(() =>
      useKeyboardShortcuts([{ key: 'ArrowRight', alt: true, handler }])
    );

    act(() => {
      const event = new KeyboardEvent('keydown', {
        key: 'ArrowRight',
      });
      document.dispatchEvent(event);
    });

    expect(handler).not.toHaveBeenCalled();
  });

  it('should support Shift key', () => {
    const handler = vi.fn();

    renderHook(() =>
      useKeyboardShortcuts([{ key: 'a', shift: true, handler }])
    );

    act(() => {
      const event = new KeyboardEvent('keydown', {
        key: 'a',
        shiftKey: true,
      });
      document.dispatchEvent(event);
    });

    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('should prevent default on matching shortcut', () => {
    const handler = vi.fn();

    renderHook(() =>
      useKeyboardShortcuts([{ key: 'c', meta: true, handler }])
    );

    let defaultPrevented = false;

    act(() => {
      const event = new KeyboardEvent('keydown', {
        key: 'c',
        metaKey: true,
        cancelable: true,
      });
      Object.defineProperty(event, 'preventDefault', {
        value: () => {
          defaultPrevented = true;
        },
      });
      document.dispatchEvent(event);
    });

    expect(defaultPrevented).toBe(true);
  });

  it('should cleanup event listener on unmount', () => {
    const handler = vi.fn();
    const removeEventListenerSpy = vi.spyOn(document, 'removeEventListener');

    const { unmount } = renderHook(() =>
      useKeyboardShortcuts([{ key: 'n', handler }])
    );

    unmount();

    expect(removeEventListenerSpy).toHaveBeenCalledWith(
      'keydown',
      expect.any(Function)
    );

    removeEventListenerSpy.mockRestore();
  });
});
