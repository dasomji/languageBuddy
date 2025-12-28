import { render, screen } from "@testing-library/react";
import { AppSidebar } from "./sidebar";
import { api } from "~/trpc/react";
import { vi, describe, it, expect } from "vitest";

// Mock tRPC
vi.mock("~/trpc/react", () => ({
  api: {
    useUtils: () => ({
      learningSpace: {
        getActive: {
          invalidate: vi.fn(),
        },
      },
    }),
    stats: {
      getStatsSubscription: {
        useSubscription: vi.fn(),
      },
      getStats: {
        useQuery: vi.fn(),
      },
    },
    learningSpace: {
      getActive: {
        useQuery: vi.fn(),
      },
      list: {
        useQuery: vi.fn(),
      },
      setActive: {
        useMutation: vi.fn(() => ({ mutate: vi.fn() })),
      },
      create: {
        useMutation: vi.fn(() => ({ mutate: vi.fn() })),
      },
    },
  },
}));

describe("AppSidebar", () => {
  it("renders navigation items", () => {
    // @ts-expect-error - mocking trpc
    api.learningSpace.getActive.useQuery.mockReturnValue({ data: { id: "1" } });
    // @ts-expect-error - mocking trpc
    api.learningSpace.list.useQuery.mockReturnValue({ data: [] });
    // @ts-expect-error - mocking trpc
    api.stats.getStats.useQuery.mockReturnValue({ data: null });
    // @ts-expect-error - mocking trpc
    api.stats.getStatsSubscription.useSubscription.mockReturnValue({});

    render(<AppSidebar />);
    
    expect(screen.getByText("Diary")).toBeDefined();
    expect(screen.getByText("Stories")).toBeDefined();
    expect(screen.getByText("VoDex")).toBeDefined();
    expect(screen.getByText("Add Word packages")).toBeDefined();
  });

  it("displays counts when available", () => {
    // @ts-expect-error - mocking trpc
    api.learningSpace.getActive.useQuery.mockReturnValue({ data: { id: "1" } });
    // @ts-expect-error - mocking trpc
    api.learningSpace.list.useQuery.mockReturnValue({ data: [] });
    // @ts-expect-error - mocking trpc
    api.stats.getStats.useQuery.mockReturnValue({
      data: {
        stories: 5,
        vocabs: 10,
        diaryEntries: 3,
        wordPackages: 2,
      },
    });
    // @ts-expect-error - mocking trpc
    api.stats.getStatsSubscription.useSubscription.mockReturnValue({});

    render(<AppSidebar />);

    expect(screen.getByText("5")).toBeDefined();
    expect(screen.getByText("10")).toBeDefined();
    expect(screen.getByText("3")).toBeDefined();
    expect(screen.getByText("2")).toBeDefined();
  });
});

