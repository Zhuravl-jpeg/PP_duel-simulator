"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";

interface LobbyProps {
  onCreateMatch: () => void;
  onJoinMatch: (matchId: string) => void;
  isLoading: boolean;
}

export default function Lobby({ onCreateMatch, onJoinMatch, isLoading }: LobbyProps) {
  const [joinMatchId, setJoinMatchId] = useState("");
  const matches = trpc.match.listMatches.useQuery({ limit: 10 });

  const handleJoin = async () => {
    if (!joinMatchId.trim()) return;
    // TODO: вызвать trpc.joinMatch
    onJoinMatch(joinMatchId);
  };

  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <div className="text-center space-y-4 py-12">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-blue-600/20 rounded-2xl mb-4">
          <span className="text-4xl">🎯</span>
        </div>
        <h2 className="text-4xl font-bold text-white">
          Готовы проверить свою реакцию?
        </h2>
        <p className="text-gray-400 max-w-2xl mx-auto text-lg">
          Создайте матч или присоединитесь к существующему. 
          Сразитесь с другими игроками в тесте на скорость реакции!
        </p>
      </div>

      {/* Action Cards */}
      <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
        {/* Create Match Card */}
        <div className="card hover:border-blue-500/50 transition-colors">
          <div className="flex items-start gap-4 mb-4">
            <div className="w-12 h-12 bg-blue-600/20 rounded-lg flex items-center justify-center flex-shrink-0">
              <span className="text-2xl">➕</span>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-white">Создать матч</h3>
              <p className="text-gray-400 text-sm mt-1">
                Запустите новый матч с 2-5 игроками
              </p>
            </div>
          </div>
          <button
            onClick={onCreateMatch}
            disabled={isLoading}
            className="btn-primary w-full"
          >
            {isLoading ? "Создание..." : "Создать матч"}
          </button>
        </div>

        {/* Join Match Card */}
        <div className="card hover:border-green-500/50 transition-colors">
          <div className="flex items-start gap-4 mb-4">
            <div className="w-12 h-12 bg-green-600/20 rounded-lg flex items-center justify-center flex-shrink-0">
              <span className="text-2xl">🚪</span>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-white">Присоединиться</h3>
              <p className="text-gray-400 text-sm mt-1">
                Введите ID матча для входа
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={joinMatchId}
              onChange={(e) => setJoinMatchId(e.target.value)}
              placeholder="Введите ID матча..."
              className="input flex-1"
              onKeyDown={(e) => e.key === "Enter" && handleJoin()}
            />
            <button
              onClick={handleJoin}
              disabled={isLoading || !joinMatchId.trim()}
              className="btn-primary whitespace-nowrap"
            >
              Войти
            </button>
          </div>
        </div>
      </div>

      {/* Active Matches List */}
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-semibold text-white">
            Ожидающие матчи
          </h3>
          <button
            onClick={() => matches.refetch()}
            className="text-blue-400 hover:text-blue-300 text-sm"
          >
            Обновить
          </button>
        </div>

        {matches.isLoading ? (
          <div className="card">
            <div className="animate-pulse space-y-3">
              <div className="h-4 bg-gray-700 rounded w-3/4"></div>
              <div className="h-4 bg-gray-700 rounded w-1/2"></div>
              <div className="h-4 bg-gray-700 rounded w-2/3"></div>
            </div>
          </div>
        ) : matches.data?.matches.length === 0 ? (
          <div className="card text-center py-12">
            <span className="text-4xl mb-4 block">🎮</span>
            <p className="text-gray-400">
              Нет активных матчей. Создайте первый!
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {matches.data?.matches.map((match: any) => (
              <div
                key={match.id}
                className="card hover:border-blue-500/30 transition-colors cursor-pointer"
                onClick={() => onJoinMatch(match.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`w-3 h-3 rounded-full ${
                      match.status === "waiting" ? "bg-green-500" :
                      match.status === "active" ? "bg-blue-500" :
                      "bg-gray-500"
                    }`} />
                    <div>
                      <p className="text-white font-medium">
                        Матч #{match.id.slice(0, 8)}
                      </p>
                      <p className="text-gray-400 text-sm">
                        Раундов: {match.totalRounds} • 
                        Статус: {match.status === "waiting" ? "Ожидание" : 
                                match.status === "active" ? "Идёт игра" : "Завершён"}
                      </p>
                    </div>
                  </div>
                  <button className="btn-secondary text-sm">
                    Присоединиться
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* How to Play */}
      <div className="max-w-4xl mx-auto mt-12">
        <h3 className="text-xl font-semibold text-white mb-6 text-center">
          Как играть?
        </h3>
        <div className="grid md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="w-16 h-16 bg-blue-600/20 rounded-full flex items-center justify-center mx-auto mb-3">
              <span className="text-2xl font-bold text-blue-400">1</span>
            </div>
            <h4 className="text-white font-medium mb-2">Дождитесь сигнала</h4>
            <p className="text-gray-400 text-sm">
              Когда экран станет зелёным, нажмите клавишу как можно быстрее
            </p>
          </div>
          <div className="text-center">
            <div className="w-16 h-16 bg-yellow-600/20 rounded-full flex items-center justify-center mx-auto mb-3">
              <span className="text-2xl font-bold text-yellow-400">2</span>
            </div>
            <h4 className="text-white font-medium mb-2">Не торопитесь раньше</h4>
            <p className="text-gray-400 text-sm">
              Фальстарт (нажатие до сигнала) приведёт к штрафу в -1 балл
            </p>
          </div>
          <div className="text-center">
            <div className="w-16 h-16 bg-green-600/20 rounded-full flex items-center justify-center mx-auto mb-3">
              <span className="text-2xl font-bold text-green-400">3</span>
            </div>
            <h4 className="text-white font-medium mb-2">Побеждайте</h4>
            <p className="text-gray-400 text-sm">
              Самый быстрый игрок получает +1 балл. Победитель серии набирает больше всего баллов
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
