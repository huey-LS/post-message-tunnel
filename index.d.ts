export default class PostMessageTunnel {
  constructor (options: {
    whiteList: string[],
    isServer?: boolean,
    target?: string|HTMLIFrameElement
    maxCheckReady?: number;
    checkReadyTime?: number;
  });

  targetIframe?: HTMLIFrameElement;

  ready (
    callback: () => void
  ): void;

  post (
    eventName: string,
    content: any,
    callback?: (
      options: {
        message: any
      }
    ) => void
  ): void;
  post (
    eventName: string,
    callback?: (
      options: {
        message: any
      }
    ) => void
  ): void;

  subscribe (
    eventName: string,
    callback: (
      options: {
        message: any,
        receipt: (data: any) => void
      }
    ) => void
  ): void;
}
