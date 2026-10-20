declare module "cookie" {
  export function serialize(
    name: string,
    value: string,
    options?: { httpOnly?: boolean; secure?: boolean; sameSite?: "none" | "lax" | "strict"; partitioned?: boolean; path?: string; maxAge?: number }
  ): string;
  export function parse(
    str: string,
    options?: Record<string, unknown>
  ): Record<string, string>;
}
