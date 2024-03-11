export {};

declare module 'solid-js' {
  namespace JSX {
    interface CustomEvents {
      click: MouseEvent;
      pointerdown: PointerEvent;
    }
  }
}
