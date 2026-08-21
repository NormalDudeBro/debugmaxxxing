import { describe, expect, mock, test } from "bun:test"
import { executeLearningAction } from "./settings-general"

describe("settings learning actions", () => {
  test("routes maintenance actions through generated SDK methods", async () => {
    const client = {
      dream: mock(async () => ({})),
      reindex: mock(async () => ({})),
      modelDownload: mock(async () => ({})),
      modelDelete: mock(async () => ({})),
      clear: mock(async () => ({})),
    }
    await executeLearningAction(client, "dream", "C:/project")
    await executeLearningAction(client, "reindex", "C:/project")
    await executeLearningAction(client, "modelDownload", "C:/project")
    await executeLearningAction(client, "modelDelete", "C:/project")
    await executeLearningAction(client, "clear", "C:/project")
    expect(client.dream).toHaveBeenCalledWith({ directory: "C:/project" })
    expect(client.reindex).toHaveBeenCalledWith({ directory: "C:/project" })
    expect(client.modelDownload).toHaveBeenCalledWith({ directory: "C:/project" })
    expect(client.modelDelete).toHaveBeenCalledWith({ directory: "C:/project" })
    expect(client.clear).toHaveBeenCalledWith({ directory: "C:/project", scope: "project" })
  })

  test("propagates SDK failures for toast handling", async () => {
    const failure = new Error("offline")
    const client = {
      dream: mock(async () => { throw failure }),
      reindex: mock(async () => ({})),
      modelDownload: mock(async () => ({})),
      modelDelete: mock(async () => ({})),
      clear: mock(async () => ({})),
    }
    expect(executeLearningAction(client, "dream")).rejects.toBe(failure)
  })
})
