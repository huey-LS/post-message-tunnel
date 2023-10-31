export default class PostMessageTunnel {
  constructor (options: {
    whiteList: string[],
    /**
     * 标记，该对象为服务方
     * 会等待另一个tunnel来建立连接
     */
    isServer?: boolean,
    /**
     * 发送消息的目标iframe,
     * 如果是string，则会创建一个iframe,其src=target
     */
    target?: string | HTMLIFrameElement;
    /**
     * 最大重试次数
     */
    maxCheckReady?: number;
    /**
     * 每次重试的间隔时间
     */
    checkReadyTime?: number;
    /**
     * 目标iframe的origin
     */
    origin?: string;
  });

  /**
   * 建立连接到iframe
   */
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
    callback: (
      options: {
        message: any,
        receipt: (data: any) => void
      }
    ) => void
  ): void;

  destroy (): void;
}
