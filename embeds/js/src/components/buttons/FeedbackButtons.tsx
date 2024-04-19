import { JSX, Show } from 'solid-js';
import { Spinner } from './SendButton';
import { ClipboardIcon, ThumbsDownIcon, ThumbsUpIcon } from '../icons';

type RatingButtonProps = {
  sendButtonColor?: string;
  isDisabled?: boolean;
  isLoading?: boolean;
  disableIcon?: boolean;
  rating?: string;
} & JSX.ButtonHTMLAttributes<HTMLButtonElement>;

export const CopyToClipboardButton = (props: RatingButtonProps) => {
  return (
    <button
      disabled={props.isDisabled || props.isLoading}
      {...props}
      class={
        'p-2 justify-center font-semibold text-white focus:outline-none flex items-center disabled:opacity-50 disabled:cursor-not-allowed disabled:brightness-100 transition-all filter hover:brightness-90 active:brightness-75 chatbot-button ' +
        props.class
      }
      style={{ background: 'transparent', border: 'none' }}
      title="Copy to clipboard"
    >
      <Show when={!props.isLoading} fallback={<Spinner class="text-white" />}>
        <ClipboardIcon color={props.sendButtonColor} class={'send-icon flex ' + (props.disableIcon ? 'hidden' : '')} />
      </Show>
    </button>
  );
};

export const ThumbsUpButton = (props: RatingButtonProps) => {
  return (
    <button
      type="submit"
      disabled={props.isDisabled || props.isLoading}
      {...props}
      class={
        'p-2 justify-center font-semibold text-white focus:outline-none flex items-center disabled:opacity-50 disabled:cursor-not-allowed disabled:brightness-100 transition-all filter hover:brightness-90 active:brightness-75 chatbot-button ' +
        props.class
      }
      style={{ background: 'transparent', border: 'none' }}
      title="Thumbs Up"
    >
      <Show when={!props.isLoading} fallback={<Spinner class="text-white" />}>
        <ThumbsUpIcon color={props.sendButtonColor} class={'send-icon flex ' + (props.disableIcon ? 'hidden' : '')} />
      </Show>
    </button>
  );
};

export const ThumbsDownButton = (props: RatingButtonProps) => {
  return (
    <button
      type="submit"
      disabled={props.isDisabled || props.isLoading}
      {...props}
      class={
        'p-2 justify-center font-semibold text-white focus:outline-none flex items-center disabled:opacity-50 disabled:cursor-not-allowed disabled:brightness-100 transition-all filter hover:brightness-90 active:brightness-75 chatbot-button ' +
        props.class
      }
      style={{ background: 'transparent', border: 'none' }}
      title="Thumbs Down"
    >
      <Show when={!props.isLoading} fallback={<Spinner class="text-white" />}>
        <ThumbsDownIcon color={props.sendButtonColor} class={'send-icon flex ' + (props.disableIcon ? 'hidden' : '')} />
      </Show>
    </button>
  );
};
