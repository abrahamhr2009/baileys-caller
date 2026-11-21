declare module "qrcode" {
  function toDataURL(text: string, options?: any): Promise<string>;
  export { toDataURL };
  export default { toDataURL };
}
