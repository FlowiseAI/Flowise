import styles from '../../../assets/index.css';
import { createSignal, Show, splitProps, createEffect, onMount } from 'solid-js';
import { isNotDefined } from '@/utils/index';

export type PopupProps = {
  value?: any;
  isOpen?: boolean;
  onOpen?: () => void;
  onClose?: () => void;
};

function syntaxHighlight(json: any) {
  if (typeof json != 'string') {
    json = JSON.stringify(json, undefined, 2);
  }
  json = json.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  // eslint-disable-next-line
  return json.replace(
    /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+-]?\d+)?)/g,
    function (match: string) {
      let cls = 'number';
      if (/^"/.test(match)) {
        if (/:$/.test(match)) {
          cls = 'key';
        } else {
          cls = 'string';
        }
      } else if (/true|false/.test(match)) {
        cls = 'boolean';
      } else if (/null/.test(match)) {
        cls = 'null';
      }
      return '<span class="' + cls + '">' + match + '</span>';
    },
  );
}

export const Popup = (props: PopupProps) => {
  let preEl: HTMLPreElement | undefined;

  const [popupProps] = splitProps(props, ['onOpen', 'onClose', 'isOpen', 'value']);

  onMount(() => {
    if (preEl) {
      preEl.innerHTML = syntaxHighlight(JSON.stringify(props?.value, undefined, 2));
    }
  });

  const [isBotOpened, setIsBotOpened] = createSignal(
    // eslint-disable-next-line solid/reactivity
    popupProps.isOpen ?? false,
  );

  createEffect(() => {
    if (isNotDefined(props.isOpen) || props.isOpen === isBotOpened()) return;
    toggleBot();
  });

  const stopPropagation = (event: MouseEvent) => {
    event.stopPropagation();
  };

  const openBot = () => {
    setIsBotOpened(true);
    popupProps.onOpen?.();
    document.body.style.overflow = 'hidden';
  };

  const closeBot = () => {
    setIsBotOpened(false);
    popupProps.onClose?.();
    document.body.style.overflow = 'auto';
  };

  const toggleBot = () => {
    isBotOpened() ? closeBot() : openBot();
  };

  return (
    <Show when={isBotOpened()}>
      <style>{styles}</style>
      <div class="relative z-10" aria-labelledby="modal-title" role="dialog" aria-modal="true" style={{ 'z-index': 1100 }} on:click={closeBot}>
        <style>{styles}</style>
        <div class="fixed inset-0 bg-black bg-opacity-50 transition-opacity animate-fade-in" />
        <div class="fixed inset-0 z-10 overflow-y-auto">
          <div class="flex min-h-full items-center justify-center p-4 text-center sm:p-0">
            <div
              class="relative transform overflow-hidden rounded-lg text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg"
              style={{
                'background-color': 'transparent',
                'margin-left': '20px',
                'margin-right': '20px',
              }}
              on:click={stopPropagation}
              on:pointerdown={stopPropagation}
            >
              {props.value && (
                <div style={{ background: 'white', margin: 'auto', padding: '7px' }}>
                  <pre ref={preEl} />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Show>
  );
};
