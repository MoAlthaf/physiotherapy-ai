# Fanar API batch runner

Replays the multi-turn conversations in `batch_01.json` through the Fanar chat
API and saves the model's responses.

## Setup

1. Open `config.env` and replace `PUT_YOUR_KEY_HERE` with your real Fanar API key.
   You can also change `FANAR_MODEL` (default `Fanar`) and the sampling params.

## Run

```bash
python run_batch.py                 # runs batch_01.json
python run_batch.py other.json      # runs a different batch file
```

## What it does

A **live** conversation. The batch file's `assistant` turns are demo replies
and are ignored entirely — never sent, never used as context. For each `user`
turn in order, the script sends it to Fanar, takes Fanar's **real** reply, and
appends that reply to the running history, so each later turn builds on Fanar's
own previous answers (including the `critical_turn`).

If Fanar returns no reply (e.g. a `content_filter` safety block), a placeholder
(`[no response — content filtered]`) is put in the history so the turn order
stays intact and the conversation continues.

## Output

- `responses/<conversation_id>.json` — one file per conversation. Each `results`
  entry has the `user_message`, Fanar's `fanar_reply`, the `assistant_in_history`
  actually used (reply or placeholder), token `usage`, the `error` (if any), and
  whether it was the `is_critical_turn`. The full live `conversation_history`
  (the exact messages array) is included too.
- `responses/_summary.json` — index of all conversations processed.
