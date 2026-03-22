import { describe, expect, it, vi } from "vitest";
import { resolveCliSite } from "../../../bin/lib/site-selection.js";

function createSiteRow(id, key) {
  return {
    id,
    key,
    status: "active",
    created_at: 1774134096,
    updated_at: 1774134096,
  };
}

describe("CLI site selection", () => {
  it("resolves a host-scoped site in host-based mode", async () => {
    const query = vi.fn(async (sql) => {
      if (sql.includes('FROM "site_domain"')) {
        return [createSiteRow("sit_demo", "demo")];
      }

      return [];
    });

    const resolved = await resolveCliSite(
      {
        query,
      },
      {
        env: {
          SITE_RESOLUTION_MODE: "host-based",
        },
        host: "demo.jant.blog",
      },
    );

    expect(resolved.site.id).toBe("sit_demo");
    expect(query).toHaveBeenCalledTimes(1);
  });

  it("resolves a URL selector with path prefix", async () => {
    const query = vi.fn(async (sql) => {
      if (
        sql.includes('FROM "site_domain"') &&
        sql.includes(`"site_domain"."path_prefix" = '/base'`)
      ) {
        return [createSiteRow("sit_demo", "demo")];
      }

      return [];
    });

    const resolved = await resolveCliSite(
      {
        query,
      },
      {
        env: {
          SITE_RESOLUTION_MODE: "host-based",
        },
        url: "https://demo.jant.blog/base/",
      },
    );

    expect(resolved.site.key).toBe("demo");
  });

  it("falls back to the only site in host-based mode", async () => {
    const query = vi.fn(async (sql) => {
      if (sql.includes('FROM "site_domain"')) {
        return [];
      }

      return [createSiteRow("sit_only", "only")];
    });

    const resolved = await resolveCliSite(
      {
        query,
      },
      {
        env: {
          SITE_RESOLUTION_MODE: "host-based",
        },
      },
    );

    expect(resolved.site.id).toBe("sit_only");
  });

  it("requires explicit selection for host-based multi-site instances", async () => {
    const query = vi.fn(async () => [
      createSiteRow("sit_one", "one"),
      createSiteRow("sit_two", "two"),
    ]);

    await expect(
      resolveCliSite(
        {
          query,
        },
        {
          env: {
            SITE_RESOLUTION_MODE: "host-based",
          },
        },
      ),
    ).rejects.toThrow(
      "host-based mode requires --site, --host, or --url when the database contains multiple sites.",
    );
  });
});
