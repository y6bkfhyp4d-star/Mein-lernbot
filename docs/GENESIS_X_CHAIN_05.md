# GENESIS X 0.5 – isolated numeric → logic chain

**Research experiment.** This is a fixed two-stage pipeline, not autonomous planning or general problem solving.

- Input `{numeric:{training,validation,...},logic:{training,validation,...},cases:[{x,b}]}`.
- Stage 1: route numeric examples to the existing 0.2 composer; stage 2: route Boolean comparison examples to the existing 0.3 logic engine.
- For each case, evaluate the numeric candidate on `x` and then the Boolean rule on the numeric result as `a` and user-provided `b`.
- Both stage candidates must have passed their supplied validation examples before predictions can be produced.
- Independent bounded interpreters in the chain reject unexpected operators, rule shapes, nonfinite results and excessive nesting.
- Numeric cases and their Boolean decisions are **predictions only**. No independent ground-truth audit of those cases happens inside the chain.
- No storage, network, DOM, `eval`, arbitrary code generation or installation. No integration with the live main app; Frozen artifacts untouched.
- Test with `node --test eval/tests/genesis-x-chain.test.mjs`.
- Stacked on experimental 0.4 branch; keep as a draft PR for isolated verification.
