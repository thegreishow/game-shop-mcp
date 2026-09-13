# Router learning notes

The router now combines static readiness with observed provider behavior. Learned performance is advisory for provider selection and never changes authorization or spend policy.

The scoring inputs are intentionally bounded and explainable: recent success rate, request latency, consecutive failures, downstream pipeline outcomes, and a circuit breaker. The learning layer does not use opaque model weights.

This is designed to make the system safer to test: a flaky provider can be deprioritized before another request is sent, while ambiguous post-submit failures still never trigger automatic cross-provider resubmission.
