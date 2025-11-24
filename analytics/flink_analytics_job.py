#!/usr/bin/env python3
"""PyFlink streaming job that aggregates processed image metadata from Kafka."""

import argparse
import json
import logging
from datetime import datetime, timezone

from google.cloud import firestore, secretmanager, storage
import psycopg2
from psycopg2.extras import RealDictCursor

from pyflink.common.serialization import SimpleStringSchema
from pyflink.common.watermark_strategy import WatermarkStrategy
from pyflink.datastream import StreamExecutionEnvironment
from pyflink.datastream.connectors import FlinkKafkaConsumer
from pyflink.datastream.functions import ProcessWindowFunction, RuntimeContext, KeyedProcessFunction
from pyflink.datastream.state import MapStateDescriptor
from pyflink.common.typeinfo import Types
import time


logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("flink-analytics")


def parse_args():
    parser = argparse.ArgumentParser(description="Flink analytics job for product image metadata")
    parser.add_argument("--kafka_bootstrap_servers", required=True)
    parser.add_argument("--kafka_topic", required=True)
    parser.add_argument("--results_bucket", required=True)
    parser.add_argument("--firestore_collection", required=True)
    # Cloud SQL is optional. If not provided, metrics will be written only to
    # Firestore and GCS.
    parser.add_argument("--cloud_sql_private_ip", required=False, default=None)
    parser.add_argument("--cloud_sql_user", required=False, default=None)
    parser.add_argument("--cloud_sql_password_secret", required=False, default=None)
    parser.add_argument("--project_id", required=True)
    parser.add_argument("--firestore_project", required=True)
    parser.add_argument("--window_minutes", type=int, default=1)
    parser.add_argument("--kafka_group", default="flink-analytics-group")
    return parser.parse_args()


def fetch_secret(project_id: str, secret_id: str) -> str:
    client = secretmanager.SecretManagerServiceClient()
    name = f"projects/{project_id}/secrets/{secret_id}/versions/latest"
    response = client.access_secret_version(name=name)
    return response.payload.data.decode("utf-8")


def parse_iso_timestamp(value: str) -> datetime:
    if not value:
        return datetime.now(timezone.utc)
    normalized = value.replace("Z", "+00:00")
    return datetime.fromisoformat(normalized)


def enrich_event(raw: str) -> dict:
    payload = json.loads(raw)
    ts = parse_iso_timestamp(payload.get("timestamp"))
    payload["timestamp_millis"] = int(ts.timestamp() * 1000)
    payload["size_bytes"] = int(payload.get("size_bytes", 0))
    payload.setdefault("size_label", "default")
    payload["timestamp_parsed"] = ts
    return payload


class AnalyticsWindowFunction(ProcessWindowFunction):
    def __init__(self, *, results_bucket: str, firestore_collection: str, firestore_project: str, cloud_sql_config: dict, project_id: str, secret_id: str):
        self.results_bucket = results_bucket
        self.firestore_collection = firestore_collection
        self.firestore_project = firestore_project
        self.cloud_sql_config = cloud_sql_config
        self.project_id = project_id
        self.secret_id = secret_id
        self.storage_client = None
        self.firestore_client = None
        self.cloud_sql_conn = None

    def open(self, runtime_context: RuntimeContext):
        self.storage_client = storage.Client()
        self.firestore_client = firestore.Client(project=self.firestore_project)
        # Cloud SQL connection is optional. Only connect if a host and user
        # were provided via cloud_sql_config.
        self.cloud_sql_conn = None
        if self.cloud_sql_config and self.cloud_sql_config.get("host") and self.secret_id and self.cloud_sql_config.get("user"):
            try:
                password = fetch_secret(self.project_id, self.secret_id)
                self.cloud_sql_conn = psycopg2.connect(
                    dbname=self.cloud_sql_config.get("database", "analytics"),
                    user=self.cloud_sql_config.get("user"),
                    password=password,
                    host=self.cloud_sql_config.get("host"),
                    port=self.cloud_sql_config.get("port", 5432),
                    cursor_factory=RealDictCursor,
                )
                self.cloud_sql_conn.autocommit = True
                with self.cloud_sql_conn.cursor() as cur:
                    cur.execute(
                        """CREATE TABLE IF NOT EXISTS analytics_metrics (
                            window_start TIMESTAMPTZ NOT NULL,
                            size_label TEXT NOT NULL,
                            event_count BIGINT,
                            total_bytes BIGINT,
                            latest_event TIMESTAMPTZ,
                            summary_json JSONB,
                            PRIMARY KEY (window_start, size_label)
                        )"""
                    )
            except Exception:
                # If Cloud SQL setup fails, log and continue without SQL.
                logger.exception("Failed to initialize Cloud SQL connection — continuing without SQL persistence")

    def _persist(self, metrics: dict, size_label: str):
        window_start = datetime.fromisoformat(metrics["window_start"])
        json_blob = json.dumps(metrics)
        # Persist to Cloud SQL only if the connection was successfully created.
        if self.cloud_sql_conn:
            try:
                with self.cloud_sql_conn.cursor() as cur:
                    cur.execute(
                        """INSERT INTO analytics_metrics (window_start, size_label, event_count, total_bytes, latest_event, summary_json)
                           VALUES (%s, %s, %s, %s, %s, %s)
                           ON CONFLICT (window_start, size_label) DO UPDATE
                             SET event_count = EXCLUDED.event_count,
                                 total_bytes = EXCLUDED.total_bytes,
                                 latest_event = EXCLUDED.latest_event,
                                 summary_json = EXCLUDED.summary_json""",
                        (
                            window_start,
                            size_label,
                            metrics["event_count"],
                            metrics["total_bytes"],
                            metrics["latest_event"],
                            json_blob,
                        ),
                    )
            except Exception:
                logger.exception("Failed to persist metrics to Cloud SQL; continuing")
        # Always write to Firestore and GCS (if available)
        try:
            document_id = f"{metrics['window_start']}_{size_label}"
            self.firestore_client.collection(self.firestore_collection).document(document_id).set(metrics)
        except Exception:
            logger.exception("Failed to persist metrics to Firestore")
        try:
            blob = self.storage_client.bucket(self.results_bucket).blob(f"analytics/{metrics['window_start']}_{size_label}.json")
            blob.upload_from_string(json_blob, content_type="application/json")
        except Exception:
            logger.exception("Failed to persist metrics to GCS")
        logger.debug("Persisted metrics for %s to Firestore and GCS (Cloud SQL=%s)", size_label, bool(self.cloud_sql_conn))

    def process(self, key, context, elements, collector):
        events = list(elements)
        if not events:
            return
        total_bytes = sum(event.get("size_bytes", 0) for event in events)
        latest_event = max(event["timestamp_parsed"] for event in events)
        window_start = datetime.fromtimestamp(context.window().start / 1000, timezone.utc)
        metrics = {
            "window_start": window_start.isoformat(),
            "size_label": key,
            "event_count": len(events),
            "total_bytes": total_bytes,
            "latest_event": latest_event.isoformat(),
            "processed_at": datetime.now(timezone.utc).isoformat(),
        }
        collector.collect(json.dumps(metrics))
        self._persist(metrics, key)


class WindowAccumulator(KeyedProcessFunction):
    def __init__(self, *, results_bucket: str, firestore_collection: str, firestore_project: str, cloud_sql_config: dict, project_id: str, secret_id: str, window_minutes: int = 1):
        self.results_bucket = results_bucket
        self.firestore_collection = firestore_collection
        self.firestore_project = firestore_project
        self.cloud_sql_config = cloud_sql_config
        self.project_id = project_id
        self.secret_id = secret_id
        self.storage_client = None
        self.firestore_client = None
        self.cloud_sql_conn = None
        self._window_ms = int(window_minutes) * 60_000
        self._map_state_desc = MapStateDescriptor("windows", Types.LONG(), Types.PICKLED_BYTE_ARRAY())

    def open(self, runtime_context: RuntimeContext):
        self.storage_client = storage.Client()
        self.firestore_client = firestore.Client(project=self.firestore_project)
        # Cloud SQL optional handling
        self.cloud_sql_conn = None
        if self.cloud_sql_config and self.cloud_sql_config.get("host") and self.secret_id and self.cloud_sql_config.get("user"):
            try:
                password = fetch_secret(self.project_id, self.secret_id)
                self.cloud_sql_conn = psycopg2.connect(
                    dbname=self.cloud_sql_config.get("database", "analytics"),
                    user=self.cloud_sql_config.get("user"),
                    password=password,
                    host=self.cloud_sql_config.get("host"),
                    port=self.cloud_sql_config.get("port", 5432),
                    cursor_factory=RealDictCursor,
                )
                self.cloud_sql_conn.autocommit = True
                with self.cloud_sql_conn.cursor() as cur:
                    cur.execute(
                        """CREATE TABLE IF NOT EXISTS analytics_metrics (
                            window_start TIMESTAMPTZ NOT NULL,
                            size_label TEXT NOT NULL,
                            event_count BIGINT,
                            total_bytes BIGINT,
                            latest_event TIMESTAMPTZ,
                            summary_json JSONB,
                            PRIMARY KEY (window_start, size_label)
                        )"""
                    )
            except Exception:
                logger.exception("Failed to initialize Cloud SQL connection in WindowAccumulator — continuing without SQL persistence")
        self._windows = runtime_context.get_map_state(self._map_state_desc)

    def _persist(self, metrics: dict, size_label: str):
        window_start = datetime.fromisoformat(metrics["window_start"])
        json_blob = json.dumps(metrics)
        # Optional Cloud SQL write
        if self.cloud_sql_conn:
            try:
                with self.cloud_sql_conn.cursor() as cur:
                    cur.execute(
                        """INSERT INTO analytics_metrics (window_start, size_label, event_count, total_bytes, latest_event, summary_json)
                           VALUES (%s, %s, %s, %s, %s, %s)
                           ON CONFLICT (window_start, size_label) DO UPDATE
                             SET event_count = EXCLUDED.event_count,
                                 total_bytes = EXCLUDED.total_bytes,
                                 latest_event = EXCLUDED.latest_event,
                                 summary_json = EXCLUDED.summary_json""",
                        (
                            window_start,
                            size_label,
                            metrics["event_count"],
                            metrics["total_bytes"],
                            metrics["latest_event"],
                            json_blob,
                        ),
                    )
            except Exception:
                logger.exception("Failed to persist metrics to Cloud SQL; continuing")
        # Firestore + GCS always attempted
        try:
            document_id = f"{metrics['window_start']}_{size_label}"
            self.firestore_client.collection(self.firestore_collection).document(document_id).set(metrics)
        except Exception:
            logger.exception("Failed to persist metrics to Firestore")
        try:
            blob = self.storage_client.bucket(self.results_bucket).blob(f"analytics/{metrics['window_start']}_{size_label}.json")
            blob.upload_from_string(json_blob, content_type="application/json")
        except Exception:
            logger.exception("Failed to persist metrics to GCS")

    def process_element(self, value, ctx):
        # determine window end aligned to window size
        ts = int(value.get("timestamp_millis", int(time.time() * 1000)))
        window_end = ts - (ts % self._window_ms) + self._window_ms
        existing = self._windows.get(window_end)
        if existing is None:
            # start new window list
            self._windows.put(window_end, [value])
            ctx.timer_service().register_event_time_timer(window_end)
        else:
            existing.append(value)
            self._windows.put(window_end, existing)

    def on_timer(self, timestamp, ctx):
        events = self._windows.get(timestamp)
        if not events:
            return
        # compute metrics
        total_bytes = sum(event.get("size_bytes", 0) for event in events)
        latest_event = max(event["timestamp_parsed"] for event in events)
        window_start = datetime.fromtimestamp((timestamp - self._window_ms) / 1000, timezone.utc)
        key = None
        try:
            # context may provide current key
            key = ctx.get_current_key()
        except Exception:
            key = "default"
        metrics = {
            "window_start": window_start.isoformat(),
            "size_label": key,
            "event_count": len(events),
            "total_bytes": total_bytes,
            "latest_event": latest_event.isoformat() if isinstance(latest_event, datetime) else datetime.fromtimestamp(latest_event / 1000, timezone.utc).isoformat(),
            "processed_at": datetime.now(timezone.utc).isoformat(),
        }
        # persist and emit
        self._persist(metrics, key)
        # yield the serialized metrics to downstream
        yield json.dumps(metrics)
        # cleanup state
        self._windows.remove(timestamp)


def build_stream(args):
    env = StreamExecutionEnvironment.get_execution_environment()
    env.set_parallelism(2)
    env.enable_checkpointing(60_000)

    kafka_props = {
        "bootstrap.servers": args.kafka_bootstrap_servers,
        "group.id": args.kafka_group,
        "auto.offset.reset": "latest",
    }

    kafka_consumer = FlinkKafkaConsumer(
        topics=[args.kafka_topic],
        deserialization_schema=SimpleStringSchema(),
        properties=kafka_props,
    )
    kafka_consumer.set_start_from_latest()

    stream = (
        env
        .add_source(kafka_consumer)
        .map(lambda raw: enrich_event(raw))
    )

    watermark_strategy = WatermarkStrategy.for_monotonous_timestamps().with_timestamp_assigner(
        lambda event, timestamp: event["timestamp_millis"]
    )
    # Some pyflink versions expect a timestamp assigner object with
    # an `extract_timestamp` method instead of a plain callable. Provide
    # a small adapter for compatibility.
    class _TimestampAssigner:
        def extract_timestamp(self, element, record_timestamp):
            return int(element.get("timestamp_millis", 0))

    try:
        # If the WatermarkStrategy accepts an object, swap in the adapter
        watermark_strategy = watermark_strategy.with_timestamp_assigner(_TimestampAssigner())
    except Exception:
        # If the callable form is already correct for this pyflink version,
        # the original callable will remain in use.
        pass
    windowed = (
        stream
        .assign_timestamps_and_watermarks(watermark_strategy)
        .key_by(lambda event: event.get("size_label", "default"))
        .process(
            WindowAccumulator(
                results_bucket=args.results_bucket,
                firestore_collection=args.firestore_collection,
                firestore_project=args.firestore_project,
                cloud_sql_config={
                    "database": "analytics",
                    "user": args.cloud_sql_user,
                    "host": args.cloud_sql_private_ip,
                },
                project_id=args.project_id,
                secret_id=args.cloud_sql_password_secret,
                window_minutes=args.window_minutes,
            )
        )
    )

    # Keep executing by materializing the stream
    windowed.add_sink(lambda value: logger.info("Window result emitted: %s", value))
    env.execute("product-image-analytics")


def main():
    args = parse_args()
    build_stream(args)


if __name__ == "__main__":
    main()
