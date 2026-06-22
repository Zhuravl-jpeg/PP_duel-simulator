import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import Lobby from "../../../../src/components/lobby/Lobby";
import { trpc } from "../../../../src/lib/trpc";

// Моки для trpc
jest.mock("../../../../src/lib/trpc", () => ({
  trpc: {
    match: {
      listMatches: {
        useQuery: jest.fn(),
      },
    },
    round: {
      createMatch: {
        useMutation: jest.fn(),
      },
    },
  },
}));

describe("Lobby Component", () => {
  const mockOnCreateMatch = jest.fn();
  const mockOnJoinMatch = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("должен отображать заголовок", () => {
    (trpc.match.listMatches.useQuery as jest.Mock).mockReturnValue({
      data: { matches: [] },
      isLoading: false,
    });

    render(
      <Lobby
        onCreateMatch={mockOnCreateMatch}
        onJoinMatch={mockOnJoinMatch}
        isLoading={false}
      />
    );

    expect(screen.getByText(/Готовы проверить свою реакцию/i)).toBeInTheDocument();
  });

  it("должен отображать кнопку создания матча", () => {
    (trpc.match.listMatches.useQuery as jest.Mock).mockReturnValue({
      data: { matches: [] },
      isLoading: false,
    });

    render(
      <Lobby
        onCreateMatch={mockOnCreateMatch}
        onJoinMatch={mockOnJoinMatch}
        isLoading={false}
      />
    );

    expect(screen.getByText(/Создать матч/)).toBeInTheDocument();
  });

  it("должен отображать поле ввода для присоединения", () => {
    (trpc.match.listMatches.useQuery as jest.Mock).mockReturnValue({
      data: { matches: [] },
      isLoading: false,
    });

    render(
      <Lobby
        onCreateMatch={mockOnCreateMatch}
        onJoinMatch={mockOnJoinMatch}
        isLoading={false}
      />
    );

    expect(screen.getByPlaceholderText(/Введите ID матча/i)).toBeInTheDocument();
  });

  it("должен вызвать onCreateMatch при клике на кнопку", async () => {
    (trpc.match.listMatches.useQuery as jest.Mock).mockReturnValue({
      data: { matches: [] },
      isLoading: false,
      refetch: jest.fn(),
    });

    (trpc.round.createMatch.useMutation as jest.Mock).mockReturnValue({
      mutateAsync: jest.fn().mockResolvedValue({ id: "match-123" }),
      isPending: false,
    });

    render(
      <Lobby
        onCreateMatch={mockOnCreateMatch}
        onJoinMatch={mockOnJoinMatch}
        isLoading={false}
      />
    );

    fireEvent.click(screen.getByText(/Создать матч/));
    
    // Проверяем, что функция вызвана
    expect(mockOnCreateMatch).toHaveBeenCalled();
  });

  it("должен отображать список матчей, если они есть", () => {
    (trpc.match.listMatches.useQuery as jest.Mock).mockReturnValue({
      data: {
        matches: [
          { id: "match-1", status: "waiting", totalRounds: 5 },
          { id: "match-2", status: "active", totalRounds: 5 },
        ],
      },
      isLoading: false,
    });

    render(
      <Lobby
        onCreateMatch={mockOnCreateMatch}
        onJoinMatch={mockOnJoinMatch}
        isLoading={false}
      />
    );

    // Проверяем, что отображаются матчи
    expect(screen.getByText(/Ожидающие матчи/i)).toBeInTheDocument();
  });

  it("должен отображать instruction 'Как играть?'", () => {
    (trpc.match.listMatches.useQuery as jest.Mock).mockReturnValue({
      data: { matches: [] },
      isLoading: false,
    });

    render(
      <Lobby
        onCreateMatch={mockOnCreateMatch}
        onJoinMatch={mockOnJoinMatch}
        isLoading={false}
      />
    );

    expect(screen.getByText(/Как играть\?/i)).toBeInTheDocument();
  });

  it("должен отображать 3 шага инструкции", () => {
    (trpc.match.listMatches.useQuery as jest.Mock).mockReturnValue({
      data: { matches: [] },
      isLoading: false,
    });

    render(
      <Lobby
        onCreateMatch={mockOnCreateMatch}
        onJoinMatch={mockOnJoinMatch}
        isLoading={false}
      />
    );

    expect(screen.getByText(/Дождитесь сигнала/i)).toBeInTheDocument();
    expect(screen.getByText(/Не торопитесь раньше/i)).toBeInTheDocument();
    expect(screen.getByText(/Побеждайте/i)).toBeInTheDocument();
  });

  it("должен блокировать кнопку при загрузке", () => {
    (trpc.match.listMatches.useQuery as jest.Mock).mockReturnValue({
      data: { matches: [] },
      isLoading: false,
    });

    render(
      <Lobby
        onCreateMatch={mockOnCreateMatch}
        onJoinMatch={mockOnJoinMatch}
        isLoading={true}
      />
    );

    const button = screen.getByText(/Создать матч/);
    expect(button).toBeDisabled();
  });
});
