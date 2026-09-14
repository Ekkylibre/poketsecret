import { describe, expect, it } from "vitest";

import { isAdminUser } from "./admin";

describe("isAdminUser", () => {
  it("reconnaît le compte admin par son id", () => {
    expect(isAdminUser("ba21bc8d-d491-4b48-8125-cb766c086bc1")).toBe(true);
  });

  it("rejette tout autre id, y compris un id qui y ressemble", () => {
    expect(isAdminUser("autre-utilisateur")).toBe(false);
    expect(isAdminUser("ba21bc8d-d491-4b48-8125-cb766c086bc2")).toBe(false);
    expect(isAdminUser("")).toBe(false);
  });
});
