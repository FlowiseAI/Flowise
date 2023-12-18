import { createSignal } from 'solid-js';

type FeedbackContentDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (text: string) => void;
  backgroundColor?: string;
  textColor?: string;
};

const defaultBackgroundColor = '#ffffff';
const defaultTextColor = '#303235';

const FeedbackContentDialog = (props: FeedbackContentDialogProps) => {
  const [inputValue, setInputValue] = createSignal('');
  let inputRef: HTMLInputElement | HTMLTextAreaElement | undefined;

  const handleInput = (value: string) => setInputValue(value);

  const checkIfInputIsValid = () => inputValue() !== '' && inputRef?.reportValidity();

  const submit = () => {
    if (checkIfInputIsValid()) props.onSubmit(inputValue());
    setInputValue('');
  };

  const onClose = () => {
    props.onClose();
  };

  return (
    <>
      <div class="flex overflow-x-hidden overflow-y-auto fixed inset-0 z-[1002] outline-none focus:outline-none justify-center items-center">
        <div class="relative w-full my-6 mx-auto max-w-3xl">
          <div
            class="border-0 rounded-lg shadow-lg relative flex flex-col w-full bg-white outline-none focus:outline-none"
            style={{
              'background-color': props.backgroundColor ?? defaultBackgroundColor,
              color: props.textColor ?? defaultTextColor,
            }}
          >
            <div
              class="flex items-start justify-between p-5 border-b border-solid border-blueGray-200 rounded-t"
              style={{
                border: '1px solid #eeeeee',
              }}
            >
              <h3 class="text-2xl font-semibold">Provide additional feedback</h3>
              <button
                class="p-1 ml-auto bg-transparent border-0 text-black float-right text-xl leading-none font-semibold outline-none focus:outline-none"
                type="button"
                onClick={onClose}
              >
                <span class="bg-transparent block outline-none focus:outline-none">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    class="text-black h-6 w-6"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  >
                    <path d="M18 6 6 18" />
                    <path d="m6 6 12 12" />
                  </svg>
                </span>
              </button>
            </div>
            <div class="relative p-6 flex-auto">
              <textarea
                onInput={(e) => handleInput(e.currentTarget.value)}
                ref={inputRef as HTMLTextAreaElement}
                rows="4"
                class="block p-2.5 rounded-lg border focus:ring-blue-500 focus:border-blue-500 bg-transparent flex-1 w-full feedback-input disabled:opacity-50 disabled:cursor-not-allowed disabled:brightness-100 font-normal"
                style={{
                  border: '1px solid #eeeeee',
                  color: props.textColor ?? defaultTextColor,
                }}
                placeholder="What do you think of the response?"
                value={inputValue()}
              />
            </div>
            <div class="flex items-center justify-end p-4 border-t border-solid border-blueGray-200 rounded-b">
              <button
                class="bg-emerald-500 text-white active:bg-emerald-600 font-bold uppercase text-sm px-4 py-2 rounded shadow hover:shadow-lg outline-none focus:outline-none mr-1 mb-1 ease-linear transition-all duration-150"
                type="button"
                onClick={submit}
              >
                Submit Feedback
              </button>
            </div>
          </div>
        </div>
      </div>
      <div class="flex opacity-25 fixed inset-0 z-[1001] bg-black" />
    </>
  );
};

export default FeedbackContentDialog;
