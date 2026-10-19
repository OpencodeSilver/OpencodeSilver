/**
 * Background shell commands, as the transcript and the shell routes report them.
 *
 * OpenCode 2.x runs a `shell` call with `background: true` (or one moved to the
 * background mid-run) as a job and settles the tool call at once: its
 * metadata carries `status: "running"` and the `shellID`, and its text is a
 * "moved to the background" notice followed by instructions for the model.
 * While the command runs, `/api/shell` lists it with the originating session
 * in its metadata, and `shell.created` / `shell.exited` / `shell.deleted`
 * announce it on the event stream. When the job settles, OpenCode appends one
 * synthetic message whose metadata names the shell (`source: "shell"`) and
 * whose text wraps the result in a `<shell …>` envelope (core
 * `tool/plugin/shell.ts`, `shell/result.ts`).
 */

import { z } from "zod"

import type { Message, Metadata } from "./model"

/** A command the shell service is still running for a session. */
export type RunningShell = {
  id: string
  sessionID: string
  command: string
  /** File the combined output streams to. */
  file: string
  startedAt: number
}

/** How a background command ended, from its completion message. */
export type ShellCompletion = {
  shellID: string
  state: "completed" | "cancelled" | "error"
  exit?: number
  signal?: string
  timeout?: boolean
  /** Captured output and any failure notice, without the envelope. */
  output: string
  endedAt: number
}

const callMetadataSchema = z.object({
  status: z.literal("running"),
  shellID: z.string().min(1),
})

/**
 * The shell id in the metadata a call settles with when its command went to
 * the background. A call that waits for its command settles only after the
 * command ended, without this marker.
 */
export function readBackgroundShellIDFromMetadata(metadata: Metadata | undefined): string | undefined {
  const parsed = callMetadataSchema.safeParse(metadata ?? {})
  return parsed.success ? parsed.data.shellID : undefined
}

const completionMetadataSchema = z.object({
  source: z.literal("shell"),
  shellID: z.string().min(1),
  state: z.enum(["completed", "cancelled", "error"]),
  exit: z.number().optional(),
  signal: z.string().optional(),
  timeout: z.boolean().optional(),
})

const ENVELOPE = /^\s*<shell\b[^>]*>\n?([\s\S]*?)\n?<\/shell>\s*$/

/** The background command a message reports the end of, or undefined for any other message. */
export function readShellCompletion(message: Message): ShellCompletion | undefined {
  if (message.role !== "synthetic") return undefined
  const parsed = completionMetadataSchema.safeParse(message.metadata ?? {})
  if (!parsed.success) return undefined
  const envelope = message.text.match(ENVELOPE)
  return {
    shellID: parsed.data.shellID,
    state: parsed.data.state,
    exit: parsed.data.exit,
    signal: parsed.data.signal,
    timeout: parsed.data.timeout,
    output: envelope ? envelope[1] : message.text,
    endedAt: message.time.created,
  }
}

/** The completion of one background command among a session's messages. */
export function findShellCompletion(messages: readonly Message[], shellID: string): ShellCompletion | undefined {
  // The completion lands after the call, so the newest messages are checked first.
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const completion = readShellCompletion(messages[index])
    if (completion?.shellID === shellID) return completion
  }
  return undefined
}

export const shellCompletionFailed = (completion: ShellCompletion): boolean => (
  completion.state !== "completed"
  || completion.timeout === true
  || completion.signal !== undefined
  || (completion.exit !== undefined && completion.exit !== 0)
)

const shellOwnerSchema = z.object({ sessionID: z.string().min(1) })

type ShellInfoWire = {
  id: string
  status: string
  command: string
  file: string
  metadata: Metadata
  time: { started: number }
}

/**
 * A running command started on behalf of a session. The shell tool tags every
 * command it spawns with the session; commands without one (a terminal the
 * TUI opened) belong to no session and are not tracked.
 */
export function runningShellFromWire(info: ShellInfoWire): RunningShell | undefined {
  if (info.status !== "running") return undefined
  const owner = shellOwnerSchema.safeParse(info.metadata)
  if (!owner.success) return undefined
  return { id: info.id, sessionID: owner.data.sessionID, command: info.command, file: info.file, startedAt: info.time.started }
}
