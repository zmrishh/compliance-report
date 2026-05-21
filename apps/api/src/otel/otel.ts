/**
 * OpenTelemetry must be initialised before any other module is imported.
 * Import this file as the very first line in main.ts via --require or top-level import.
 */
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { PrometheusExporter } from '@opentelemetry/exporter-prometheus';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';

const sdk = new NodeSDK({
  // resource can be set by OTEL_SERVICE_NAME env var; we set defaults here
  serviceName: 'compliance-api',
  traceExporter: process.env['OTEL_EXPORTER_OTLP_ENDPOINT']
    ? new OTLPTraceExporter({
        url: `${process.env['OTEL_EXPORTER_OTLP_ENDPOINT']}/v1/traces`,
      })
    : undefined,
  metricReader: new PrometheusExporter({
    port: Number(process.env['PROMETHEUS_PORT'] ?? 9464),
  }),
  instrumentations: [
    getNodeAutoInstrumentations({
      '@opentelemetry/instrumentation-fs': { enabled: false },
    }),
  ],
});

sdk.start();

process.on('SIGTERM', () => {
  sdk.shutdown().catch((err: unknown) => {
    console.error('Error shutting down OpenTelemetry SDK', err);
  });
});
