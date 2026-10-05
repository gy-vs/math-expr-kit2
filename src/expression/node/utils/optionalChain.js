/**
 * Internal utilities for implementing the optional chaining operator `?.`.
 *
 * A chain member (AccessorNode or FunctionNode) that is reached after an
 * optional part of a chain returns the sentinel {@link SHORT_CIRCUIT}
 * instead of evaluating the rest of the chain. The outermost chain member
 * turns the sentinel back into `undefined` at the boundary of the chain,
 * matching the behavior of JavaScript optional chaining.
 */

/**
 * Sentinel used to signal that an optional chain short-circuited:
 * the object before the `?.` operator was `null` or `undefined`.
 * It must be a value that cannot come from user data, hence a Symbol.
 */
export const SHORT_CIRCUIT = Symbol('optional chain short-circuit')

/**
 * Returns true when a value is `null` or `undefined`, i.e. the values
 * for which an optional chain short-circuits (same as JavaScript).
 * @param {*} value
 * @returns {boolean}
 */
export function isNullish (value) {
  return value === null || value === undefined
}

/**
 * Compile a chain member (an AccessorNode or FunctionNode) as part of a
 * chain. The resulting function returns {@link SHORT_CIRCUIT} instead of
 * evaluating its own access or invocation when the value of the preceding
 * part of the chain is already the short-circuit sentinel.
 *
 * Non-chain nodes are compiled normally.
 *
 * @param {Node} node
 * @param {Object} math
 * @param {Object} argNames
 * @returns {function}
 */
export function compileChainMember (node, math, argNames) {
  if (node && typeof node._compileChain === 'function') {
    return node._compileChain(math, argNames)
  }
  return node._compile(math, argNames)
}
