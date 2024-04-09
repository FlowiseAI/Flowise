import { JSX } from 'solid-js/jsx-runtime';
type ImageUploadButtonProps = {
    buttonColor?: string;
    isDisabled?: boolean;
    isLoading?: boolean;
    disableIcon?: boolean;
} & JSX.ButtonHTMLAttributes<HTMLButtonElement>;
export declare const ImageUploadButton: (props: ImageUploadButtonProps) => JSX.Element;
export declare const Spinner: (props: JSX.SvgSVGAttributes<SVGSVGElement>) => JSX.Element;
export {};
//# sourceMappingURL=ImageUploadButton.d.ts.map