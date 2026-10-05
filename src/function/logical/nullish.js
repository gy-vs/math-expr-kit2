import { factory } from '../../utils/factory.js'

const name = 'nullish'
const dependencies = ['typed']

export const createNullish = /* #__PURE__ */ factory(name, dependencies, ({ typed }) => {
  /**
   * Nullish coalescing operator `??`. Returns the right-hand side operand
   * when the left-hand side operand is null or undefined, and otherwise
   * returns the left-hand side operand.
   *
   * Syntax:
   *
   *    math.nullish(x, y)
   *
   * Examples:
   *
   *    math.nullish(null, 42)      // returns 42
   *    math.nullish(undefined, 42) // returns 42
   *    math.nullish(0, 42)         // returns 0
   *    math.nullish(false, 42)     // returns false
   *
   * See also:
   *
   *    and, or, not
   *
   * @param  {*} x First value to check
   * @param  {*} y Fallback value
   * @return {*} Returns y when x is null or undefined, otherwise returns x
   */
  return typed(name, {
    'any, any': (x, y) => (x === null || x === undefined) ? y : x
  })
})
