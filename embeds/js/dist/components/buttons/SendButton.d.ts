import { JSX } from 'solid-js/jsx-runtime';
type SendButtonProps = {
    sendButtonColor?: string;
    isDisabled?: boolean;
    isLoading?: boolean;
    disableIcon?: boolean;
} & JSX.ButtonHTMLAttributes<HTMLButtonElement>;
export declare const SendButton: (props: SendButtonProps) => JSX.Element;
export declare const DeleteButton: (props: SendButtonProps) => JSX.Element;
export declare const Spinner: (props: JSX.SvgSVGAttributes<SVGSVGElement>) => JSX.Element;
export {};
//# sourceMappingURL=SendButton.d.ts.map