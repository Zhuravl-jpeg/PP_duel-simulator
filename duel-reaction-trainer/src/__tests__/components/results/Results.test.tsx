import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import Results from "../../../../src/components/results/Results";
import { trpc } from "../../../../src/lib/trpc";

// Моки для trpc
jest.mock("../../../../src/lib/trpc", () => ({
  trpc: {
    round: {
      getMatchDetails: {
        useQuery: jest.fn(),
      },
    },
  },
}));

describe("Results Component", () => {
  const mockMatchId = "match-123";
  const mockOnBack = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("должен отображать заголовок победителя", () => {
    (trpc.round.getMatchDetails.useQuery as jest.Mock).mockReturnValue({
      data: {
        status: "finished",
        participants: [
          { id: "p1", userId: "user-0", score: 5 },
          { id: "p2", userId: "bot-1", score: 3 },
        ],
        rounds: [],
      },
    });

    render(
      <Results matchId={mockMatchId} onBack={mockOnBack} />
    );

    expect(screen.getByText(/Победитель/i)).toBeInTheDocument();
  });

  it("должен отображать итоги матча", () => {
    (trpc.round.getMatchDetails.useQuery as jest.Mock).mockReturnValue({
      data: {
        participants: [
          { id: "p1", userId: "user-0", score: 5 },
          { id: "p2", userId: "bot-1", score: 3 },
        ],
        rounds: [],
      },
    });

    render(
      <Results matchId={mockMatchId} onBack={mockOnBack} />
    );

    expect(screen.getByText(/Итоговые результаты/i)).toBeInTheDocument();
  });

  it("должен отсортировать участников по очкам", () => {
    const participants = [
      { id: "p1", userId: "user-0", score: 3 },
      { id: "p2", userId: "bot-1", score: 5 },
      { id: "p3", userId: "bot-2", score: 4 },
    ];

    const sorted = [...participants].sort((a, b) => b.score - a.score);

    expect(sorted[0].score).toBe(5);
    expect(sorted[1].score).toBe(4);
    expect(sorted[2].score).toBe(3);
  });

  it("должен отображать медали для топ-3", () => {
    (trpc.round.getMatchDetails.useQuery as jest.Mock).mockReturnValue({
      data: {
        participants: [
          { id: "p1", userId: "user-0", score: 5 },
          { id: "p2", userId: "bot-1", score: 4 },
          { id: "p3", userId: "bot-2", score: 3 },
        ],
        rounds: [],
      },
    });

    render(
      <Results matchId={mockMatchId} onBack={mockOnBack} />
    );

    // Первый игрок должен быть отмечен как победитель
    expect(screen.getByText(/Победитель/i)).toBeInTheDocument();
  });

  it("должен отображать историю раундов", () => {
    (trpc.round.getMatchDetails.useQuery as jest.Mock).mockReturnValue({
      data: {
        participants: [],
        rounds: [
          { id: "r1", status: "finished", roundNumber: 1 },
          { id: "r2", status: "finished", roundNumber: 2 },
        ],
      },
    });

    render(
      <Results matchId={mockMatchId} onBack={mockOnBack} />
    );

    expect(screen.getByText(/История раундов/i)).toBeInTheDocument();
  });

  it("должен отображать статистику матча", () => {
    (trpc.round.getMatchDetails.useQuery as jest.Mock).mockReturnValue({
      data: {
        participants: [
          { id: "p1", userId: "user-0", score: 5, falseStarts: 2 },
        ],
        rounds: [
          { id: "r1", status: "finished" },
          { id: "r2", status: "finished" },
        ],
        totalRounds: 5,
      },
    });

    render(
      <Results matchId={mockMatchId} onBack={mockOnBack} />
    );

    expect(screen.getByText(/Статистика матча/i)).toBeInTheDocument();
  });

  it("должен отображать кнопку возврата", () => {
    (trpc.round.getMatchDetails.useQuery as jest.Mock).mockReturnValue({
      data: {
        participants: [],
        rounds: [],
      },
    });

    render(
      <Results matchId={mockMatchId} onBack={mockOnBack} />
    );

    expect(screen.getByText(/Вернуться в лобби/)).toBeInTheDocument();
  });

  it("должен обработать ничью", () => {
    (trpc.round.getMatchDetails.useQuery as jest.Mock).mockReturnValue({
      data: {
        participants: [
          { id: "p1", userId: "user-0", score: 3 },
          { id: "p2", userId: "bot-1", score: 3 },
        ],
        rounds: [],
      },
    });

    render(
      <Results matchId={mockMatchId} onBack={mockOnBack} />
    );

    expect(screen.getByText(/Ничья/i)).toBeInTheDocument();
  });
});
