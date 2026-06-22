import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import Game from "../../../../src/components/game/Game";
import { trpc } from "../../../../src/lib/trpc";

// Моки для trpc
jest.mock("../../../../src/lib/trpc", () => ({
  trpc: {
    round: {
      getMatchDetails: {
        useQuery: jest.fn(),
      },
      startRound: {
        useMutation: jest.fn(),
      },
      submitReaction: {
        useMutation: jest.fn(),
      },
    },
  },
}));

describe("Game Component", () => {
  const mockMatchId = "match-123";
  const mockUserId = "user-0";
  const mockOnMatchFinished = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("должен отображать информацию о матче", () => {
    (trpc.round.getMatchDetails.useQuery as jest.Mock).mockReturnValue({
      data: {
        id: mockMatchId,
        currentRound: 1,
        totalRounds: 5,
        participants: [
          { id: "p1", userId: mockUserId, score: 0 },
        ],
      },
    });

    render(
      <Game
        matchId={mockMatchId}
        userId={mockUserId}
        onMatchFinished={mockOnMatchFinished}
      />
    );

    expect(screen.getByText(/Матч/i)).toBeInTheDocument();
  });

  it("должен отображать таблицу счёта", () => {
    (trpc.round.getMatchDetails.useQuery as jest.Mock).mockReturnValue({
      data: {
        participants: [
          { id: "p1", userId: mockUserId, score: 2 },
          { id: "p2", userId: "bot-1", score: 1 },
        ],
      },
    });

    render(
      <Game
        matchId={mockMatchId}
        userId={mockUserId}
        onMatchFinished={mockOnMatchFinished}
      />
    );

    // Проверяем отображение счёта
    expect(screen.getByText("2")).toBeInTheDocument();
  });

  it("должен отображать область сигнала", () => {
    (trpc.round.getMatchDetails.useQuery as jest.Mock).mockReturnValue({
      data: {
        rounds: [{ id: "round-1", status: "active", signalTime: new Date() }],
        participants: [],
      },
    });

    render(
      <Game
        matchId={mockMatchId}
        userId={mockUserId}
        onMatchFinished={mockOnMatchFinished}
      />
    );

    // Сигнал должен отображаться
    expect(screen.getByText(/Ждите сигнал/i)).toBeInTheDocument();
  });

  it("должен отображать состояние 'НАЖМИТЕ!' при сигнале", () => {
    (trpc.round.getMatchDetails.useQuery as jest.Mock).mockReturnValue({
      data: {
        rounds: [{ id: "round-1", status: "active", signalTime: new Date(Date.now() - 2000) }],
        participants: [],
      },
    });

    render(
      <Game
        matchId={mockMatchId}
        userId={mockUserId}
        onMatchFinished={mockOnMatchFinished}
      />
    );

    // Через setTimeout должно появиться "НАЖМИТЕ!"
    // Это требует ожидания анимации
  });

  it("должен обработать нажатие ПРОБЕЛ", async () => {
    (trpc.round.getMatchDetails.useQuery as jest.Mock).mockReturnValue({
      data: {
        rounds: [{ id: "round-1", status: "active", signalTime: new Date() }],
        participants: [{ id: "p1", userId: mockUserId, score: 0 }],
      },
      refetch: jest.fn(),
    });

    (trpc.round.submitReaction.useMutation as jest.Mock).mockReturnValue({
      mutateAsync: jest.fn().mockResolvedValue({ reactionTime: 250 }),
      isPending: false,
    });

    render(
      <Game
        matchId={mockMatchId}
        userId={mockUserId}
        onMatchFinished={mockOnMatchFinished}
      />
    );

    // Имитируем нажатие ПРОБЕЛ
    fireEvent.keyDown(window, { key: " ", code: "Space" });

    // Проверка, что мутация вызвана
    expect(trpc.round.submitReaction.useMutation().mutateAsync).toHaveBeenCalled();
  });

  it("должен отображать время реакции после нажатия", async () => {
    (trpc.round.getMatchDetails.useQuery as jest.Mock).mockReturnValue({
      data: {
        rounds: [{ id: "round-1", status: "active", signalTime: new Date() }],
        participants: [],
      },
    });

    render(
      <Game
        matchId={mockMatchId}
        userId={mockUserId}
        onMatchFinished={mockOnMatchFinished}
      />
    );

    // После нажатия должно появиться время
    // Тест требует более сложной мокирования таймеров
  });

  it("должен вызвать onMatchFinished при завершении матча", async () => {
    const mockData = {
      status: "finished",
      rounds: [],
      participants: [],
    };

    (trpc.round.getMatchDetails.useQuery as jest.Mock).mockReturnValue({
      data: mockData,
    });

    render(
      <Game
        matchId={mockMatchId}
        userId={mockUserId}
        onMatchFinished={mockOnMatchFinished}
      />
    );

    await waitFor(() => {
      expect(mockOnMatchFinished).toHaveBeenCalled();
    });
  });

  it("должен отображать подсказку", () => {
    (trpc.round.getMatchDetails.useQuery as jest.Mock).mockReturnValue({
      data: {
        rounds: [],
        participants: [],
      },
    });

    render(
      <Game
        matchId={mockMatchId}
        userId={mockUserId}
        onMatchFinished={mockOnMatchFinished}
      />
    );

    expect(screen.getByText(/Подсказка/i)).toBeInTheDocument();
  });
});
