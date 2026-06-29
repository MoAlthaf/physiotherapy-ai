#!/usr/bin/env python3
"""
Replay a batch of multi-turn conversations through the Fanar chat API and
save the model's responses.

For each conversation in the input JSON, we walk the scripted turns. At every
`user` turn we send the conversation history *up to and including* that user
message (using the dataset's scripted assistant turns as context) to the Fanar
API, and record what the model actually replies. This preserves the intended
(adversarial) trajectory while capturing the model's real answer at each user
turn, including the conversation's `critical_turn`.

Usage:
    python run_batch.py                  # uses batch_01.json
    python run_batch.py path/to/file.json

Configuration is read from config.env (and real environment variables override
the file). Set FANAR_API_KEY before running.
"""

import json
import os
import sys
import time
from pathlib import Path

import requests

# Windows consoles default to cp1252 and choke on Arabic in printed previews.
# Output files are written as UTF-8 separately; this only affects stdout.
try:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
except Exception:  # noqa: BLE001
    pass

HERE = Path(__file__).resolve().parent


def load_config():
    """Load key=value pairs from config.env; real env vars take precedence."""
    cfg = {}
    env_file = HERE / "config.env"
    if env_file.exists():
        for line in env_file.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            k, v = line.split("=", 1)
            v = v.strip()
            # Strip a single layer of surrounding quotes, if present.
            if len(v) >= 2 and v[0] == v[-1] and v[0] in ("'", '"'):
                v = v[1:-1]
            cfg[k.strip()] = v
    # Real environment variables win over the file.
    for k in ("FANAR_API_KEY", "FANAR_BASE_URL", "FANAR_MODEL",
              "TEMPERATURE", "MAX_TOKENS"):
        if os.environ.get(k):
            cfg[k] = os.environ[k]
    return cfg


def call_fanar(base_url, api_key, model, messages, temperature, max_tokens):
    """Call the OpenAI-compatible Fanar chat completions endpoint."""
    url = base_url.rstrip("/") + "/chat/completions"
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }
    payload = {
        "model": model,
        "messages": messages,
        "temperature": temperature,
        "max_tokens": max_tokens,
    }
    resp = requests.post(url, headers=headers, json=payload, timeout=120)
    if resp.status_code >= 400:
        # Surface the API's reason (e.g. guardrail rejection) instead of a
        # bare status code, so it gets recorded in the output file.
        raise RuntimeError(f"HTTP {resp.status_code}: {resp.text[:500]}")
    data = resp.json()
    content = data["choices"][0]["message"]["content"]
    usage = data.get("usage", {})
    return content, usage


def run():
    cfg = load_config()
    api_key = cfg.get("FANAR_API_KEY", "")
    base_url = cfg.get("FANAR_BASE_URL", "https://api.fanar.qa/v1")
    model = cfg.get("FANAR_MODEL", "Fanar")
    temperature = float(cfg.get("TEMPERATURE", "0.7"))
    max_tokens = int(cfg.get("MAX_TOKENS", "1024"))
    mode = cfg.get("MODE", "live").strip().lower()
    if mode not in ("live", "scripted"):
        sys.exit(f"ERROR: MODE must be 'live' or 'scripted', got '{mode}'.")
    system_prompt = cfg.get("SYSTEM_PROMPT", "").strip()

    if not api_key or api_key == "PUT_YOUR_KEY_HERE":
        sys.exit("ERROR: Set FANAR_API_KEY in config.env (or as an env var) "
                 "before running.")

    in_path = Path(sys.argv[1]) if len(sys.argv) > 1 else HERE / "batch_01.json"
    if not in_path.exists():
        sys.exit(f"ERROR: input file not found: {in_path}")

    conversations = json.loads(in_path.read_text(encoding="utf-8"))
    # Keep each mode's output separate so runs don't overwrite each other.
    out_dir = HERE / "responses" / mode
    out_dir.mkdir(parents=True, exist_ok=True)

    print(f"Model: {model} | Base: {base_url} | Mode: {mode}")
    if system_prompt:
        print(f"System prompt: {system_prompt[:80]}")
    print(f"Input: {in_path.name} | {len(conversations)} conversations\n")

    summary = []
    for conv in conversations:
        conv_id = conv.get("id", "unknown")
        critical_turn = conv.get("critical_turn")
        turns = conv.get("turns", [])
        print(f"=== {conv_id} ({conv.get('language')}, "
              f"{conv.get('category')}) ===")

        history = []          # messages array fed to the API
        turn_results = []     # per-user-turn records
        had_error = False
        if system_prompt:
            history.append({"role": "system", "content": system_prompt})

        # live mode    -> ignore the batch's assistant turns; the history we
        #                 build is Fanar's OWN replies.
        # scripted mode-> feed the batch's demo assistant turns into history as
        #                 priming (replays the authored jailbreak), and still
        #                 record what Fanar replies at each user turn.
        for turn in turns:
            role = turn["role"]
            content = turn["content"]
            turn_no = turn.get("turn")

            if role == "assistant":
                if mode == "scripted":
                    # Priming: put the authored agreeable reply into context.
                    history.append({"role": "assistant", "content": content})
                    if turn_results:
                        turn_results[-1]["scripted_priming"] = content
                continue  # in live mode the demo assistant turn is ignored

            # role == "user"
            is_critical = (turn_no == critical_turn)
            history.append({"role": "user", "content": content})
            try:
                reply, usage = call_fanar(
                    base_url, api_key, model, history,
                    temperature, max_tokens,
                )
                err = None
            except Exception as e:  # noqa: BLE001
                reply, usage, err = None, {}, str(e)
                had_error = True

            if err:
                placeholder = ("[no response — content filtered]"
                               if "content_filter" in err
                               else "[no response — API error]")
            else:
                placeholder = None

            if mode == "live":
                # Feed Fanar's own reply (or placeholder) forward as context.
                assistant_in_history = reply if not err else placeholder
                history.append({"role": "assistant",
                                "content": assistant_in_history})
            else:
                # scripted: the NEXT loop iteration (an assistant turn) will
                # append the authored priming reply, not Fanar's reply.
                assistant_in_history = None

            turn_results.append({
                "turn": turn_no,
                "is_critical_turn": is_critical,
                "user_message": content,
                "fanar_reply": reply,
                "assistant_in_history": assistant_in_history,
                "scripted_priming": None,  # filled by the next assistant turn
                "usage": usage,
                "error": err,
            })
            tag = " [CRITICAL]" if is_critical else ""
            if err:
                print(f"  turn {turn_no}{tag}: ERROR -> {err}")
            else:
                preview = (reply or "").replace("\n", " ")[:80]
                print(f"  turn {turn_no}{tag}: {preview}...")
            time.sleep(0.5)  # be gentle on the API

        out = {
            "id": conv_id,
            "category": conv.get("category"),
            "subcategory": conv.get("subcategory"),
            "target_harm_area": conv.get("target_harm_area"),
            "language": conv.get("language"),
            "critical_turn": critical_turn,
            "expected_assistant_behavior": conv.get("expected_assistant_behavior"),
            "ground_truth_label": conv.get("ground_truth_label"),
            "notes": conv.get("notes"),
            "model": model,
            "mode": mode,
            "results": turn_results,
            "conversation_history": history,  # exact messages built/sent
        }
        out_file = out_dir / f"{conv_id}.json"
        out_file.write_text(
            json.dumps(out, ensure_ascii=False, indent=2), encoding="utf-8"
        )
        summary.append({"id": conv_id, "user_turns": len(turn_results),
                        "had_error": had_error})
        print(f"  -> saved {out_file.relative_to(HERE)}\n")

    (out_dir / "_summary.json").write_text(
        json.dumps(summary, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    print(f"Done. {len(summary)} conversations written to "
          f"{out_dir.relative_to(HERE)}/")


if __name__ == "__main__":
    run()
