/**
 * Host half of the DeepSeek balance bundle.
 *
 * The floating card lives in the Client half (`./client`). It reads the
 * balance of the signed-in DeepSeek platform account through the generated
 * `account` Remote namespace, so this side registers no services, routes, or
 * credentials of its own.
 */
export function apply() {}
