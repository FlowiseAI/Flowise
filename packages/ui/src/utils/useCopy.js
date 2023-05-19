import { useCallback } from 'react';
import { useEffect, useState } from 'react';

const getId = () => {
  return Math.random()
    .toString(32)
    .slice(2, 10);
};

const isBrowser = () => {
  return Boolean(
    typeof window !== 'undefined' &&
      window.document &&
      window.document.createElement
  );
};

const createElement = (id) => {
  const el = document.createElement('div');
  el.setAttribute('id', id);
  return el;
};

const usePortal = (selectId = getId()) => {
  const id = `zeit-ui-${selectId}`;
  const [elSnapshot, setElSnapshot] = useState(
    isBrowser ? createElement(id) : null
  );

  useEffect(() => {
    const hasElement = document.querySelector(`#${id}`);
    const el = hasElement || createElement(id);

    if (!hasElement) {
      document.body.appendChild(el);
    }
    setElSnapshot(el);
  }, []);

  return elSnapshot;
};

const defaultOptions = {
  onError: () => console.error('Failed to copy.', 'use-clipboard'),
};

const useCopy = (
  options = defaultOptions
) => {
  const el = usePortal('clipboard');

  const copyText = (el, text) => {
    if (!el || !text) return;
    const selection = window.getSelection();
    if (!selection) return;

    el.style.whiteSpace = 'pre';
    el.textContent = text;

    const range = window.document.createRange();
    selection.removeAllRanges();
    range.selectNode(el);
    selection.addRange(range);
    try {
      window.document.execCommand('copy');
    } catch (e) {
      options.onError && options.onError();
    }

    selection.removeAllRanges();
    if (el) {
      el.textContent = '';
    }
  };

  const copy = useCallback(
    (text) => {
      copyText(el, text);
    },
    [el]
  );

  return copy;
};

export default useCopy;
