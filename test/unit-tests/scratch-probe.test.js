import math from '../../src/defaultInstance.js'
describe('scratch probe', () => {
  it('checks ?? and ?.', () => {
    try { console.log('?? =>', math.evaluate('1 ?? 2')) } catch (e) { console.log('?? error:', e.message) }
    try { console.log('?. =>', math.evaluate('a?.b', {a: {b: 1}})) } catch (e) { console.log('?. error:', e.message) }
  })
})
