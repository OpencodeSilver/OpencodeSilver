import { describe, expect, test } from "bun:test"

import {
  findShellCompletion,
  readShellCompletion,
  runningShellFromWire,
  shellCompletionFailed,
} from "./background-shell"
import type { Message, SyntheticMessage } from "./model"

const completion = (overrides: Partial<SyntheticMessage> = {}): SyntheticMessage => ({
  id: "msg_done",
  sessionID: "ses_1",
  role: "synthetic",
  time: { created: 5000 },
  text: '<shell id="job_1" state="completed" command="sleep 1">\n5 minutes elapsed\n</shell>',
  metadata: { source: "shell", shellID: "sh_1", jobID: "job_1", state: "completed", truncated: false, exit: 0 },
  ...overrides,
})

describe("readShellCompletion", () => {
  test("unwraps the envelope and keeps the exit status", () => {
    expect(readShellCompletion(completion())).toEqual({
      shellID: "sh_1",
      state: "completed",
      exit: 0,
      signal: undefined,
      timeout: undefined,
      output: "5 minutes elapsed",
      endedAt: 5000,
    })
  })

  test("ignores other synthetic messages", () => {
    expect(readShellCompletion(completion({ metadata: { source: "subagent", childID: "ses_2", state: "completed" } }))).toBeUndefined()
    expect(readShellCompletion(completion({ metadata: undefined }))).toBeUndefined()
  })

  test("a non-zero exit, a signal, a timeout and a cancel all count as failed", () => {
    const read = (metadata: SyntheticMessage["metadata"]) => {
      const result = readShellCompletion(completion({ metadata }))
      if (!result) throw new Error("expected a completion")
      return result
    }
    expect(shellCompletionFailed(read({ source: "shell", shellID: "sh_1", state: "completed", exit: 0 }))).toBe(false)
    expect(shellCompletionFailed(read({ source: "shell", shellID: "sh_1", state: "completed", exit: 2 }))).toBe(true)
    expect(shellCompletionFailed(read({ source: "shell", shellID: "sh_1", state: "completed", signal: "SIGTERM" }))).toBe(true)
    expect(shellCompletionFailed(read({ source: "shell", shellID: "sh_1", state: "completed", timeout: true }))).toBe(true)
    expect(shellCompletionFailed(read({ source: "shell", shellID: "sh_1", state: "cancelled" }))).toBe(true)
  })

  test("finds the completion of one command among a session's messages", () => {
    const other = completion({ id: "msg_other", metadata: { source: "shell", shellID: "sh_9", state: "completed" } })
    const user: Message = { id: "msg_user", sessionID: "ses_1", role: "user", time: { created: 1 } }
    expect(findShellCompletion([user, completion(), other], "sh_1")?.output).toBe("5 minutes elapsed")
    expect(findShellCompletion([user, other], "sh_1")).toBeUndefined()
  })
})

describe("runningShellFromWire", () => {
  const info = {
    id: "sh_1",
    status: "running",
    command: "sleep 300",
    file: "/tmp/sh_1.out",
    metadata: { sessionID: "ses_1" },
    time: { started: 1000 },
  }

  test("keeps running commands started for a session", () => {
    expect(runningShellFromWire(info)).toEqual({
      id: "sh_1",
      sessionID: "ses_1",
      command: "sleep 300",
      file: "/tmp/sh_1.out",
      startedAt: 1000,
    })
  })

  test("drops exited commands and commands without a session", () => {
    expect(runningShellFromWire({ ...info, status: "exited" })).toBeUndefined()
    expect(runningShellFromWire({ ...info, metadata: {} })).toBeUndefined()
  })
})
