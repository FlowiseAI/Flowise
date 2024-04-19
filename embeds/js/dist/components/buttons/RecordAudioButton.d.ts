import { JSX } from 'solid-js/jsx-runtime';
type RecordAudioButtonProps = {
    buttonColor?: string;
    isDisabled?: boolean;
    isLoading?: boolean;
    disableIcon?: boolean;
} & JSX.ButtonHTMLAttributes<HTMLButtonElement>;
export declare const RecordAudioButton: (props: RecordAudioButtonProps) => JSX.Element;
export declare const Spinner: (props: JSX.SvgSVGAttributes<SVGSVGElement>) => JSX.Element;
export {};
//# sourceMappingURL=RecordAudioButton.d.ts.map