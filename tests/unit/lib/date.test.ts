import { describe, expect, test } from "bun:test";
import {
  formatDate,
  formatDateHuman,
  formatTime,
  getDayStart,
  getMonthStart,
  getWeekNumber,
  getWeekStart,
  parseDate,
} from "../../../src/lib/date";

describe("date utilities", () => {
  test("formatDate uses local date parts", () => {
    const date = new Date(2025, 0, 2, 3, 4, 5);
    expect(formatDate(date.getTime())).toBe("2025-01-02");
  });

  test("formatDateHuman uses short month names", () => {
    const jan = new Date(2026, 0, 1, 8, 0, 0);
    const dec = new Date(2025, 11, 31, 8, 0, 0);
    expect(formatDateHuman(jan.getTime())).toBe("Jan 1, 2026");
    expect(formatDateHuman(dec.getTime())).toBe("Dec 31, 2025");
  });

  test("formatTime uses local time parts", () => {
    const date = new Date(2025, 0, 2, 3, 4, 5);
    expect(formatTime(date.getTime())).toBe("03:04:05");
  });

  test("parseDate returns Date for valid input", () => {
    const result = parseDate("2025-02-03");
    expect(result).not.toBeNull();
    expect(result?.getFullYear()).toBe(2025);
    expect(result?.getMonth()).toBe(1);
    expect(result?.getDate()).toBe(3);
  });

  test("parseDate returns null for invalid input", () => {
    expect(parseDate("2025-02-30")).toBeNull();
    expect(parseDate("2025/02/03")).toBeNull();
  });

  test("getWeekNumber follows ISO week rules", () => {
    expect(getWeekNumber(new Date(2021, 0, 4))).toBe(1);
    expect(getWeekNumber(new Date(2020, 11, 31))).toBe(53);
  });

  test("getDayStart resets time to midnight", () => {
    const date = new Date(2025, 4, 10, 15, 20, 30);
    const start = getDayStart(date);
    expect(start.getHours()).toBe(0);
    expect(start.getMinutes()).toBe(0);
    expect(start.getSeconds()).toBe(0);
    expect(start.getFullYear()).toBe(2025);
    expect(start.getMonth()).toBe(4);
    expect(start.getDate()).toBe(10);
  });

  test("getWeekStart returns Monday", () => {
    const date = new Date(2025, 0, 8);
    const start = getWeekStart(date);
    expect(start.getFullYear()).toBe(2025);
    expect(start.getMonth()).toBe(0);
    expect(start.getDate()).toBe(6);
    expect(start.getHours()).toBe(0);
  });

  test("getMonthStart returns first day of month", () => {
    const date = new Date(2025, 1, 15);
    const start = getMonthStart(date);
    expect(start.getFullYear()).toBe(2025);
    expect(start.getMonth()).toBe(1);
    expect(start.getDate()).toBe(1);
    expect(start.getHours()).toBe(0);
  });
});
