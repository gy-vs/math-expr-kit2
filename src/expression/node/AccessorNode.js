import {
  isAccessorNode,
  isArrayNode,
  isConstantNode,
  isFunctionNode,
  isIndexNode,
  isNode,
  isObjectNode,
  isParenthesisNode,
  isSymbolNode
} from '../../utils/is.js'
import { getSafeProperty } from '../../utils/customs.js'
import { escape } from '../../utils/string.js'
import { factory } from '../../utils/factory.js'
import { accessFactory } from './utils/access.js'
import {
  SHORT_CIRCUIT,
  compileChainMember,
  isNullish
} from './utils/optionalChain.js'

const name = 'AccessorNode'
const dependencies = [
  'subset',
  'Node'
]

export const createAccessorNode = /* #__PURE__ */ factory(name, dependencies, ({ subset, Node }) => {
  const access = accessFactory({ subset })

  /**
   * Are parenthesis needed?
   * @private
   */
  function needParenthesis (node) {
    // TODO: maybe make a method on the nodes which tells whether they need parenthesis?
    return !(
      isAccessorNode(node) ||
        isArrayNode(node) ||
        isConstantNode(node) ||
        isFunctionNode(node) ||
        isObjectNode(node) ||
        isParenthesisNode(node) ||
        isSymbolNode(node))
  }

  /**
   * Stringify the index part of an accessor, rendering the accessor
   * operator as optional (`?.`) when needed.
   * For dot notation this replaces the dot (`a?.prop`), for bracket
   * notation it prepends the operator (`a?.[index]`).
   * @param {IndexNode} index
   * @param {Object} options
   * @param {boolean} optional
   * @return {string}
   * @private
   */
  function formatAccessorIndex (index, options, optional) {
    if (!optional) {
      return index.toString(options)
    }
    return index.dotNotation
      ? ('?.' + index.getObjectProperty())
      : ('?.' + index.toString(options))
  }

  class AccessorNode extends Node {
    /**
     * @constructor AccessorNode
     * @extends {Node}
     * Access an object property or get a matrix subset
     *
     * @param {Node} object                 The object from which to retrieve
     *                                      a property or subset.
     * @param {IndexNode} index             IndexNode containing ranges
     * @param {boolean} [optional=false]    Optional property describing whether
     *                                      this accessor uses optional chaining
     *                                      (`?.`) instead of a normal access
     *                                      (`.` or `[]`). When the object is
     *                                      `null` or `undefined`, an optional
     *                                      accessor short-circuits the whole
     *                                      chain and evaluates to `undefined`.
     */
    constructor (object, index, optional) {
      super()
      if (!isNode(object)) {
        throw new TypeError('Node expected for parameter "object"')
      }
      if (!isIndexNode(index)) {
        throw new TypeError('IndexNode expected for parameter "index"')
      }

      this.object = object
      this.index = index
      this.optional = optional === true
    }

    // readonly property name
    get name () {
      if (this.index) {
        return (this.index.isObjectProperty())
          ? this.index.getObjectProperty()
          : ''
      } else {
        return this.object.name || ''
      }
    }

    static name = name
    get type () { return name }
    get isAccessorNode () { return true }

    /**
     * Compile a node into a JavaScript function.
     * This basically pre-calculates as much as possible and only leaves open
     * calculations which depend on a dynamic scope with variables.
     * @param {Object} math     Math.js namespace with functions and constants.
     * @param {Object} argNames An object with argument names as key and `true`
     *                          as value. Used in the SymbolNode to optimize
     *                          for arguments from user assigned functions
     *                          (see FunctionAssignmentNode) or special symbols
     *                          like `end` (see IndexNode).
     * @return {function} Returns a function which can be called like:
     *                        evalNode(scope: Object, args: Object, context: *)
     */
    _compile (math, argNames) {
      // _compile is only invoked from outside of a chain: from within a chain
      // the node is compiled via _compileChain. Hence this is a chain
      // boundary, where a short-circuited optional chain becomes `undefined`.
      const evalChain = this._compileChain(math, argNames)
      return function evalAccessorNode (scope, args, context) {
        const result = evalChain(scope, args, context)
        return (result === SHORT_CIRCUIT) ? undefined : result
      }
    }

    /**
     * Compile the accessor as a member of an optional chain.
     * Unlike {@link _compile}, the returned function returns the
     * {@link SHORT_CIRCUIT} sentinel instead of accessing a property
     * when the preceding part of the chain already short-circuited, or
     * when this is an optional accessor and the object is nullish.
     * @param {Object} math
     * @param {Object} argNames
     * @return {function}
     */
    _compileChain (math, argNames) {
      const evalObject = compileChainMember(this.object, math, argNames)
      const evalIndex = this.index._compile(math, argNames)
      const optional = this.optional

      if (this.index.isObjectProperty()) {
        const prop = this.index.getObjectProperty()
        return function evalAccessorNode (scope, args, context) {
          // get a property from an object evaluated using the scope.
          const object = evalObject(scope, args, context)
          if (object === SHORT_CIRCUIT) return SHORT_CIRCUIT
          if (optional && isNullish(object)) return SHORT_CIRCUIT
          return getSafeProperty(object, prop)
        }
      } else {
        return function evalAccessorNode (scope, args, context) {
          const object = evalObject(scope, args, context)
          if (object === SHORT_CIRCUIT) return SHORT_CIRCUIT
          if (optional && isNullish(object)) return SHORT_CIRCUIT
          // we pass just object here instead of context:
          const index = evalIndex(scope, args, object)
          return access(object, index)
        }
      }
    }

    /**
     * Execute a callback for each of the child nodes of this node
     * @param {function(child: Node, path: string, parent: Node)} callback
     */
    forEach (callback) {
      callback(this.object, 'object', this)
      callback(this.index, 'index', this)
    }

    /**
     * Create a new AccessorNode whose children are the results of calling
     * the provided callback function for each child of the original node.
     * @param {function(child: Node, path: string, parent: Node): Node} callback
     * @returns {AccessorNode} Returns a transformed copy of the node
     */
    map (callback) {
      return new AccessorNode(
        this._ifNode(callback(this.object, 'object', this)),
        this._ifNode(callback(this.index, 'index', this)),
        this.optional
      )
    }

    /**
     * Create a clone of this node, a shallow copy
     * @return {AccessorNode}
     */
    clone () {
      return new AccessorNode(this.object, this.index, this.optional)
    }

    /**
     * Get string representation
     * @param {Object} options
     * @return {string}
     */
    _toString (options) {
      let object = this.object.toString(options)
      if (needParenthesis(this.object)) {
        object = '(' + object + ')'
      }

      return object + formatAccessorIndex(this.index, options, this.optional)
    }

    /**
     * Get HTML representation
     * @param {Object} options
     * @return {string}
     */
    _toHTML (options) {
      let object = this.object.toHTML(options)
      if (needParenthesis(this.object)) {
        object =
          '<span class="math-parenthesis math-round-parenthesis">(</span>' +
          object +
          '<span class="math-parenthesis math-round-parenthesis">)</span>'
      }

      if (!this.optional) {
        return object + this.index.toHTML(options)
      }

      if (this.index.dotNotation) {
        return object +
          '<span class="math-operator math-accessor-operator">?.</span>' +
          '<span class="math-symbol math-property">' +
          escape(this.index.getObjectProperty()) + '</span>'
      }

      return object +
        '<span class="math-operator math-accessor-operator">?.</span>' +
        this.index.toHTML(options)
    }

    /**
     * Get LaTeX representation
     * @param {Object} options
     * @return {string}
     */
    _toTex (options) {
      let object = this.object.toTex(options)
      if (needParenthesis(this.object)) {
        object = '\\left(\' + object + \'\\right)'
      }

      if (!this.optional) {
        return object + this.index.toTex(options)
      }

      if (this.index.dotNotation) {
        return object + '?.' + this.index.getObjectProperty()
      }

      return object + '?.' + this.index.toTex(options)
    }

    /**
     * Get a JSON representation of the node
     * @returns {Object}
     */
    toJSON () {
      return {
        mathjs: name,
        object: this.object,
        index: this.index,
        optional: this.optional
      }
    }

    /**
     * Instantiate an AccessorNode from its JSON representation
     * @param {Object} json
     *     An object structured like
     *     `{"mathjs": "AccessorNode", object: ..., index: ..., optional: false}`,
     *     where mathjs is optional. The `optional` property is optional itself
     *     (it defaults to `false`) for backwards compatibility with older
     *     serialized nodes.
     * @returns {AccessorNode}
     */
    static fromJSON (json) {
      return new AccessorNode(json.object, json.index, json.optional === true)
    }
  }

  return AccessorNode
}, { isClass: true, isNode: true })
