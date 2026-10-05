import { isAccessorNode, isFunctionNode } from '../../../utils/is.js'

/**
 * Sentinel thrown by the compiled code of an optional chaining link (`?.`)
 * when the value it operates on is nullish (null or undefined). The sentinel
 * propagates through the remaining links of the chain, and is converted into
 * `undefined` by the outermost link of the chain, see catchOptionalShortCircuit.
 */
export const OPTIONAL_SHORT_CIRCUIT = new Error('Optional chain short-circuited')

/**
 * Test whether a node can be a link in a chain of accessors and calls,
 * like the nodes in `a.b[2](3).c`. Only AccessorNode and FunctionNode
 * can be part of such a chain.
 * @param {Node} node
 * @return {boolean}
 */
export function isChainLink (node) {
  return isAccessorNode(node) || isFunctionNode(node)
}

/**
 * Test whether the chain of accessors and calls that this node is part of
 * contains an optional chaining link (`?.`), like `a?.b` or `a?.(2)`.
 * The chain is followed via the object of an AccessorNode and via the
 * function of a FunctionNode.
 * @param {Node} node
 * @return {boolean}
 */
export function hasOptionalChaining (node) {
  let current = node
  while (isChainLink(current)) {
    if ((isAccessorNode(current) && current.optionalChaining) ||
        (isFunctionNode(current) && current.optional)) {
      return true
    }
    current = isAccessorNode(current) ? current.object : current.fn
  }
  return false
}

/**
 * Wrap the evaluator of the outermost link of a chain containing optional
 * chaining (`?.`): convert a short-circuit of one of the links of the chain
 * into a result of `undefined` for the whole chain.
 * @param {function} evaluate
 * @return {function}
 */
export function catchOptionalShortCircuit (evaluate) {
  return function evaluateOptionalChain (scope, args, context) {
    try {
      return evaluate(scope, args, context)
    } catch (err) {
      if (err === OPTIONAL_SHORT_CIRCUIT) {
        return undefined
      }
      throw err
    }
  }
}
