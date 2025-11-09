# demo_stream_dag.py
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter
import subprocess
import sys
import os, json, time, threading, uuid
from collections import defaultdict
from typing import List, Tuple
from kafka import KafkaConsumer, KafkaProducer
import queue

# ---------- Config ----------
DEFAULT_BROKERS = os.getenv("REDPANDA_BROKERS", "localhost:19092")
TASKS_TOPIC = os.getenv("WF_TASKS_TOPIC", "wf.tasks")
EVENTS_TOPIC = os.getenv("WF_EVENTS_TOPIC", "wf.events")

# ---------- Black-box agent (replace with your real one) ----------
def run_agent(agent_id: int):
    # 1) Decide output path (default: ~/Downloads, override with DOWNLOAD_DIR env)
    downloads = os.path.expanduser(os.getenv("DOWNLOAD_DIR", "~/Downloads"))
    os.makedirs(downloads, exist_ok=True)
    out_path = os.path.abspath(os.path.join(downloads, f"agent_{agent_id}.pdf"))

    # 2) Make a tiny PDF
    c = canvas.Canvas(out_path, pagesize=letter)
    c.setTitle(f"Agent {agent_id} Output")
    c.drawString(72, 720, f"Hello from agent {agent_id}!")
    c.drawString(72, 700, time.strftime("Generated at %Y-%m-%d %H:%M:%S"))
    c.showPage()
    c.save()

    # 3) Auto-open the file (best-effort; won’t crash the worker if it fails)
    try:
        if sys.platform.startswith("darwin"):      # macOS
            subprocess.run(["open", out_path], check=False)
        elif os.name == "nt":                      # Windows
            os.startfile(out_path)  # type: ignore[attr-defined]
        else:                                      # Linux / others
            subprocess.run(["xdg-open", out_path], check=False)
    except Exception as _:
        pass

    # 4) Return a simple record (your orchestrator already passes this back)
    return {"uri": f"file://{out_path}", "path": out_path, "summary": f"downloaded_pdf_{agent_id}"}

# ---------- Worker thread ----------
def worker_loop(brokers: str, group: str, stop_evt: threading.Event):
    producer = KafkaProducer(
        bootstrap_servers=brokers,
        value_serializer=lambda v: json.dumps(v).encode("utf-8"),
        key_serializer=lambda v: v.encode("utf-8"),
    )
    consumer = KafkaConsumer(
        TASKS_TOPIC,
        group_id=group,
        bootstrap_servers=brokers,
        auto_offset_reset="earliest",
        enable_auto_commit=False,
        value_deserializer=lambda b: json.loads(b.decode("utf-8")),
    )
    print(f"[worker:{group}:{threading.get_ident()}] started")
    try:
        while not stop_evt.is_set():
            msg_pack = consumer.poll(timeout_ms=500)
            if not msg_pack:
                continue
            for tp, msgs in msg_pack.items():
                for msg in msgs:
                    task = msg.value
                    run_id = task["run_id"]
                    node_id = task["node_id"]
                    agent_id = task["agent_id"]

                    # started
                    producer.send(
                        EVENTS_TOPIC, key=run_id,
                        value={"type": "started", "run_id": run_id, "node_id": node_id, "ts": time.time()}
                    )
                    print(f"[worker] run={run_id} node={node_id} agent={agent_id} START")

                    try:
                        # (optional: emit output_chunk events mid-run)
                        result = run_agent(agent_id)
                        producer.send(
                            EVENTS_TOPIC, key=run_id,
                            value={"type": "completed", "run_id": run_id, "node_id": node_id,
                                   "output": result, "ts": time.time()}
                        )
                        consumer.commit()
                        print(f"[worker] run={run_id} node={node_id} DONE -> {result}")
                    except Exception as e:
                        producer.send(
                            EVENTS_TOPIC, key=run_id,
                            value={"type": "failed", "run_id": run_id, "node_id": node_id,
                                   "error": {"message": str(e)}, "ts": time.time()}
                        )
                        print(f"[worker] run={run_id} node={node_id} FAIL {e!r}")
    finally:
        consumer.close()
        producer.flush()
        producer.close()
        print(f"[worker:{group}:{threading.get_ident()}] stopped")

# ---------- Orchestrator (single thread for this run) ----------
def orchestrator_loop(
    run_id: str,
    nodes: List[int],
    edges: List[Tuple[int,int]],
    brokers: str,
    stop_evt: threading.Event,
    results_q:"queue.Queue"
):
    # Build graph
    children = defaultdict(list)
    in_deg = {n: 0 for n in nodes}
    for u, v in edges:
        children[u].append(v)
        in_deg[v] = in_deg.get(v, 0) + 1

    producer = KafkaProducer(
        bootstrap_servers=brokers,
        value_serializer=lambda v: json.dumps(v).encode("utf-8"),
        key_serializer=lambda v: v.encode("utf-8"),
    )
    consumer = KafkaConsumer(
        EVENTS_TOPIC,
        group_id=f"orchestrator.{run_id}",
        bootstrap_servers=brokers,
        auto_offset_reset="earliest",
        enable_auto_commit=True,
        value_deserializer=lambda b: json.loads(b.decode("utf-8")),
    )

    terminal_nodes = {n for n in nodes if not children.get(n)}
    parents_done = {n: set() for n in nodes}
    node_outputs = {}
    final_results = {}
    total = len(nodes)
    done_count = 0

    def send_task(node_id: int, agent_id: int, parents=None, inputs=None):
        key = f"{run_id}|{node_id}"
        payload = {
            "run_id": run_id,
            "node_id": node_id,
            "agent_id": agent_id,
            "parents": parents or [],
            "inputs": inputs or [],
            "meta": {"created_at": time.time()},
        }
        producer.send(TASKS_TOPIC, key=key, value=payload)
        producer.flush()
        print(f"[orch] → enqueue node={node_id} agent={agent_id}")

    print(f"[orch] start run_id={run_id}")

    # enqueue all zero-dep nodes
    for n in nodes:
        if in_deg.get(n, 0) == 0:
            send_task(n, agent_id=n)

    try:
        while not stop_evt.is_set():
            msg_pack = consumer.poll(timeout_ms=500)
            if not msg_pack:
                continue
            for tp, msgs in msg_pack.items():
                for msg in msgs:
                    evt = msg.value
                    if evt.get("run_id") != run_id:
                        continue
                    typ = evt.get("type")
                    node_id = evt.get("node_id")

                    if typ == "started":
                        print(f"[orch] node {node_id} started")
                    elif typ == "completed":
                        node_outputs[node_id] = evt.get("output")
                        done_count += 1
                        print(f"[orch] node {node_id} completed ({done_count}/{total})")

                        # fan-out to children
                        for c in children.get(node_id, []):
                            parents_done[c].add(node_id)
                            in_deg[c] -= 1
                            if in_deg[c] == 0:
                                inputs = [{"from": p, "output": node_outputs.get(p)} for p in parents_done[c]]
                                send_task(c, agent_id=c, parents=list(parents_done[c]), inputs=inputs)

                        if done_count == total:
                            final_results = {n: node_outputs[n] for n in terminal_nodes if n in node_outputs}
                            print(f"[orch] ✅ workflow complete for {run_id}")
                            print(f"[orch] Final results (terminal nodes): {final_results}")
                            results_q.put(final_results)
                            stop_evt.set()
                            return
                    elif typ == "failed":
                        print(f"[orch] ❌ node {node_id} FAILED: {evt.get('error')}")
                        # policy: could re-enqueue here or DLQ
    finally:
        consumer.close()
        producer.flush()
        producer.close()
        print(f"[orch] stopped")

# ---------- Single public function ----------
def run_stream_demo(
    nodes: List[int],
    edges: List[Tuple[int,int]],
    *,
    brokers: str = DEFAULT_BROKERS,
    num_workers: int = 2,
    run_id: str = None,
):
    """
    Spins up N workers (consumer group) + one orchestrator, runs the DAG, then shuts down.
    """
    run_id = run_id or f"run-{uuid.uuid4().hex[:8]}"
    stop_evt = threading.Event()
    results_q:"queue.Queue" = queue.Queue()

    # Start workers
    workers = []
    group = "workers.generic"
    for i in range(num_workers):
        t = threading.Thread(target=worker_loop, args=(brokers, group, stop_evt), daemon=True)
        t.start()
        workers.append(t)

    # Start orchestrator
    orch = threading.Thread(target=orchestrator_loop, args=(run_id, nodes, edges, brokers, stop_evt, results_q), daemon=True)
    orch.start()

    # Wait for orchestrator to finish (sets stop_evt)
    orch.join()

    # Give workers a moment to see stop flag and exit their poll loops
    time.sleep(1.0)
    stop_evt.set()
    for t in workers:
        t.join(timeout=2.0)

    print("[demo] finished run:", run_id)
    final_results = results_q.get_nowait() if not results_q.empty() else {}
    return final_results

# ---------- Example usage ----------
if __name__ == "__main__":
    # Example DAG: 1 & 2 -> 3 -> 4
    run_stream_demo([1,2,3,4,5,6], [(1,3),(2,3),(3,4),(3,5),(4, 6), (5, 6)], num_workers=2)
