import { describe, expect, it } from "vitest";
import { stableJson } from "../../src/utils/hash.js";

describe("stableJson", () => {
  it("排序对象 key，同时保留数组顺序", () => {
    expect(stableJson({ b: 1, a: [{ d: 4, c: 3 }] })).toBe('{"a":[{"c":3,"d":4}],"b":1}');
  });
});
