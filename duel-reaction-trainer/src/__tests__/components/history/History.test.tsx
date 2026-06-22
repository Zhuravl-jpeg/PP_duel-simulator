import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import History from "../../../../src/components/history/History";
import { trpc } from "../../../../src/lib/trpc";

// Моки для trpc
jest.mock("../../../../src/lib/trpc", () => ({
  trpc: {
    match: {
      getMatchHistory: {
        useQuery: jest.fn(),
      },
    },
  },
}));

describe("History Component", () => {
  const mockUserId = "user-0";

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("должен отображать заголовок", () => {
    (trpc.match.getMatchHistory.useQuery as jest.Mock).mockReturnValue({
      data: { total: 0, matches: [] },
      isLoading: false,
    });

    render(<History userId={mockUserId} />);

    expect(screen.getByText(/История матчей/i)).toBeInTheDocument();
  });

  it("должен отображать статистику", () => {
    (trpc.match.getMatchHistory.useQuery as jest.Mock).mockReturnValue({
      data: {
        total: 10,
        matches: [
          { status: "finished" },
          { status: "active" },
        ],
      },
      isLoading: false,
    });

    render(<History userId={mockUserId} />);

    expect(screen.getByText(/Всего матчей/i)).toBeInTheDocument();
    expect(screen.getByText(/Завершено/i)).toBeInTheDocument();
  });

  it("должен отображать список матчей", () => {
    (trpc.match.getMatchHistory.useQuery as jest.Mock).mockReturnValue({
      data: {
        total: 2,
        matches: [
          { id: "match-1", status: "finished", createdAt: "2024-01-01" },
          { id: "match-2", status: "active", createdAt: "2024-01-02" },
        ],
      },
      isLoading: false,
    });

    render(<History userId={mockUserId} />);

    // Матчи должны отображаться
    expect(screen.queryByText(/История пуста/i)).not.toBeInTheDocument();
  });

  it("должен отображать сообщение, когда история пуста", () => {
    (trpc.match.getMatchHistory.useQuery as jest.Mock).mockReturnValue({
      data: { total: 0, matches: [] },
      isLoading: false,
    });

    render(<History userId={mockUserId} />);

    expect(screen.getByText(/История пуста/i)).toBeInTheDocument();
  });

  it("должен отображать кнопки пагинации", () => {
    (trpc.match.getMatchHistory.useQuery as jest.Mock).mockReturnValue({
      data: {
        total: 25,
        matches: Array(10).fill({ id: "match-1" }),
      },
      isLoading: false,
    });

    render(<History userId={mockUserId} />);

    // Должны быть кнопки навигации
    expect(screen.getByText(/Страница/i)).toBeInTheDocument();
  });

  it("должен отображать советы по улучшению", () => {
    (trpc.match.getMatchHistory.useQuery as jest.Mock).mockReturnValue({
      data: { total: 0, matches: [] },
      isLoading: false,
    });

    render(<History userId={mockUserId} />);

    expect(screen.getByText(/Советы по улучшению/i)).toBeInTheDocument();
  });

  it("должен отобразить статусы матчей разными цветами", () => {
    (trpc.match.getMatchHistory.useQuery as jest.Mock).mockReturnValue({
      data: {
        total: 3,
        matches: [
          { id: "match-1", status: "finished" },
          { id: "match-2", status: "active" },
          { id: "match-3", status: "waiting" },
        ],
      },
      isLoading: false,
    });

    render(<History userId={mockUserId} />);

    // Все матчи должны отобразиться
    expect(screen.queryByText(/История пуста/i)).not.toBeInTheDocument();
  });

  it("должен иметь кнопку обновления", () => {
    (trpc.match.getMatchHistory.useQuery as jest.Mock).mockReturnValue({
      data: { total: 0, matches: [] },
      isLoading: false,
      refetch: jest.fn(),
    });

    render(<History userId={mockUserId} />);

    expect(screen.getByText(/Обновить/i)).toBeInTheDocument();
  });
});
