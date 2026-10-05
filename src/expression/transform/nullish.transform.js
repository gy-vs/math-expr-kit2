import { createNullish } from '../../function/logical/nullish.js'
import { factory } from '../../utils/factory.js'

const name = 'nullish'
const dependencies = ['typed']

export const createNullishTransform = /* #__PURE__ */ factory(name, dependencies, ({ typed }) => {
  const nullish = createNullish({ typed })

  function nullishTransform (args, math, scope) {
    const left = args[0].compile().evaluate(scope)

    // the right-hand side is only evaluated when the left-hand side
    // is nullish (null or undefined)
    if (left !== null && left !== undefined) {
      return left
    }

    return nullish(left, args[1].compile().evaluate(scope))
  }

  nullishTransform.rawArgs = true

  return nullishTransform
}, { isTransformFunction: true })
