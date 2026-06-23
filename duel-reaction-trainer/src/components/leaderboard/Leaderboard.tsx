"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";

interface LeaderboardProps {
  userId?: string; // опционально — подсветить конкретного игрока
}

export default function Leaderboard({ userId }: LeaderboardProps) {
  const [page, setPage] = useState(0);
  const limit = 20;

  const { data, isLoading, refetch } = trpc.leaderboard.getLeaderboard.useQuery(
    { limit, offset: page * limit },
    { refetchInterval: 10000 }
  );

  // Запрос позиции конкретного игрока
  const playerRank = trpc.leaderboard.getPlayerRank.useQuery(
    { userId: userId! },
    { enabled: !!userId }
  );

  const totalPages = Math.ceil((data?.total || 0) / limit);

  // Подсчёт медалей для топ-3
  const getMedal = (rank: number) => {
    if (rank === 1) return "🥇";
    if (rank === 2) return "🥈";
    if (rank === 3) return "🥉";
    return null;
  };

  const getMedalBg = (rank: number) => {
    if (rank === 1) return "from-yellow-500 to-amber-600";
    if (rank === 2) return "from-gray-400 to-gray-500";
    if (rank === 3) return "from-orange-500 to-orange-600";
    return "from-gray-700 to-gray-800";
  };

  if (isLoading) {
    return (
      <div className="card text-center py-12">
        <div className="animate-pulse">
          <span className="text-4xl mb-4 block">🏆</span>
          <p className="text-gray-400">Загрузка таблицы лидеров...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-white">🏆 Таблица лидеров</h2>
          <p className="text-gray-400 mt-1">
            Лучший игроки по количеству набранных баллов
          </p>
        </div>
        <button
          onClick={() => refetch()}
          className="btn-secondary text-sm"
        >
          🔄 Обновить
        </button>
      </div>

      {/* Top 3 Podium */}
      {data?.leaderboard && data.leaderboard.length >= 3 && (
        <div className="grid grid-cols-3 gap-4 mt-8">
          {[1, 0, 2].map((podiumIndex) => {
            const player = data.leaderboard[podiumIndex];
            const rank = podiumIndex + 1;
            return (
              <div
                key={player.participantId}
                className={`relative p-6 rounded-xl bg-gradient-to-br ${getMedalBg(rank)} border border-white/10 text-center`}
              >
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <span className="text-4xl">{getMedal(rank)}</span>
                </div>
                <div className="mt-4">
                  <p className="text-white font-bold text-lg truncate">
                    {player.name}
                  </p>
                  <p className="text-white/80 text-3xl font-bold mt-2">
                    {player.totalScore}
                  </p>
                  <p className="text-white/60 text-sm">баллов</p>
                  <div className="mt-4 flex justify-center gap-2 text-xs text-white/70">
                    <span>{player.matchesPlayed} игр</span>
                    <span>•</span>
                    <span>{player.wins} побед</span>
                    <span>•</span>
                    <span>{player.winRate}% winrate</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card text-center">
          <p className="text-3xl font-bold text-blue-400">{data?.total || 0}</p>
          <p className="text-gray-400 text-sm mt-1">Участников</p>
        </div>
        <div className="card text-center">
          <p className="text-3xl font-bold text-green-400">
            {data?.leaderboard?.reduce((sum, p) => sum + p.matchesPlayed, 0) || 0}
          </p>
          <p className="text-gray-400 text-sm mt-1">Матчей сыграно</p>
        </div>
        <div className="card text-center">
          <p className="text-3xl font-bold text-yellow-400">
            {data?.leaderboard?.reduce((sum, p) => sum + p.wins, 0) || 0}
          </p>
          <p className="text-gray-400 text-sm mt-1">Побед</p>
        </div>
        <div className="card text-center">
          <p className="text-3xl font-bold text-purple-400">
            {(() => {
              const avgTimes = data?.leaderboard
                ?.filter(p => p.avgReactionTime !== null)
                .map(p => p.avgReactionTime!) || [];
              if (avgTimes.length === 0) return 0;
              return Math.round(
                avgTimes.reduce((sum, t) => sum + t!, 0) / avgTimes.length
              );
            })()} мс
          </p>
          <p className="text-gray-400 text-sm mt-1">Среднее время</p>
        </div>
      </div>

      {/* Player Highlight (если указан userId) */}
      {userId && playerRank.data?.found && playerRank.data.player && (
        <div className="card bg-blue-900/30 border-blue-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-xl">
                #{playerRank.data.player.rank}
              </div>
              <div>
                <p className="text-white font-bold text-lg">{playerRank.data.player.name}</p>
                <p className="text-gray-400 text-sm">Ваша позиция в таблице лидеров</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-blue-400">{playerRank.data.player.totalScore}</p>
              <p className="text-gray-400 text-sm">баллов</p>
            </div>
          </div>
        </div>
      )}

      {/* Full Leaderboard Table */}
      <div className="card">
        <h3 className="text-xl font-semibold text-white mb-6">
          Полный рейтинг
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-700">
                <th className="text-left py-3 px-4 text-gray-400 font-medium">#</th>
                <th className="text-left py-3 px-4 text-gray-400 font-medium">Игрок</th>
                <th className="text-center py-3 px-4 text-gray-400 font-medium">Очки</th>
                <th className="text-center py-3 px-4 text-gray-400 font-medium">Матчи</th>
                <th className="text-center py-3 px-4 text-gray-400 font-medium">Победы</th>
                <th className="text-center py-3 px-4 text-gray-400 font-medium">WinRate</th>
                <th className="text-center py-3 px-4 text-gray-400 font-medium">Ср. время</th>
                <th className="text-center py-3 px-4 text-gray-400 font-medium">Фальстарты</th>
              </tr>
            </thead>
            <tbody>
              {data?.leaderboard?.map((player) => {
                const isYou = userId && player.userId === userId;
                return (
                  <tr
                    key={player.participantId}
                    className={`border-b border-gray-800 hover:bg-gray-800/50 transition-colors ${
                      isYou ? "bg-blue-900/20 border-blue-800" : ""
                    }`}
                  >
                    <td className="py-3 px-4">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                        player.rank <= 3 
                          ? `bg-gradient-to-br ${getMedalBg(player.rank)} text-white`
                          : "bg-gray-800 text-gray-400"
                      }`}>
                        {player.rank}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <span className={`font-medium ${isYou ? "text-blue-400" : "text-white"}`}>
                          {player.name}
                        </span>
                        {isYou && (
                          <span className="text-xs bg-blue-600 text-white px-2 py-0.5 rounded">
                            Вы
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="text-white font-bold text-lg">{player.totalScore}</span>
                    </td>
                    <td className="py-3 px-4 text-center text-gray-400">
                      {player.matchesPlayed}
                    </td>
                    <td className="py-3 px-4 text-center text-green-400 font-medium">
                      {player.wins}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                        player.winRate >= 70 ? "bg-green-900/30 text-green-400" :
                        player.winRate >= 50 ? "bg-yellow-900/30 text-yellow-400" :
                        "bg-red-900/30 text-red-400"
                      }`}>
                        {player.winRate}%
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      {player.avgReactionTime !== null ? (
                        <span className={`font-medium ${
                          player.avgReactionTime < 250 ? "text-green-400" :
                          player.avgReactionTime < 350 ? "text-yellow-400" :
                          "text-red-400"
                        }`}>
                          {player.avgReactionTime} мс
                        </span>
                      ) : (
                        <span className="text-gray-600">—</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center text-gray-400">
                      {player.totalFalseStarts}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Empty State */}
        {data?.leaderboard?.length === 0 && (
          <div className="text-center py-16">
            <span className="text-6xl mb-4 block">📊</span>
            <h3 className="text-xl font-semibold text-white mb-2">
              Таблица пуста
            </h3>
            <p className="text-gray-400">
              Завершите первый матч, чтобы появиться в рейтинге
            </p>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-4">
          <button
            onClick={() => setPage(Math.max(0, page - 1))}
            disabled={page === 0}
            className="btn-secondary text-sm disabled:opacity-50"
          >
            ← Назад
          </button>
          <span className="text-gray-400">
            Страница {page + 1} из {totalPages}
          </span>
          <button
            onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
            disabled={page >= totalPages - 1}
            className="btn-secondary text-sm disabled:opacity-50"
          >
            Вперёд →
          </button>
        </div>
      )}

      {/* Tips */}
      <div className="card bg-gradient-to-r from-purple-900/20 to-blue-900/20 border-purple-800">
        <div className="flex items-start gap-3">
          <span className="text-2xl">💡</span>
          <div>
            <h4 className="text-white font-medium mb-2">Как улучшить рейтинг</h4>
            <ul className="text-gray-400 text-sm space-y-1 list-disc list-inside">
              <li>Победа в раунде = +1 балл</li>
              <li>Фальстарт = -1 балл и задержка в следующем раунде</li>
              <li>Среднее время реакции лучших игроков: менее 250 мс</li>
              <li>Регулярные тренировки помогают улучшить результат</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
