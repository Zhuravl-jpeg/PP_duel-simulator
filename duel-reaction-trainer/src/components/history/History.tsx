"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";

interface HistoryProps {
  userId: string;
}

export default function History({ userId }: HistoryProps) {
  const [page, setPage] = useState(0);
  const limit = 10;

  const { data, isLoading, refetch } = trpc.match.getMatchHistory.useQuery(
    { userId, limit, offset: page * limit },
    { refetchInterval: 5000 }
  );

  const totalPages = Math.ceil((data?.total || 0) / limit);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">История матчей</h2>
          <p className="text-gray-400 mt-1">
            Все ваши дуэли и результаты
          </p>
        </div>
        <button
          onClick={() => refetch()}
          className="btn-secondary text-sm"
        >
          🔄 Обновить
        </button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card text-center">
          <p className="text-3xl font-bold text-blue-400">{data?.total || 0}</p>
          <p className="text-gray-400 text-sm mt-1">Всего матчей</p>
        </div>
        <div className="card text-center">
          <p className="text-3xl font-bold text-green-400">
            {data?.matches?.filter((m: any) => m.status === "finished").length || 0}
          </p>
          <p className="text-gray-400 text-sm mt-1">Завершено</p>
        </div>
        <div className="card text-center">
          <p className="text-3xl font-bold text-yellow-400">
            {data?.matches?.filter((m: any) => m.status === "active").length || 0}
          </p>
          <p className="text-gray-400 text-sm mt-1">Идёт игра</p>
        </div>
        <div className="card text-center">
          <p className="text-3xl font-bold text-purple-400">
            {data?.matches?.filter((m: any) => m.status === "waiting").length || 0}
          </p>
          <p className="text-gray-400 text-sm mt-1">Ожидание</p>
        </div>
      </div>

      {/* Matches List */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="card animate-pulse">
              <div className="h-6 bg-gray-700 rounded w-1/3 mb-3"></div>
              <div className="h-4 bg-gray-700 rounded w-2/3"></div>
            </div>
          ))}
        </div>
      ) : data?.matches?.length === 0 ? (
        <div className="card text-center py-16">
          <span className="text-6xl mb-4 block">📭</span>
          <h3 className="text-xl font-semibold text-white mb-2">
            История пуста
          </h3>
          <p className="text-gray-400">
            Вы ещё не участвовали в матчах. Создайте первый!
          </p>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {data?.matches?.map((match: any, index: number) => (
              <div
                key={match.id}
                className="card hover:border-blue-500/30 transition-colors cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`w-3 h-3 rounded-full ${
                      match.status === "finished" ? "bg-green-500" :
                      match.status === "active" ? "bg-blue-500 animate-pulse" :
                      "bg-yellow-500"
                    }`} />
                    <div>
                      <p className="text-white font-medium">
                        Матч #{match.id.slice(0, 8)}
                      </p>
                      <p className="text-gray-400 text-sm">
                        {new Date(match.createdAt).toLocaleString()} • 
                        Раундов: {match.totalRounds}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`badge ${
                      match.status === "finished" ? "badge-success" :
                      match.status === "active" ? "badge-info" :
                      "badge-warning"
                    }`}>
                      {match.status === "finished" ? "Завершён" :
                       match.status === "active" ? "Идёт" : "Ожидание"}
                    </span>
                    <button className="text-blue-400 hover:text-blue-300 text-sm">
                      Подробнее →
                    </button>
                  </div>
                </div>
              </div>
            ))}
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
        </>
      )}

      {/* Tips */}
      <div className="card bg-blue-900/20 border-blue-800">
        <div className="flex items-start gap-3">
          <span className="text-2xl">💡</span>
          <div>
            <h4 className="text-white font-medium mb-2">Советы по улучшению</h4>
            <ul className="text-gray-400 text-sm space-y-1 list-disc list-inside">
              <li>Среднее время реакции: 250-350 мс</li>
              <li>Отличное время реакции: менее 200 мс</li>
              <li>Избегайте фальстартов — они штрафуют баллы</li>
              <li>Регулярные тренировки улучшают результат</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
